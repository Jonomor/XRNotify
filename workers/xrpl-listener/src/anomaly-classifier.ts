// =============================================================================
// AI Anomaly Classifier
// =============================================================================
// Sampled transaction classification using Vercel AI SDK + Anthropic.
// Wrapped in E2B sandbox for isolation. Fire-and-forget.
// =============================================================================

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { traceGeneration } from './langfuse';
import { executeInSandbox } from './sandbox';
import { randomUUID } from 'node:crypto';
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
  if (!process.env['ANTHROPIC_API_KEY']) {
    return null;
  }

  const traceId = randomUUID();
  const startTime = new Date();

  try {
    const prompt = CLASSIFICATION_PROMPT
      .replace('{eventType}', ctx.eventType)
      .replace('{accounts}', ctx.accounts.join(', '))
      .replace('{ledgerIndex}', ctx.ledgerIndex.toString())
      .replace('{payload}', JSON.stringify(ctx.payload, null, 2).slice(0, 2000));

    // Execute classification in E2B sandbox (falls back to local if unavailable)
    const sandboxResult = await executeInSandbox(
      'anomaly_classification',
      async () => {
        const result = await generateText({
          model: anthropic('claude-sonnet-4-20250514'),
          prompt,
          maxTokens: 300,
          temperature: 0,
          abortSignal: AbortSignal.timeout(15000),
        });
        return result;
      },
    );

    if (!sandboxResult.success || !sandboxResult.data) {
      logger.warn({ eventId: ctx.eventId, error: sandboxResult.error }, 'Sandboxed classification failed');
      return null;
    }

    const result = sandboxResult.data;
    const endTime = new Date();

    let classification: ClassificationResult;
    try {
      const cleaned = result.text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      classification = JSON.parse(cleaned) as ClassificationResult;
    } catch {
      logger.warn({ text: result.text }, 'Failed to parse classification response');
      return null;
    }

    // Trace the generation in Langfuse
    traceGeneration({
      traceId,
      name: 'anomaly_classification',
      model: 'claude-sonnet-4-20250514',
      input: prompt,
      output: result.text,
      usage: {
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        totalTokens: result.usage?.totalTokens,
      },
      metadata: {
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        isAnomalous: classification.isAnomalous,
        category: classification.category,
        confidence: classification.confidence,
        sandboxId: sandboxResult.sandboxId,
        sandboxed: sandboxResult.sandboxId !== null,
      },
      startTime,
      endTime,
    });

    logger.info({
      eventId: ctx.eventId,
      isAnomalous: classification.isAnomalous,
      category: classification.category,
      confidence: classification.confidence,
      sandboxed: sandboxResult.sandboxId !== null,
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
    return classificationCounter % 10 === 0;
  }

  classificationCounter++;
  return classificationCounter % 50 === 0;
}
