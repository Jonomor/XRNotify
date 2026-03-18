// =============================================================================
// XRNotify XRPL Listener - DEX Parser
// =============================================================================
// Parses XRPL DEX (Decentralized Exchange) transactions into normalized events
// =============================================================================

import type { EventType } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Amount = string | IssuedCurrencyAmount;

export interface IssuedCurrencyAmount {
  currency: string;
  issuer: string;
  value: string;
}

export interface OfferCreateTransaction {
  TransactionType: 'OfferCreate';
  Account: string;
  TakerGets: Amount;
  TakerPays: Amount;
  Expiration?: number;
  OfferSequence?: number;
  Flags?: number;
}

export interface OfferCancelTransaction {
  TransactionType: 'OfferCancel';
  Account: string;
  OfferSequence: number;
}

export type DexTransaction = OfferCreateTransaction | OfferCancelTransaction;

export interface DexMeta {
  TransactionResult: string;
  AffectedNodes?: AffectedNode[];
}

export type AffectedNode =
  | { CreatedNode: NodeData }
  | { ModifiedNode: NodeData }
  | { DeletedNode: NodeData };

export interface NodeData {
  LedgerEntryType: string;
  LedgerIndex?: string;
  FinalFields?: Record<string, unknown>;
  NewFields?: Record<string, unknown>;
  PreviousFields?: Record<string, unknown>;
}

export interface ParsedDexEvent {
  eventType: EventType;
  payload: Record<string, unknown>;
  subIndex?: number;
}

export interface NormalizedAmount {
  value: string;
  currency: string;
  issuer?: string;
}

// -----------------------------------------------------------------------------
// Offer Flags
// -----------------------------------------------------------------------------

export const OfferCreateFlags = {
  /** Passive offer (don't cross existing offers) */
  PASSIVE: 0x00010000,
  /** Immediate or cancel */
  IMMEDIATE_OR_CANCEL: 0x00020000,
  /** Fill or kill */
  FILL_OR_KILL: 0x00040000,
  /** Sell all TakerGets regardless of exchange rate */
  SELL: 0x00080000,
} as const;

// -----------------------------------------------------------------------------
// Amount Helpers
// -----------------------------------------------------------------------------

/**
 * Check if amount is XRP (string of drops)
 */
export function isXrpAmount(amount: Amount): amount is string {
  return typeof amount === 'string';
}

/**
 * Normalize amount to common structure
 */
export function normalizeAmount(amount: Amount): NormalizedAmount {
  if (isXrpAmount(amount)) {
    return {
      value: amount,
      currency: 'XRP',
    };
  }
  return {
    value: amount.value,
    currency: amount.currency,
    issuer: amount.issuer,
  };
}

/**
 * Format trading pair string
 */
export function formatTradingPair(takerGets: Amount, takerPays: Amount): string {
  const gets = normalizeAmount(takerGets);
  const pays = normalizeAmount(takerPays);
  return `${pays.currency}/${gets.currency}`;
}

/**
 * Calculate exchange rate
 */
export function calculateExchangeRate(takerGets: Amount, takerPays: Amount): number | null {
  try {
    const gets = normalizeAmount(takerGets);
    const pays = normalizeAmount(takerPays);

    let getsValue = parseFloat(gets.value);
    let paysValue = parseFloat(pays.value);

    // Convert XRP drops to whole units for rate calculation
    if (gets.currency === 'XRP') {
      getsValue = getsValue / 1_000_000;
    }
    if (pays.currency === 'XRP') {
      paysValue = paysValue / 1_000_000;
    }

    if (getsValue === 0) return null;
    return paysValue / getsValue;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse DEX transactions into normalized events
 */
export function parseDex(
  tx: DexTransaction,
  meta?: DexMeta
): ParsedDexEvent[] {
  switch (tx.TransactionType) {
    case 'OfferCreate':
      return parseOfferCreate(tx, meta);
    case 'OfferCancel':
      return parseOfferCancel(tx, meta);
    default:
      return [];
  }
}

// -----------------------------------------------------------------------------
// OfferCreate Parser
// -----------------------------------------------------------------------------

function parseOfferCreate(
  tx: OfferCreateTransaction,
  meta?: DexMeta
): ParsedDexEvent[] {
  const events: ParsedDexEvent[] = [];

  const takerGets = normalizeAmount(tx.TakerGets);
  const takerPays = normalizeAmount(tx.TakerPays);
  const flags = tx.Flags ?? 0;

  // Base offer created event
  const basePayload: Record<string, unknown> = {
    account: tx.Account,
    taker_gets: takerGets,
    taker_pays: takerPays,
    trading_pair: formatTradingPair(tx.TakerGets, tx.TakerPays),
    exchange_rate: calculateExchangeRate(tx.TakerGets, tx.TakerPays),
    expiration: tx.Expiration,
    flags: {
      passive: (flags & OfferCreateFlags.PASSIVE) !== 0,
      immediate_or_cancel: (flags & OfferCreateFlags.IMMEDIATE_OR_CANCEL) !== 0,
      fill_or_kill: (flags & OfferCreateFlags.FILL_OR_KILL) !== 0,
      sell: (flags & OfferCreateFlags.SELL) !== 0,
    },
  };

  // Check if this replaced an existing offer
  if (tx.OfferSequence !== undefined) {
    basePayload.replaced_offer_sequence = tx.OfferSequence;
  }

  events.push({
    eventType: 'dex.offer_created',
    payload: basePayload,
  });

  // Extract fills from meta
  if (meta?.AffectedNodes) {
    const fills = extractFills(tx.Account, meta.AffectedNodes);

    let subIndex = 0;
    for (const fill of fills) {
      subIndex++;
      events.push({
        eventType: fill.partial ? 'dex.offer_partial' : 'dex.offer_filled',
        payload: {
          account: tx.Account,
          counterparty: fill.counterparty,
          got: fill.got,
          paid: fill.paid,
          trading_pair: formatTradingPair(tx.TakerGets, tx.TakerPays),
          offer_sequence: fill.offerSequence,
        },
        subIndex,
      });
    }
  }

  return events;
}

// -----------------------------------------------------------------------------
// OfferCancel Parser
// -----------------------------------------------------------------------------

function parseOfferCancel(
  tx: OfferCancelTransaction,
  meta?: DexMeta
): ParsedDexEvent[] {
  // Extract cancelled offer details from meta
  const cancelledOffer = extractCancelledOffer(meta);

  return [{
    eventType: 'dex.offer_cancelled',
    payload: {
      account: tx.Account,
      offer_sequence: tx.OfferSequence,
      ...cancelledOffer,
    },
  }];
}

// -----------------------------------------------------------------------------
// Fill Extraction
// -----------------------------------------------------------------------------

interface Fill {
  counterparty: string;
  got: NormalizedAmount;
  paid: NormalizedAmount;
  partial: boolean;
  offerSequence?: number;
}

function extractFills(account: string, nodes: AffectedNode[]): Fill[] {
  const fills: Fill[] = [];

  for (const node of nodes) {
    // Fully filled offers are deleted
    if ('DeletedNode' in node) {
      const dn = node.DeletedNode;
      if (dn.LedgerEntryType === 'Offer') {
        const fields = dn.FinalFields as Record<string, unknown> | undefined;
        if (fields && fields.Account !== account) {
          const fill = extractFillFromOffer(fields, false);
          if (fill) fills.push(fill);
        }
      }
    }

    // Partially filled offers are modified
    if ('ModifiedNode' in node) {
      const mn = node.ModifiedNode;
      if (mn.LedgerEntryType === 'Offer') {
        const fields = mn.FinalFields as Record<string, unknown> | undefined;
        const prevFields = mn.PreviousFields as Record<string, unknown> | undefined;
        if (fields && fields.Account !== account && prevFields) {
          const fill = extractPartialFill(fields, prevFields);
          if (fill) fills.push(fill);
        }
      }
    }
  }

  return fills;
}

function extractFillFromOffer(
  fields: Record<string, unknown>,
  partial: boolean
): Fill | null {
  try {
    const counterparty = fields.Account as string;
    const takerGets = fields.TakerGets as Amount;
    const takerPays = fields.TakerPays as Amount;
    const sequence = fields.Sequence as number | undefined;

    if (!counterparty || !takerGets || !takerPays) return null;

    return {
      counterparty,
      got: normalizeAmount(takerPays), // What we got is what they paid
      paid: normalizeAmount(takerGets), // What we paid is what they got
      partial,
      offerSequence: sequence,
    };
  } catch {
    return null;
  }
}

function extractPartialFill(
  finalFields: Record<string, unknown>,
  prevFields: Record<string, unknown>
): Fill | null {
  try {
    const counterparty = finalFields.Account as string;

    // Calculate the difference between previous and final amounts
    const prevGets = prevFields.TakerGets as Amount | undefined;
    const finalGets = finalFields.TakerGets as Amount;
    const prevPays = prevFields.TakerPays as Amount | undefined;
    const finalPays = finalFields.TakerPays as Amount;

    if (!counterparty || !finalGets || !finalPays) return null;

    // Calculate filled amounts
    const gotAmount = calculateDifference(prevPays, finalPays);
    const paidAmount = calculateDifference(prevGets, finalGets);

    if (!gotAmount || !paidAmount) return null;

    return {
      counterparty,
      got: gotAmount,
      paid: paidAmount,
      partial: true,
      offerSequence: finalFields.Sequence as number | undefined,
    };
  } catch {
    return null;
  }
}

function calculateDifference(
  prev: Amount | undefined,
  final: Amount
): NormalizedAmount | null {
  if (!prev) return normalizeAmount(final);

  try {
    const prevNorm = normalizeAmount(prev);
    const finalNorm = normalizeAmount(final);

    const prevValue = parseFloat(prevNorm.value);
    const finalValue = parseFloat(finalNorm.value);
    const diff = prevValue - finalValue;

    if (diff <= 0) return null;

    return {
      value: diff.toString(),
      currency: finalNorm.currency,
      issuer: finalNorm.issuer,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Cancelled Offer Extraction
// -----------------------------------------------------------------------------

function extractCancelledOffer(meta?: DexMeta): Record<string, unknown> {
  if (!meta?.AffectedNodes) return {};

  for (const node of meta.AffectedNodes) {
    if ('DeletedNode' in node) {
      const dn = node.DeletedNode;
      if (dn.LedgerEntryType === 'Offer') {
        const fields = dn.FinalFields as Record<string, unknown> | undefined;
        if (fields) {
          const takerGets = fields.TakerGets as Amount | undefined;
          const takerPays = fields.TakerPays as Amount | undefined;

          return {
            remaining_taker_gets: takerGets ? normalizeAmount(takerGets) : undefined,
            remaining_taker_pays: takerPays ? normalizeAmount(takerPays) : undefined,
            trading_pair: takerGets && takerPays
              ? formatTradingPair(takerGets, takerPays)
              : undefined,
          };
        }
      }
    }
  }

  return {};
}

// -----------------------------------------------------------------------------
// Order Book Helpers
// -----------------------------------------------------------------------------

/**
 * Determine if offer is a buy or sell from perspective of base currency
 */
export function getOfferSide(
  takerGets: Amount,
  takerPays: Amount,
  baseCurrency: string
): 'buy' | 'sell' {
  const gets = normalizeAmount(takerGets);
  const pays = normalizeAmount(takerPays);

  // If TakerGets is base currency, this is a buy order (wants to buy base)
  // If TakerPays is base currency, this is a sell order (wants to sell base)
  if (gets.currency === baseCurrency) {
    return 'buy';
  }
  return 'sell';
}

/**
 * Calculate quality (price) of an offer
 * Quality = TakerPays / TakerGets
 */
export function getOfferQuality(takerGets: Amount, takerPays: Amount): string | null {
  const rate = calculateExchangeRate(takerGets, takerPays);
  return rate !== null ? rate.toPrecision(8) : null;
}
