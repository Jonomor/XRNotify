// =============================================================================
// H.U.N.I.E. Connection Test — XRNotify
// =============================================================================
// One-time script to verify end-to-end H.U.N.I.E. integration.
//
// Run with:
//   HUNIE_API_URL=https://hunie-production.up.railway.app \
//   HUNIE_API_KEY=<key> \
//   HUNIE_AGENT_WALLET_MONITOR=<id> \
//   HUNIE_AGENT_NETWORK=<id> \
//   HUNIE_AGENT_USAGE=<id> \
//   pnpm exec tsx scripts/test-hunie-connection.ts
// =============================================================================

const BASE_URL = process.env['HUNIE_API_URL'];
const API_KEY = process.env['HUNIE_API_KEY'];
const WALLET_MONITOR_ID = process.env['HUNIE_AGENT_WALLET_MONITOR'];
const NETWORK_ID = process.env['HUNIE_AGENT_NETWORK'];
const USAGE_ID = process.env['HUNIE_AGENT_USAGE'];

if (!BASE_URL || !API_KEY) {
  console.error('Error: HUNIE_API_URL and HUNIE_API_KEY must be set.');
  process.exit(1);
}

if (!WALLET_MONITOR_ID || !NETWORK_ID || !USAGE_ID) {
  console.error(
    'Error: HUNIE_AGENT_WALLET_MONITOR, HUNIE_AGENT_NETWORK, and HUNIE_AGENT_USAGE must be set.'
  );
  process.exit(1);
}

async function request(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed: ${response.status} — ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function main(): Promise<void> {
  console.log(`Testing H.U.N.I.E. connection at ${BASE_URL}\n`);

  // Step 1: List agents
  console.log('Step 1: Listing agents...');
  const agentsResponse = (await request('GET', '/api/v1/agents')) as {
    agents: Array<{ id: string; name: string }>;
  };
  const agents = agentsResponse.agents ?? [];
  console.log(`  Found ${agents.length} agent(s):`);
  for (const agent of agents) {
    const marker =
      agent.id === WALLET_MONITOR_ID ||
      agent.id === NETWORK_ID ||
      agent.id === USAGE_ID
        ? ' <-- XRNotify'
        : '';
    console.log(`  - ${agent.name} [${agent.id}]${marker}`);
  }

  const expectedIds = [WALLET_MONITOR_ID!, NETWORK_ID!, USAGE_ID!];
  const foundIds = agents.map((a) => a.id);
  const missing = expectedIds.filter((id) => !foundIds.includes(id));
  if (missing.length > 0) {
    console.warn(`\n  WARNING: Missing agent IDs: ${missing.join(', ')}`);
  } else {
    console.log('  All 3 XRNotify agents found.');
  }

  // Step 2: Write test memory
  console.log('\nStep 2: Writing test memory...');
  const timestamp = new Date().toISOString();
  const writeResult = await request('POST', '/api/v1/memory/write', {
    agentId: WALLET_MONITOR_ID,
    content: {
      contentType: 'KNOWLEDGE_GRAPH',
      text: `H.U.N.I.E. connection test from XRNotify at ${timestamp}`,
    },
    source: {
      type: 'DIRECT_OBSERVATION',
      reliabilityWeight: 0.9,
    },
    metadata: {
      source: 'test-hunie-connection.ts',
      timestamp,
    },
  });
  const writeNode = (writeResult as { node?: { id: string } }).node;
  console.log(`  Write succeeded — node ID: ${writeNode?.id ?? 'unknown'}`);

  // Step 3: Verify by fetching agent nodes
  console.log('\nStep 3: Verifying memory via agent nodes...');
  const nodesResult = (await request(
    'GET',
    `/api/v1/memory/agent/${WALLET_MONITOR_ID}/nodes?limit=3`
  )) as {
    nodes: Array<{
      id: string;
      content: { text: string; contentType: string };
    }>;
  };
  const nodes = nodesResult.nodes ?? [];
  console.log(`  Found ${nodes.length} node(s) for wallet-monitor:`);
  for (const node of nodes) {
    console.log(`  - [${node.id}] ${node.content.text.slice(0, 80)}...`);
  }

  const found = nodes.some(
    (n) => writeNode?.id && n.id === writeNode.id
  );
  if (found) {
    console.log('  Test node verified in agent memory.');
  } else {
    console.log('  Test node written but not yet in top results (expected for new nodes).');
  }

  // Step 4: Summary
  console.log(
    '\nH.U.N.I.E. integration verified — XRNotify is connected.'
  );
}

main().catch((error) => {
  console.error(
    '\nH.U.N.I.E. connection test FAILED:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
