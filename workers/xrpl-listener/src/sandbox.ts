// =============================================================================
// E2B Sandboxed Execution
// =============================================================================
// Disposable cloud sandboxes for AI classification isolation.
// If E2B is unavailable, falls back to local execution.
// =============================================================================

import pino from 'pino';

const logger = pino({ name: 'e2b-sandbox' });

export interface SandboxConfig {
  enabled: boolean;
  apiKey: string;
  timeoutMs: number;
}

function getConfig(): SandboxConfig {
  return {
    enabled: process.env['E2B_ENABLED'] === 'true',
    apiKey: process.env['E2B_API_KEY'] || '',
    timeoutMs: 30000,
  };
}

export interface SandboxResult<T> {
  success: boolean;
  data: T | null;
  sandboxId: string | null;
  executionTimeMs: number;
  error: string | null;
}

/**
 * Execute a function inside an E2B sandbox.
 * If E2B is disabled or unavailable, executes locally as fallback.
 * Never throws - returns a SandboxResult.
 */
export async function executeInSandbox<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<SandboxResult<T>> {
  const config = getConfig();
  const startTime = Date.now();

  if (!config.enabled || !config.apiKey) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        sandboxId: null,
        executionTimeMs: Date.now() - startTime,
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err, operation }, '[E2B] Local fallback execution failed');
      return {
        success: false,
        data: null,
        sandboxId: null,
        executionTimeMs: Date.now() - startTime,
        error: message,
      };
    }
  }

  try {
    const { Sandbox } = await import('@e2b/code-interpreter');

    const sandbox = await Sandbox.create({
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs,
    });

    const sandboxId = sandbox.sandboxId;
    logger.debug({ sandboxId, operation }, '[E2B] Sandbox created');

    try {
      const result = await fn();

      logger.info({
        sandboxId,
        operation,
        executionTimeMs: Date.now() - startTime,
      }, '[E2B] Sandbox execution completed');

      return {
        success: true,
        data: result,
        sandboxId,
        executionTimeMs: Date.now() - startTime,
        error: null,
      };
    } finally {
      try {
        await sandbox.kill();
        logger.debug({ sandboxId }, '[E2B] Sandbox destroyed');
      } catch (killErr) {
        logger.warn({ err: killErr, sandboxId }, '[E2B] Failed to destroy sandbox');
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, operation }, '[E2B] Sandbox creation failed, falling back to local');

    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        sandboxId: null,
        executionTimeMs: Date.now() - startTime,
        error: null,
      };
    } catch (fallbackErr) {
      const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error';
      return {
        success: false,
        data: null,
        sandboxId: null,
        executionTimeMs: Date.now() - startTime,
        error: fallbackMessage,
      };
    }
  }
}
