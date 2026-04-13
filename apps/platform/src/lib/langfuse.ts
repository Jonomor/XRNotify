// =============================================================================
// Langfuse Observability Client
// =============================================================================
// LLM observability - traces AI calls with latency, cost, model, I/O.
// Fire-and-forget: if Langfuse is unreachable, skip silently.
// =============================================================================

import { Langfuse } from 'langfuse';
import { createModuleLogger } from '@/lib/logger';

const logger = createModuleLogger('langfuse');

let langfuseInstance: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) {
    return null;
  }

  if (!langfuseInstance) {
    try {
      langfuseInstance = new Langfuse({
        secretKey: process.env['LANGFUSE_SECRET_KEY']!,
        publicKey: process.env['LANGFUSE_PUBLIC_KEY']!,
        baseUrl: process.env['LANGFUSE_BASE_URL'] || 'https://cloud.langfuse.com',
        flushAt: 10,
        flushInterval: 5000,
      });
      logger.info('Langfuse client initialized');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Langfuse');
      return null;
    }
  }

  return langfuseInstance;
}

export interface TraceParams {
  name: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export function traceOperation(params: TraceParams): void {
  try {
    const lf = getLangfuse();
    if (!lf) return;

    const trace = lf.trace({
      name: params.name,
      input: params.input,
      output: params.output,
      metadata: params.metadata,
      tags: params.tags,
    });

    logger.debug({ traceId: trace.id, name: params.name }, 'Trace created');
  } catch (err) {
    logger.error({ err }, 'Failed to create Langfuse trace');
  }
}

export interface GenerationParams {
  traceId: string;
  name: string;
  model: string;
  input: string | Record<string, unknown>;
  output: string | Record<string, unknown>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, unknown>;
  startTime?: Date;
  endTime?: Date;
}

export function traceGeneration(params: GenerationParams): void {
  try {
    const lf = getLangfuse();
    if (!lf) return;

    const trace = lf.trace({ id: params.traceId });
    trace.generation({
      name: params.name,
      model: params.model,
      input: params.input,
      output: params.output,
      usage: params.usage,
      metadata: params.metadata,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    logger.debug({ traceId: params.traceId, model: params.model }, 'Generation traced');
  } catch (err) {
    logger.error({ err }, 'Failed to trace generation');
  }
}

process.on('beforeExit', async () => {
  try {
    const lf = getLangfuse();
    if (lf) await lf.shutdownAsync();
  } catch {
    // Silent on exit
  }
});
