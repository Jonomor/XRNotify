// =============================================================================
// NemoClaw Execution Governance Wrapper
// =============================================================================
// NVIDIA OpenShell execution governance framework integration.
// Fire-and-forget pattern — NemoClaw must NEVER gate primary operations.
// If NemoClaw is unreachable, XRNotify continues normally.
// =============================================================================

import { createModuleLogger } from '@/lib/logger';

const logger = createModuleLogger('nemoclaw');

const NEMOCLAW_API_URL = 'https://api.nemoclaw.nvidia.com';
const NEMOCLAW_API_KEY = process.env['NEMOCLAW_API_KEY'];
const NEMOCLAW_ENABLED = process.env['NEMOCLAW_ENABLED'] === 'true';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GovernanceResult {
  governed: boolean;
  policyApplied: string;
  auditId: string;
}

export interface ExecutionLogParams {
  agentId: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  agentId: string;
  action: string;
  result: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface NemoClawConfig {
  apiKey: string;
  enabled: boolean;
}

// -----------------------------------------------------------------------------
// Safe defaults
// -----------------------------------------------------------------------------

const SAFE_GOVERNANCE_RESULT: GovernanceResult = {
  governed: false,
  policyApplied: '',
  auditId: '',
};

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export class NemoClawClient {
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor() {
    this.apiKey = NEMOCLAW_API_KEY ?? '';
    this.enabled = NEMOCLAW_ENABLED;

    if (this.enabled && !this.apiKey) {
      logger.warn('NEMOCLAW_ENABLED is true but NEMOCLAW_API_KEY is not set');
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${NEMOCLAW_API_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          data && typeof data === 'object' && 'message' in data
            ? String((data as { message: unknown }).message)
            : 'Unknown error';
        throw new Error(
          `NemoClaw ${method} ${path} failed: ${response.status} — ${message}`
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Apply a named security policy to an agent execution context.
   * Returns safe defaults on failure — never throws.
   */
  async governAgent(
    agentId: string,
    policyName: string
  ): Promise<GovernanceResult> {
    if (!this.enabled) {
      return SAFE_GOVERNANCE_RESULT;
    }

    try {
      return await this.request<GovernanceResult>(
        'POST',
        '/api/v1/governance/apply',
        { agentId, policyName }
      );
    } catch (err) {
      logger.error({ err, agentId, policyName }, 'Failed to apply governance policy');
      return SAFE_GOVERNANCE_RESULT;
    }
  }

  /**
   * Write an execution audit record. Fire-and-forget in calling code.
   * Logs error on failure — never throws.
   */
  async logExecution(params: ExecutionLogParams): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.request('POST', '/api/v1/audit/log', params);
    } catch (err) {
      logger.error({ err, agentId: params.agentId, action: params.action }, 'Failed to log execution');
    }
  }

  /**
   * Check if a named policy is valid and active.
   * Returns false on any error.
   */
  async validatePolicy(policyName: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const result = await this.request<{ valid: boolean }>(
        'GET',
        `/api/v1/governance/policies/${encodeURIComponent(policyName)}/validate`
      );
      return result.valid;
    } catch (err) {
      logger.error({ err, policyName }, 'Failed to validate policy');
      return false;
    }
  }

  /**
   * Retrieve execution audit entries for an agent.
   * Returns empty array on error.
   */
  async getAuditTrail(
    agentId: string,
    since?: Date
  ): Promise<AuditEntry[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (since) {
        params.set('since', since.toISOString());
      }

      const qs = params.toString();
      const path = `/api/v1/audit/agent/${encodeURIComponent(agentId)}${qs ? `?${qs}` : ''}`;
      return await this.request<AuditEntry[]>('GET', path);
    } catch (err) {
      logger.error({ err, agentId }, 'Failed to retrieve audit trail');
      return [];
    }
  }
}

// -----------------------------------------------------------------------------
// Lazy Singleton
// -----------------------------------------------------------------------------

let _instance: NemoClawClient | null = null;

export function getNemoClaw(): NemoClawClient {
  if (!_instance) _instance = new NemoClawClient();
  return _instance;
}
