// =============================================================================
// Register XRNotify Agents in H.U.N.I.E.
// =============================================================================
// Run with: npx tsx scripts/register-hunie-agents.ts
// Requires HUNIE_API_URL and HUNIE_API_KEY in environment.
// =============================================================================

interface AgentDefinition {
  name: string;
  namespace: string;
  description: string;
}

interface AgentResponse {
  id: string;
  name: string;
}

const HUNIE_API_URL = process.env['HUNIE_API_URL'];
const HUNIE_API_KEY = process.env['HUNIE_API_KEY'];

if (!HUNIE_API_URL || !HUNIE_API_KEY) {
  console.error(
    'Error: HUNIE_API_URL and HUNIE_API_KEY must be set in environment.'
  );
  console.error('Example:');
  console.error(
    '  HUNIE_API_URL=https://hunie.railway.internal:3000 HUNIE_API_KEY=your-key npx tsx scripts/register-hunie-agents.ts'
  );
  process.exit(1);
}

const agents: AgentDefinition[] = [
  {
    name: 'wallet-monitor',
    namespace: 'xrnotify.wallet-monitor',
    description:
      'XRPL wallet monitoring agent — anomaly detection, alert history, wallet behavioral baselines.',
  },
  {
    name: 'network-agent',
    namespace: 'xrnotify.network-agent',
    description:
      'XRPL network state agent — fee levels, ledger close times, validator changes, amendment activations.',
  },
  {
    name: 'usage-agent',
    namespace: 'xrnotify.usage-agent',
    description:
      'Product usage tracking — webhook delivery rates, monitored wallet counts, alert volume, latency metrics.',
  },
];

async function registerAgent(agent: AgentDefinition): Promise<AgentResponse> {
  const response = await fetch(`${HUNIE_API_URL}/api/v1/agents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HUNIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(agent),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to register agent "${agent.name}": ${response.status} — ${text}`
    );
  }

  return (await response.json()) as AgentResponse;
}

async function main(): Promise<void> {
  console.log('Registering XRNotify agents in H.U.N.I.E...\n');

  const results: Array<{ name: string; envVar: string; id: string }> = [];

  for (const agent of agents) {
    try {
      const result = await registerAgent(agent);
      const envVar = `HUNIE_AGENT_${agent.name.toUpperCase().replace(/-/g, '_')}`;
      console.log(`  [OK] ${agent.name} → ${result.id}`);
      results.push({ name: agent.name, envVar, id: result.id });
    } catch (error) {
      console.error(
        `  [FAIL] ${agent.name}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (results.length > 0) {
    console.log('\n========================================');
    console.log('Add these to your .env.local and Railway dashboard:');
    console.log('========================================\n');
    for (const r of results) {
      console.log(`${r.envVar}=${r.id}`);
    }
    console.log('');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
