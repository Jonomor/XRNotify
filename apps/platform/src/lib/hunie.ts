// =============================================================================
// H.U.N.I.E. Memory API Client
// =============================================================================
// Human Understanding Neuro Intelligent Experience
// Central nervous system for the Jonomor ecosystem.
// =============================================================================

const HUNIE_API_URL = process.env['HUNIE_API_URL'];
const HUNIE_API_KEY = process.env['HUNIE_API_KEY'];

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WriteMemoryParams {
  agentId: string;
  content: string;
  contentType: 'FACT' | 'EXPERIENCE' | 'OBSERVATION' | 'DECISION' | 'PREFERENCE';
  namespace: string;
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
        '[H.U.N.I.E.] HUNIE_API_URL or HUNIE_API_KEY not set — running without H.U.N.I.E. integration'
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
          `[H.U.N.I.E.] ${method} ${path} failed: ${response.status} — ${message}`
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
