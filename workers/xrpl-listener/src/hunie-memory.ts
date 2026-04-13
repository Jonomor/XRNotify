// =============================================================================
// H.U.N.I.E. Memory Functions (Worker Copy)
// =============================================================================
// Fire-and-forget safe: never throws, logs errors only.
// =============================================================================

import { getHunieClient } from './hunie';

const WALLET_MONITOR_AGENT = process.env['HUNIE_AGENT_WALLET_MONITOR'] ?? '';
const NETWORK_AGENT = process.env['HUNIE_AGENT_NETWORK'] ?? '';

interface AlertEventParams {
  webhookId: string;
  walletAddress: string;
  eventType: string;
  wasAcknowledged: boolean;
  deliverySuccess: boolean;
}

export async function writeAlertEvent(params: AlertEventParams): Promise<void> {
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
    console.error('[H.U.N.I.E.] Failed to write alert event:', error instanceof Error ? error.message : error);
  }
}

interface NetworkStateParams {
  ledgerIndex: number;
  baseFee: number;
  closeTime: number;
  validatorCount?: number;
}

export async function writeNetworkState(params: NetworkStateParams): Promise<void> {
  const client = getHunieClient();
  if (!client) return;

  try {
    await client.writeMemory({
      agentId: NETWORK_AGENT,
      content: {
        contentType: 'KNOWLEDGE_GRAPH',
        text: `XRPL ledger ${params.ledgerIndex}: baseFee=${params.baseFee}, closeTime=${params.closeTime}`,
      },
      source: { type: 'EXTERNAL_SYSTEM', reliabilityWeight: 0.95 },
      namespace: 'xrnotify.network-agent.xrpl-state',
      metadata: {
        ledgerIndex: params.ledgerIndex,
        baseFee: params.baseFee,
        closeTime: params.closeTime,
        validatorCount: params.validatorCount,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[H.U.N.I.E.] Failed to write network state:', error instanceof Error ? error.message : error);
  }
}
