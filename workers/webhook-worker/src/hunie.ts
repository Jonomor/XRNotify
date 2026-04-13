// =============================================================================
// H.U.N.I.E. Memory API Client (Worker Copy)
// =============================================================================

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

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export class HunieClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
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
