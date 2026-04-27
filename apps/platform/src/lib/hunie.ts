// =============================================================================
// H.U.N.I.E. Memory API Client
// =============================================================================
// Human Understanding Neuro Intelligent Experience
// Central nervous system for the Jonomor ecosystem.
// =============================================================================

import { createModuleLogger } from './logger';

const HUNIE_API_URL = process.env['HUNIE_API_URL'];
const HUNIE_API_KEY = process.env['HUNIE_API_KEY'];

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WriteMemoryParams {
  agentId: string;
  content: {
    contentType: 'KNOWLEDGE_GRAPH' | 'CONVERSATIONAL_CONTEXT';
    text: string;
  };
  source: {
    type: 'DIRECT_OBSERVATION' | 'AGENT_INFERENCE' | 'USER_INPUT' | 'EXTERNAL_SYSTEM';
    reliabilityWeight: number;
  };
  namespace?: string;
  metadata?: Record<string, unknown>;
}

interface QueryMemoryParams {
  agentId: string;
  query: string;
  strategy: 'SEMANTIC' | 'STRUCTURED' | 'GRAPH_TRAVERSAL' | 'ENTITY';
  namespace?: string;
  limit?: number;
}

interface GetAgentNodesOptions {
  status?: string;
  contentType?: string;
  limit?: number;
  offset?: number;
}

interface CreateAgentParams {
  name: string;
  namespace: string;
  description?: string;
}

// ════════════════════════════════════════════════════════════════
// Phase 3 — NemoClaw + NemoTron HTTP types
// ════════════════════════════════════════════════════════════════

type NemoclawRuntimeMode = 'policy_only' | 'active';

interface NemoclawCheckPayload {
  agentId: string;
  operation: string;
  payload: unknown;
}

export interface NemoclawCheckResult {
  outcome: 'ALLOWED' | 'FLAGGED' | 'DENIED';
  mode: NemoclawRuntimeMode;
  reason: string | null;
  sessionId: string;
  diagnostic: {
    state: string;
    sandboxId?: string;
    opsAllowed?: number;
    opsBlocked?: number;
    egressAllowedCount?: number;
    latencyMs?: number;
    capturedAt?: string;
  } | null;
}

type NemotronTaskKind = 'similarity' | 'contradiction' | 'reliability';
type NemotronSimilarity = 'EXACT_DUPLICATE' | 'HIGH_OVERLAP' | 'RELATED' | 'UNRELATED';
type NemotronContradiction = 'CONTRADICTS' | 'CONSISTENT' | 'ORTHOGONAL';
type NemotronReliability = 'STRONG' | 'MODERATE' | 'WEAK';

interface NemotronClassifyPayload {
  agentId: string;
  a: string;
  b: string;
}

export interface NemotronClassifyResult<L> {
  label: L | null;
  diagnostic: {
    state: string;
    latencyMs?: number;
    model?: string;
    capturedAt?: string;
  } | null;
}

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export class HunieClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    if (!HUNIE_API_URL || !HUNIE_API_KEY) {
      if (process.env['NODE_ENV'] === 'production') {
        throw new Error(
          '[H.U.N.I.E.] HUNIE_API_URL and HUNIE_API_KEY are required in production'
        );
      }
      console.warn(
        '[H.U.N.I.E.] HUNIE_API_URL or HUNIE_API_KEY not set - running without H.U.N.I.E. integration'
      );
    }
    this.baseUrl = HUNIE_API_URL ?? '';
    this.apiKey = HUNIE_API_KEY ?? '';
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
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
          `[H.U.N.I.E.] ${method} ${path} failed: ${response.status} - ${message}`
        );
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async writeMemory(params: WriteMemoryParams): Promise<unknown> {
    return this.request('POST', '/api/v1/memory/write', params);
  }

  async queryMemory(params: QueryMemoryParams): Promise<unknown> {
    return this.request('POST', '/api/v1/memory/query', params);
  }

  async getAgentNodes(
    agentId: string,
    options?: GetAgentNodesOptions
  ): Promise<unknown> {
    const searchParams = new URLSearchParams();
    if (options?.status) searchParams.set('status', options.status);
    if (options?.contentType) searchParams.set('contentType', options.contentType);
    if (options?.limit !== undefined)
      searchParams.set('limit', String(options.limit));
    if (options?.offset !== undefined)
      searchParams.set('offset', String(options.offset));

    const qs = searchParams.toString();
    const path = `/api/v1/memory/agent/${agentId}/nodes${qs ? `?${qs}` : ''}`;
    return this.request('GET', path);
  }

  async getNode(nodeId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/memory/node/${nodeId}`);
  }

  async createAgent(params: CreateAgentParams): Promise<unknown> {
    return this.request('POST', '/api/v1/agents', params);
  }

  async listAgents(): Promise<unknown> {
    return this.request('GET', '/api/v1/agents');
  }

  async nemoclawCheck(payload: NemoclawCheckPayload): Promise<NemoclawCheckResult> {
    return (await this.request('POST', '/api/v1/nemoclaw/check', payload)) as NemoclawCheckResult;
  }

  async nemotronSimilarity(
    payload: NemotronClassifyPayload,
  ): Promise<NemotronClassifyResult<NemotronSimilarity>> {
    return (await this.request(
      'POST',
      '/api/v1/nemotron/similarity',
      payload,
    )) as NemotronClassifyResult<NemotronSimilarity>;
  }

  async nemotronContradiction(
    payload: NemotronClassifyPayload,
  ): Promise<NemotronClassifyResult<NemotronContradiction>> {
    return (await this.request(
      'POST',
      '/api/v1/nemotron/contradiction',
      payload,
    )) as NemotronClassifyResult<NemotronContradiction>;
  }

  async nemotronReliability(
    payload: { agentId: string; a: string },
  ): Promise<NemotronClassifyResult<NemotronReliability>> {
    return (await this.request('POST', '/api/v1/nemotron/reliability', {
      agentId: payload.agentId,
      a: payload.a,
      b: '',
    })) as NemotronClassifyResult<NemotronReliability>;
  }
}

// -----------------------------------------------------------------------------
// Lazy Singleton
// -----------------------------------------------------------------------------

let _instance: HunieClient | null = null;

export function getHunieClient(): HunieClient | null {
  if (!HUNIE_API_URL || !HUNIE_API_KEY) return null;
  if (!_instance) _instance = new HunieClient();
  return _instance;
}

// ════════════════════════════════════════════════════════════════
// Phase 3 — Safe wrappers (fire-and-forget; never throw)
// ════════════════════════════════════════════════════════════════

const _hunieLogger = createModuleLogger('hunie-phase3');

export async function safePolicyCheck(
  payload: NemoclawCheckPayload,
): Promise<NemoclawCheckResult | null> {
  const client = getHunieClient();
  if (!client) return null;
  try {
    const result = await client.nemoclawCheck(payload);
    _hunieLogger.info(
      {
        agentId: payload.agentId,
        outcome: result.outcome,
        mode: result.mode,
        sessionId: result.sessionId,
      },
      '[XRNotify] NVIDIA NemoClaw policy check',
    );
    return result;
  } catch (error) {
    _hunieLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        agentId: payload.agentId,
      },
      '[XRNotify] NVIDIA NemoClaw policy check failed',
    );
    return null;
  }
}

export async function safeClassifySimilarity(
  payload: NemotronClassifyPayload,
): Promise<NemotronClassifyResult<NemotronSimilarity> | null> {
  return _safeNemotron('similarity', payload, (c) => c.nemotronSimilarity(payload));
}

export async function safeClassifyContradiction(
  payload: NemotronClassifyPayload,
): Promise<NemotronClassifyResult<NemotronContradiction> | null> {
  return _safeNemotron('contradiction', payload, (c) => c.nemotronContradiction(payload));
}

export async function safeClassifyReliability(
  payload: { agentId: string; a: string },
): Promise<NemotronClassifyResult<NemotronReliability> | null> {
  return _safeNemotron(
    'reliability',
    { agentId: payload.agentId, a: payload.a, b: '' },
    (c) => c.nemotronReliability(payload),
  );
}

async function _safeNemotron<L>(
  task: NemotronTaskKind,
  payload: NemotronClassifyPayload,
  callFn: (c: HunieClient) => Promise<NemotronClassifyResult<L>>,
): Promise<NemotronClassifyResult<L> | null> {
  const client = getHunieClient();
  if (!client) return null;
  try {
    const result = await callFn(client);
    if (result.label) {
      _hunieLogger.info(
        { agentId: payload.agentId, task, label: result.label },
        '[XRNotify] NVIDIA NemoTron classified',
      );
    }
    return result;
  } catch (error) {
    _hunieLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        agentId: payload.agentId,
        task,
      },
      `[XRNotify] NVIDIA NemoTron ${task} failed`,
    );
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// Governance wrapper
// ════════════════════════════════════════════════════════════════

/**
 * Wraps a primary operation with NemoClaw governance.
 * Fires ONE policy check at the start, returns governance metadata
 * the route handler attaches to its response payload.
 *
 * Fire-and-forget. If HUNIE is unreachable or agentId is undefined,
 * returns null and the route handler proceeds with `powered_by: null`.
 */
export async function withNemoClawGovernance(args: {
  agentId: string | undefined;
  operation: string;
  payload: unknown;
}): Promise<NemoclawCheckResult | null> {
  if (!args.agentId) {
    _hunieLogger.warn(
      { operation: args.operation },
      '[XRNotify] NVIDIA NemoClaw governance skipped — agentId not configured',
    );
    return null;
  }
  return safePolicyCheck({
    agentId: args.agentId,
    operation: args.operation,
    payload: args.payload,
  });
}
