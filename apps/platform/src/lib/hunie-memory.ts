// =============================================================================
// XRNotify - H.U.N.I.E. Memory Functions
// =============================================================================
// Domain-specific memory write/read helpers for XRNotify agents.
// Every function is fire-and-forget safe: never throws, logs errors only.
// =============================================================================

import { getHunieClient } from './hunie';

// -----------------------------------------------------------------------------
// Agent IDs from environment
// -----------------------------------------------------------------------------

const WALLET_MONITOR_AGENT =
  process.env['HUNIE_AGENT_WALLET_MONITOR'] ?? '';
const NETWORK_AGENT = process.env['HUNIE_AGENT_NETWORK'] ?? '';
const USAGE_AGENT = process.env['HUNIE_AGENT_USAGE'] ?? '';

// -----------------------------------------------------------------------------
// Write Functions
// -----------------------------------------------------------------------------

interface AnomalyPatternParams {
  walletAddress: string;
  eventType: string;
  anomalyDescription: string;
  thresholdBreached?: string;
  severity: 'high' | 'medium' | 'low';
}

export async function writeAnomalyPattern(
  params: AnomalyPatternParams
): Promise<void> {
  const client = getHunieClient();
  if (!client) return;

  try {
    await client.writeMemory({
      agentId: WALLET_MONITOR_AGENT,
      content: {
        contentType: 'KNOWLEDGE_GRAPH',
        text: `Anomaly detected for ${params.walletAddress}: ${params.anomalyDescription}`,
      },
      source: { type: 'DIRECT_OBSERVATION', reliabilityWeight: 0.9 },
      namespace: 'xrnotify.wallet-monitor.anomaly-pattern',
      metadata: {
        walletAddress: params.walletAddress,
        eventType: params.eventType,
        severity: params.severity,
        thresholdBreached: params.thresholdBreached,
        detectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      '[H.U.N.I.E.] Failed to write anomaly pattern:',
      error instanceof Error ? error.message : error
    );
  }
}

interface AlertEventParams {
  webhookId: string;
  walletAddress: string;
  eventType: string;
  wasAcknowledged: boolean;
  deliverySuccess: boolean;
}

export async function writeAlertEvent(
  params: AlertEventParams
): Promise<void> {
  const client = getHunieClient();
  if (!client) return;

  try {
    await client.writeMemory({
      agentId: WALLET_MONITOR_AGENT,
      content: {
        contentType: 'KNOWLEDGE_GRAPH',
        text: `Alert for ${params.walletAddress}: ${params.eventType} - delivery ${params.deliverySuccess ? 'succeeded' : 'failed'}, ${params.wasAcknowledged ? 'acknowledged' : 'unacknowledged'}`,
      },
      source: { type: 'DIRECT_OBSERVATION', reliabilityWeight: 0.85 },
      namespace: 'xrnotify.wallet-monitor.alert-history',
      metadata: {
        webhookId: params.webhookId,
        walletAddress: params.walletAddress,
        eventType: params.eventType,
        wasAcknowledged: params.wasAcknowledged,
        deliverySuccess: params.deliverySuccess,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      '[H.U.N.I.E.] Failed to write alert event:',
      error instanceof Error ? error.message : error
    );
  }
}

interface NetworkStateParams {
  ledgerIndex: number;
  baseFee: number;
  closeTime: number;
  validatorCount?: number;
  noteworthy?: string;
}

export async function writeNetworkState(
  params: NetworkStateParams
): Promise<void> {
  const client = getHunieClient();
  if (!client) return;

  try {
    await client.writeMemory({
      agentId: NETWORK_AGENT,
      content: {
        contentType: 'KNOWLEDGE_GRAPH',
        text: `XRPL ledger ${params.ledgerIndex}: baseFee=${params.baseFee}, closeTime=${params.closeTime}${params.noteworthy ? ` - ${params.noteworthy}` : ''}`,
      },
      source: { type: 'EXTERNAL_SYSTEM', reliabilityWeight: 0.95 },
      namespace: 'xrnotify.network-agent.xrpl-state',
      metadata: {
        ledgerIndex: params.ledgerIndex,
        baseFee: params.baseFee,
        closeTime: params.closeTime,
        validatorCount: params.validatorCount,
        noteworthy: params.noteworthy,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      '[H.U.N.I.E.] Failed to write network state:',
      error instanceof Error ? error.message : error
    );
  }
}

interface UsageMetricsParams {
  totalWebhooks: number;
  totalDeliveries: number;
  successRate: number;
  avgLatencyMs: number;
  activeWallets: number;
}

export async function writeUsageMetrics(
  params: UsageMetricsParams
): Promise<void> {
  const client = getHunieClient();
  if (!client) return;

  try {
    await client.writeMemory({
      agentId: USAGE_AGENT,
      content: {
        contentType: 'KNOWLEDGE_GRAPH',
        text: `Usage snapshot: ${params.totalWebhooks} webhooks, ${params.totalDeliveries} deliveries, ${(params.successRate * 100).toFixed(1)}% success, ${params.avgLatencyMs}ms avg latency, ${params.activeWallets} active wallets`,
      },
      source: { type: 'DIRECT_OBSERVATION', reliabilityWeight: 0.9 },
      namespace: 'xrnotify.usage-agent.product-metrics',
      metadata: {
        totalWebhooks: params.totalWebhooks,
        totalDeliveries: params.totalDeliveries,
        successRate: params.successRate,
        avgLatencyMs: params.avgLatencyMs,
        activeWallets: params.activeWallets,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      '[H.U.N.I.E.] Failed to write usage metrics:',
      error instanceof Error ? error.message : error
    );
  }
}

// -----------------------------------------------------------------------------
// Read Functions
// -----------------------------------------------------------------------------

export async function getWalletContext(
  walletAddress: string
): Promise<string> {
  const client = getHunieClient();
  if (!client) return '';

  try {
    const [anomalies, alerts] = await Promise.all([
      client.queryMemory({
        agentId: WALLET_MONITOR_AGENT,
        query: `anomaly patterns for wallet ${walletAddress}`,
        strategy: 'SEMANTIC',
        namespace: 'xrnotify.wallet-monitor.anomaly-pattern',
        limit: 10,
      }),
      client.queryMemory({
        agentId: WALLET_MONITOR_AGENT,
        query: `alert history for wallet ${walletAddress}`,
        strategy: 'SEMANTIC',
        namespace: 'xrnotify.wallet-monitor.alert-history',
        limit: 10,
      }),
    ]);

    const parts: string[] = [];

    if (anomalies && typeof anomalies === 'object' && 'results' in anomalies) {
      const results = (anomalies as { results: Array<{ content: string }> }).results;
      if (results.length > 0) {
        parts.push(
          `Anomaly patterns (${results.length}):\n${results.map((r) => `- ${r.content}`).join('\n')}`
        );
      }
    }

    if (alerts && typeof alerts === 'object' && 'results' in alerts) {
      const results = (alerts as { results: Array<{ content: string }> }).results;
      if (results.length > 0) {
        parts.push(
          `Alert history (${results.length}):\n${results.map((r) => `- ${r.content}`).join('\n')}`
        );
      }
    }

    return parts.join('\n\n');
  } catch (error) {
    console.error(
      '[H.U.N.I.E.] Failed to get wallet context:',
      error instanceof Error ? error.message : error
    );
    return '';
  }
}
