// =============================================================================
// AI Anomaly Classifier
// =============================================================================
// Sampled transaction classification routed through Bifrost (LiteLLM).
// Wrapped in E2B sandbox for isolation. Fire-and-forget.
// =============================================================================

import { classifyInSandbox } from './sandbox';
import { gatewayCompletion } from './bifrost';
import pino from 'pino';

const logger = pino({ name: 'anomaly-classifier' });

export interface TransactionContext {
  eventId: string;
  eventType: string;
  ledgerIndex: number;
  txHash: string;
  accounts: string[];
  payload: Record<string, unknown>;
}

export interface ClassificationResult {
  isAnomalous: boolean;
  confidence: number;
  category: 'normal' | 'high_value' | 'high_frequency' | 'unusual_pattern' | 'suspicious' | 'unknown';
  reasoning: string;
}

const CLASSIFICATION_PROMPT = `You are a blockchain transaction anomaly classifier for the XRP Ledger.

Analyze the following XRPL transaction and classify it:

Transaction Type: {eventType}
Accounts Involved: {accounts}
Ledger Index: {ledgerIndex}
Transaction Details: {payload}

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "isAnomalous": boolean,
  "confidence": number between 0 and 1,
  "category": one of "normal", "high_value", "high_frequency", "unusual_pattern", "suspicious",
  "reasoning": brief explanation (under 100 words)
}

Classification criteria:
- "normal": routine transaction, expected patterns
- "high_value": transaction amount exceeds typical thresholds
- "high_frequency": account showing unusual transaction velocity
- "unusual_pattern": transaction structure deviates from typical patterns for this type
- "suspicious": multiple red flags present

Be conservative. Most transactions are normal. Only flag genuine anomalies.`;

export async function classifyTransaction(
  ctx: TransactionContext
): Promise<ClassificationResult | null> {
  if (!process.env['LITELLM_MASTER_KEY'] && !process.env['ANTHROPIC_API_KEY']) {
    return null;
  }

  try {
    const prompt = CLASSIFICATION_PROMPT
      .replace('{eventType}', ctx.eventType)
      .replace('{accounts}', ctx.accounts.join(', '))
      .replace('{ledgerIndex}', ctx.ledgerIndex.toString())
      .replace('{payload}', JSON.stringify(ctx.payload, null, 2).slice(0, 2000));

    // Try Bifrost gateway first (caching + governance)
    const gatewayResult = await gatewayCompletion({
      model: 'nvidia/nemotron-3-nano-30b-a3b',
      prompt,
      maxTokens: 300,
      temperature: 0,
    });

    let resultText: string;
    let wasCached = false;
    let sandboxId: string | null = null;

    if (gatewayResult) {
      resultText = gatewayResult.text;
      wasCached = gatewayResult.cached;
    } else {
      // Gateway unavailable - try E2B sandboxed classification
      const sandboxResult = await classifyInSandbox({
        gatewayUrl: process.env['BIFROST_GATEWAY_URL'] || 'https://bifrost-gateway-production-e973.up.railway.app',
        masterKey: process.env['LITELLM_MASTER_KEY'] || '',
        model: 'nvidia/nemotron-3-nano-30b-a3b',
        prompt,
        maxTokens: 300,
        temperature: 0,
      });

      if (sandboxResult.success && sandboxResult.data) {
        // Sandbox returned validated classification directly
        sandboxId = sandboxResult.sandboxId;
        resultText = JSON.stringify(sandboxResult.data);
      } else {
        // Both gateway and sandbox failed
        logger.warn({ eventId: ctx.eventId, sandboxError: sandboxResult.error }, 'Both gateway and sandbox failed');
        return null;
      }
    }

    let classification: ClassificationResult;
    try {
      const cleaned = resultText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      classification = JSON.parse(cleaned) as ClassificationResult;
    } catch {
      logger.warn({ text: resultText }, 'Failed to parse classification response');
      return null;
    }

    logger.info({
      eventId: ctx.eventId,
      isAnomalous: classification.isAnomalous,
      category: classification.category,
      confidence: classification.confidence,
      gateway: gatewayResult !== null,
      cached: wasCached,
      sandboxed: sandboxId !== null,
    }, 'Transaction classified');

    return classification;

  } catch (err) {
    logger.error({ err, eventId: ctx.eventId }, 'Anomaly classification failed');
    return null;
  }
}

// Sampling: only classify a percentage of transactions to manage cost
let classificationCounter = 0;

export function shouldClassify(eventType: string): boolean {
  const alwaysClassify = [
    'payment.xrp',
    'payment.issued',
    'escrow.create',
    'escrow.finish',
  ];

  if (alwaysClassify.includes(eventType)) {
    classificationCounter++;
    return classificationCounter % 100 === 0;
  }

  classificationCounter++;
  return classificationCounter % 500 === 0;
}
