// =============================================================================
// XRNotify XRPL Listener - Normalization Module
// =============================================================================
// Transforms raw XRPL transactions into canonical XrplEvent schema
// =============================================================================

import type { TransactionStream } from 'xrpl';
import type { XrplEvent, EventType } from '@xrnotify/shared';
import type { Logger } from 'pino';

// Re-export parsers
export { parsePayment } from './parsers/payment.js';
export { parseNft } from './parsers/nft.js';
export { parseDex } from './parsers/dex.js';
export { parseTrustline } from './parsers/trustline.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ParsedEvent {
  eventType: EventType;
  payload: Record<string, unknown>;
  subIndex?: number;
}

export interface NormalizationResult {
  events: XrplEvent[];
  skipped: boolean;
  skipReason?: string;
}

export interface TransactionMeta {
  TransactionResult: string;
  delivered_amount?: unknown;
  AffectedNodes?: unknown[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Ripple epoch: 2000-01-01T00:00:00Z in Unix time */
export const RIPPLE_EPOCH = 946684800;

/** Transaction types we process */
export const SUPPORTED_TX_TYPES = new Set([
  'Payment',
  'TrustSet',
  'NFTokenMint',
  'NFTokenBurn',
  'NFTokenCreateOffer',
  'NFTokenAcceptOffer',
  'NFTokenCancelOffer',
  'OfferCreate',
  'OfferCancel',
  'EscrowCreate',
  'EscrowFinish',
  'EscrowCancel',
  'CheckCreate',
  'CheckCash',
  'CheckCancel',
  'AccountSet',
  'AccountDelete',
]);

// -----------------------------------------------------------------------------
// Time Conversion
// -----------------------------------------------------------------------------

/**
 * Convert Ripple timestamp to ISO 8601 string
 */
export function rippleTimeToISO(rippleTime: number): string {
  const unixMs = (rippleTime + RIPPLE_EPOCH) * 1000;
  return new Date(unixMs).toISOString();
}

/**
 * Convert ISO timestamp to Ripple time
 */
export function isoToRippleTime(iso: string): number {
  const unixSeconds = Math.floor(new Date(iso).getTime() / 1000);
  return unixSeconds - RIPPLE_EPOCH;
}

// -----------------------------------------------------------------------------
// Event ID Generation
// -----------------------------------------------------------------------------

/**
 * Generate deterministic event ID
 * Format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
 */
export function generateEventId(
  ledgerIndex: number,
  txHash: string,
  eventType: EventType,
  subIndex?: number
): string {
  const base = `xrpl:${ledgerIndex}:${txHash}:${eventType}`;
  return subIndex !== undefined ? `${base}:${subIndex}` : base;
}

// -----------------------------------------------------------------------------
// Account Extraction
// -----------------------------------------------------------------------------

/**
 * Extract all accounts involved in a transaction
 */
export function extractAccounts(
  tx: TransactionStream['transaction'],
  meta: unknown
): string[] {
  const accounts = new Set<string>();

  // Primary account (sender)
  if (tx.Account) {
    accounts.add(tx.Account);
  }

  // Destination for payments
  if ('Destination' in tx && typeof tx.Destination === 'string') {
    accounts.add(tx.Destination);
  }

  // Issuer for trust lines
  if ('LimitAmount' in tx) {
    const limit = tx.LimitAmount as { issuer?: string } | undefined;
    if (limit?.issuer) {
      accounts.add(limit.issuer);
    }
  }

  // Owner for NFT operations
  if ('Owner' in tx && typeof tx.Owner === 'string') {
    accounts.add(tx.Owner);
  }

  // Extract from affected nodes
  if (meta && typeof meta === 'object' && 'AffectedNodes' in meta) {
    const nodes = (meta as TransactionMeta).AffectedNodes ?? [];
    extractAccountsFromNodes(nodes, accounts);
  }

  return Array.from(accounts);
}

function extractAccountsFromNodes(nodes: unknown[], accounts: Set<string>): void {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    const nodeData = getNodeData(node);
    if (!nodeData) continue;

    const fields = (nodeData.FinalFields ?? nodeData.NewFields ?? nodeData.PreviousFields) as
      | Record<string, unknown>
      | undefined;

    if (!fields) continue;

    // Common account fields
    if (typeof fields.Account === 'string') accounts.add(fields.Account);
    if (typeof fields.Destination === 'string') accounts.add(fields.Destination);
    if (typeof fields.Owner === 'string') accounts.add(fields.Owner);
    if (typeof fields.Issuer === 'string') accounts.add(fields.Issuer);

    // RippleState (trust line) accounts
    if (fields.HighLimit && typeof fields.HighLimit === 'object') {
      const hl = fields.HighLimit as { issuer?: string };
      if (typeof hl.issuer === 'string') accounts.add(hl.issuer);
    }
    if (fields.LowLimit && typeof fields.LowLimit === 'object') {
      const ll = fields.LowLimit as { issuer?: string };
      if (typeof ll.issuer === 'string') accounts.add(ll.issuer);
    }
  }
}

function getNodeData(node: object): Record<string, unknown> | null {
  if ('ModifiedNode' in node) return (node as { ModifiedNode: Record<string, unknown> }).ModifiedNode;
  if ('CreatedNode' in node) return (node as { CreatedNode: Record<string, unknown> }).CreatedNode;
  if ('DeletedNode' in node) return (node as { DeletedNode: Record<string, unknown> }).DeletedNode;
  return null;
}

// -----------------------------------------------------------------------------
// Main Normalization Function
// -----------------------------------------------------------------------------

/**
 * Normalize a raw XRPL transaction stream into XrplEvents
 */
export function normalizeTransaction(
  stream: TransactionStream,
  logger: Logger
): NormalizationResult {
  const tx = stream.transaction;
  const meta = stream.meta as TransactionMeta | undefined;
  const ledgerIndex = stream.ledger_index;
  const txHash = tx.hash ?? '';

  // Check transaction result
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    return {
      events: [],
      skipped: true,
      skipReason: `Transaction failed: ${meta?.TransactionResult ?? 'unknown'}`,
    };
  }

  // Check if we support this transaction type
  const txType = tx.TransactionType;
  if (!SUPPORTED_TX_TYPES.has(txType)) {
    return {
      events: [],
      skipped: true,
      skipReason: `Unsupported transaction type: ${txType}`,
    };
  }

  // Get timestamp
  const timestamp = tx.date ? rippleTimeToISO(tx.date) : new Date().toISOString();

  // Extract accounts
  const accounts = extractAccounts(tx, meta);

  // Parse into events based on transaction type
  const parsedEvents = parseTransaction(tx, meta, logger);

  if (parsedEvents.length === 0) {
    return {
      events: [],
      skipped: true,
      skipReason: 'No events parsed from transaction',
    };
  }

  // Convert to XrplEvents
  const events: XrplEvent[] = parsedEvents.map((parsed) => ({
    event_id: generateEventId(ledgerIndex, txHash, parsed.eventType, parsed.subIndex),
    event_type: parsed.eventType,
    ledger_index: ledgerIndex,
    tx_hash: txHash,
    timestamp,
    accounts,
    payload: parsed.payload,
  }));

  return { events, skipped: false };
}

// -----------------------------------------------------------------------------
// Transaction Parser Router
// -----------------------------------------------------------------------------

function parseTransaction(
  tx: TransactionStream['transaction'],
  meta: TransactionMeta | undefined,
  logger: Logger
): ParsedEvent[] {
  const txType = tx.TransactionType;

  try {
    switch (txType) {
      case 'Payment':
        return parsePaymentTx(tx, meta);

      case 'TrustSet':
        return parseTrustSetTx(tx, meta);

      case 'NFTokenMint':
        return parseNFTokenMintTx(tx, meta);

      case 'NFTokenBurn':
        return parseNFTokenBurnTx(tx);

      case 'NFTokenCreateOffer':
        return parseNFTokenCreateOfferTx(tx);

      case 'NFTokenAcceptOffer':
        return parseNFTokenAcceptOfferTx(tx, meta);

      case 'NFTokenCancelOffer':
        return parseNFTokenCancelOfferTx(tx);

      case 'OfferCreate':
        return parseOfferCreateTx(tx, meta);

      case 'OfferCancel':
        return parseOfferCancelTx(tx);

      case 'EscrowCreate':
        return [{ eventType: 'escrow.created', payload: { account: tx.Account } }];

      case 'EscrowFinish':
        return [{ eventType: 'escrow.finished', payload: { account: tx.Account } }];

      case 'EscrowCancel':
        return [{ eventType: 'escrow.cancelled', payload: { account: tx.Account } }];

      case 'CheckCreate':
        return [{ eventType: 'check.created', payload: { account: tx.Account } }];

      case 'CheckCash':
        return [{ eventType: 'check.cashed', payload: { account: tx.Account } }];

      case 'CheckCancel':
        return [{ eventType: 'check.cancelled', payload: { account: tx.Account } }];

      default:
        return [];
    }
  } catch (error) {
    logger.error({ error, txType, txHash: tx.hash }, 'Error parsing transaction');
    return [];
  }
}

// -----------------------------------------------------------------------------
// Individual Transaction Parsers (inline for module completeness)
// -----------------------------------------------------------------------------

function parsePaymentTx(
  tx: TransactionStream['transaction'],
  meta: TransactionMeta | undefined
): ParsedEvent[] {
  const amount = (tx as { Amount?: unknown }).Amount;
  const deliveredAmount = meta?.delivered_amount ?? amount;

  const isXrp = typeof deliveredAmount === 'string';

  return [{
    eventType: isXrp ? 'payment.xrp' : 'payment.issued',
    payload: {
      account: tx.Account,
      destination: (tx as { Destination?: string }).Destination,
      amount: isXrp ? deliveredAmount : (deliveredAmount as { value?: string })?.value,
      currency: isXrp ? 'XRP' : (deliveredAmount as { currency?: string })?.currency,
      issuer: isXrp ? undefined : (deliveredAmount as { issuer?: string })?.issuer,
    },
  }];
}

function parseTrustSetTx(
  tx: TransactionStream['transaction'],
  meta: TransactionMeta | undefined
): ParsedEvent[] {
  const limitAmount = (tx as { LimitAmount?: { currency?: string; issuer?: string; value?: string } }).LimitAmount;

  let eventType: EventType = 'trustline.modified';

  if (meta?.AffectedNodes) {
    for (const node of meta.AffectedNodes) {
      if (node && typeof node === 'object') {
        if ('CreatedNode' in node) {
          const cn = (node as { CreatedNode: { LedgerEntryType?: string } }).CreatedNode;
          if (cn.LedgerEntryType === 'RippleState') {
            eventType = 'trustline.created';
            break;
          }
        }
        if ('DeletedNode' in node) {
          const dn = (node as { DeletedNode: { LedgerEntryType?: string } }).DeletedNode;
          if (dn.LedgerEntryType === 'RippleState') {
            eventType = 'trustline.deleted';
            break;
          }
        }
      }
    }
  }

  return [{
    eventType,
    payload: {
      account: tx.Account,
      currency: limitAmount?.currency,
      issuer: limitAmount?.issuer,
      limit: limitAmount?.value,
    },
  }];
}

function parseNFTokenMintTx(
  tx: TransactionStream['transaction'],
  meta: TransactionMeta | undefined
): ParsedEvent[] {
  let nftokenId: string | undefined;

  if (meta?.AffectedNodes) {
    for (const node of meta.AffectedNodes) {
      if (node && typeof node === 'object' && 'CreatedNode' in node) {
        const cn = (node as { CreatedNode: { LedgerEntryType?: string; NewFields?: { NFTokens?: Array<{ NFToken?: { NFTokenID?: string } }> } } }).CreatedNode;
        if (cn.LedgerEntryType === 'NFTokenPage') {
          const tokens = cn.NewFields?.NFTokens;
          if (tokens && tokens.length > 0) {
            nftokenId = tokens[0]?.NFToken?.NFTokenID;
          }
        }
      }
    }
  }

  return [{
    eventType: 'nft.minted',
    payload: {
      account: tx.Account,
      nftoken_id: nftokenId,
      taxon: (tx as { NFTokenTaxon?: number }).NFTokenTaxon,
      uri: (tx as { URI?: string }).URI,
    },
  }];
}

function parseNFTokenBurnTx(tx: TransactionStream['transaction']): ParsedEvent[] {
  return [{
    eventType: 'nft.burned',
    payload: {
      account: tx.Account,
      nftoken_id: (tx as { NFTokenID?: string }).NFTokenID,
    },
  }];
}

function parseNFTokenCreateOfferTx(tx: TransactionStream['transaction']): ParsedEvent[] {
  return [{
    eventType: 'nft.offer_created',
    payload: {
      account: tx.Account,
      nftoken_id: (tx as { NFTokenID?: string }).NFTokenID,
      amount: (tx as { Amount?: unknown }).Amount,
      flags: tx.Flags,
    },
  }];
}

function parseNFTokenAcceptOfferTx(
  tx: TransactionStream['transaction'],
  _meta: TransactionMeta | undefined
): ParsedEvent[] {
  const events: ParsedEvent[] = [{
    eventType: 'nft.offer_accepted',
    payload: {
      account: tx.Account,
      sell_offer: (tx as { NFTokenSellOffer?: string }).NFTokenSellOffer,
      buy_offer: (tx as { NFTokenBuyOffer?: string }).NFTokenBuyOffer,
    },
  }];

  // Also emit transfer event
  events.push({
    eventType: 'nft.transfer',
    payload: { account: tx.Account },
    subIndex: 1,
  });

  return events;
}

function parseNFTokenCancelOfferTx(tx: TransactionStream['transaction']): ParsedEvent[] {
  return [{
    eventType: 'nft.offer_cancelled',
    payload: {
      account: tx.Account,
      offer_ids: (tx as { NFTokenOffers?: string[] }).NFTokenOffers,
    },
  }];
}

function parseOfferCreateTx(
  tx: TransactionStream['transaction'],
  meta: TransactionMeta | undefined
): ParsedEvent[] {
  const events: ParsedEvent[] = [{
    eventType: 'dex.offer_created',
    payload: {
      account: tx.Account,
      taker_gets: (tx as { TakerGets?: unknown }).TakerGets,
      taker_pays: (tx as { TakerPays?: unknown }).TakerPays,
    },
  }];

  // Check for fills
  if (meta?.AffectedNodes) {
    let fillIndex = 0;
    for (const node of meta.AffectedNodes) {
      if (node && typeof node === 'object') {
        if ('DeletedNode' in node) {
          const dn = (node as { DeletedNode: { LedgerEntryType?: string } }).DeletedNode;
          if (dn.LedgerEntryType === 'Offer') {
            events.push({
              eventType: 'dex.offer_filled',
              payload: { account: tx.Account },
              subIndex: ++fillIndex,
            });
          }
        }
        if ('ModifiedNode' in node) {
          const mn = (node as { ModifiedNode: { LedgerEntryType?: string } }).ModifiedNode;
          if (mn.LedgerEntryType === 'Offer') {
            events.push({
              eventType: 'dex.offer_partial',
              payload: { account: tx.Account },
              subIndex: ++fillIndex,
            });
          }
        }
      }
    }
  }

  return events;
}

function parseOfferCancelTx(tx: TransactionStream['transaction']): ParsedEvent[] {
  return [{
    eventType: 'dex.offer_cancelled',
    payload: {
      account: tx.Account,
      offer_sequence: (tx as { OfferSequence?: number }).OfferSequence,
    },
  }];
}
