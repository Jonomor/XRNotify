// =============================================================================
// Bifrost LLM Gateway (Self-hosted LiteLLM)
// =============================================================================
// OpenAI-compatible gateway with caching, fallbacks, and cost tracking.
// If gateway is unavailable, caller falls back to direct API call.
// =============================================================================

import pino from 'pino';

const logger = pino({ name: 'bifrost-gateway' });

export interface BifrostConfig {
  enabled: boolean;
  gatewayUrl: string;
  masterKey: string;
  cacheEnabled: boolean;
  timeout: number;
}

function getConfig(): BifrostConfig {
  return {
    enabled: process.env['BIFROST_ENABLED'] === 'true',
    gatewayUrl: process.env['BIFROST_GATEWAY_URL'] || 'https://bifrost-gateway-production-e973.up.railway.app',
    masterKey: process.env['LITELLM_MASTER_KEY'] || '',
    cacheEnabled: process.env['BIFROST_CACHE_ENABLED'] !== 'false',
    timeout: 20000,
  };
}

interface BifrostGateway {
  config: BifrostConfig;
  headers: Record<string, string>;
}

let gatewayInstance: BifrostGateway | null = null;

function createGateway(): BifrostGateway {
  const config = getConfig();
  return {
    config,
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
      'Content-Type': 'application/json',
    },
  };
}

export function getBifrost(): BifrostGateway | null {
  const config = getConfig();
  if (!config.enabled || !config.masterKey) {
    return null;
  }
  if (!gatewayInstance) {
    gatewayInstance = createGateway();
    logger.info({ url: config.gatewayUrl }, '[Bifrost] LiteLLM gateway initialized');
  }
  return gatewayInstance;
}

export interface GatewayCompletionParams {
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export interface GatewayCompletionResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached: boolean;
  gateway: true;
}

/**
 * Route an LLM completion through the Bifrost LiteLLM gateway.
 * Returns null if gateway is not configured - caller should
 * fall back to direct API call.
 */
export async function gatewayCompletion(
  params: GatewayCompletionParams
): Promise<GatewayCompletionResult | null> {
  const gateway = getBifrost();
  if (!gateway) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), gateway.config.timeout);

    const response = await fetch(`${gateway.config.gatewayUrl}/chat/completions`, {
      method: 'POST',
      headers: gateway.headers,
      body: JSON.stringify({
        model: params.model,
        messages: [{ role: 'user', content: params.prompt }],
        max_tokens: params.maxTokens,
        temperature: params.temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn({ status: response.status }, '[Bifrost] Gateway request failed');
      return null;
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const cached =
      response.headers.get('x-litellm-cache-hit') === 'True' ||
      response.headers.get('x-cache') === 'HIT';

    if (cached) {
      logger.info('[Bifrost] Cache HIT - zero cost for this classification');
    }

    return {
      text: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      cached,
      gateway: true,
    };
  } catch (err) {
    logger.error({ err }, '[Bifrost] Gateway completion failed');
    return null;
  }
}
