// =============================================================================
// NemoClaw Execution Governance Wrapper (Worker Copy)
// =============================================================================
// Fire-and-forget pattern. NemoClaw must NEVER gate primary operations.
// =============================================================================

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
          `NemoClaw ${method} ${path} failed: ${response.status} - ${message}`
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async governAgent(agentId: string, policyName: string): Promise<GovernanceResult> {
    if (!this.enabled) return SAFE_GOVERNANCE_RESULT;

    try {
      return await this.request<GovernanceResult>(
        'POST',
        '/api/v1/governance/apply',
        { agentId, policyName }
      );
    } catch {
      return SAFE_GOVERNANCE_RESULT;
    }
  }

  async logExecution(params: ExecutionLogParams): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.request('POST', '/api/v1/audit/log', params);
    } catch {
      // fire-and-forget: caller handles logging
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
