// =============================================================================
// Langfuse Observability Client (Worker Copy)
// =============================================================================
// Fire-and-forget: if Langfuse is unreachable, skip silently.
// =============================================================================

import { Langfuse } from 'langfuse';

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
    } catch {
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
    lf.trace({
      name: params.name,
      input: params.input,
      output: params.output,
      metadata: params.metadata,
      tags: params.tags,
    });
  } catch {
    // fire-and-forget
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
  } catch {
    // fire-and-forget
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
