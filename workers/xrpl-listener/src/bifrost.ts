// =============================================================================
// Bifrost LLM Gateway (Portkey)
// =============================================================================
// Response caching, automatic fallbacks, rate limiting, cost tracking.
// If gateway is unavailable, caller falls back to direct API call.
// =============================================================================

import pino from 'pino';

const logger = pino({ name: 'bifrost-gateway' });

export interface BifrostConfig {
  enabled: boolean;
  apiKey: string;
  virtualKey: string;
  cacheEnabled: boolean;
  retryCount: number;
  timeout: number;
}

function getConfig(): BifrostConfig {
  return {
    enabled: process.env['BIFROST_ENABLED'] === 'true',
    apiKey: process.env['PORTKEY_API_KEY'] || '',
    virtualKey: process.env['PORTKEY_VIRTUAL_KEY'] || '',
    cacheEnabled: process.env['BIFROST_CACHE_ENABLED'] !== 'false',
    retryCount: 2,
    timeout: 20000,
  };
}

interface PortkeyGateway {
  config: BifrostConfig;
  baseUrl: string;
  headers: Record<string, string>;
}

let portkeyInstance: PortkeyGateway | null = null;

function createPortkey(): PortkeyGateway {
  const config = getConfig();
  return {
    config,
    baseUrl: 'https://api.portkey.ai/v1',
    headers: {
      'x-portkey-api-key': config.apiKey,
      'x-portkey-virtual-key': config.virtualKey,
      'x-portkey-cache': config.cacheEnabled ? 'simple' : 'none',
      'x-portkey-retry-count': config.retryCount.toString(),
      'Content-Type': 'application/json',
    },
  };
}

export function getBifrost(): PortkeyGateway | null {
  const config = getConfig();
  if (!config.enabled || !config.apiKey) {
    return null;
  }
  if (!portkeyInstance) {
    portkeyInstance = createPortkey();
    logger.info('[Bifrost] Gateway initialized');
  }
  return portkeyInstance;
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
 * Route an LLM completion through the Bifrost gateway.
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

    const response = await fetch(`${gateway.baseUrl}/chat/completions`, {
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

    const cached = response.headers.get('x-portkey-cache-status') === 'HIT';

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
