/**
 * @fileoverview XRNotify DEX Transaction Parser
 * Parses XRPL OfferCreate and OfferCancel transactions into normalized events.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/parsers/dex
 */

import { createModuleLogger } from '../../../core/logger.js';
import {
  type RawTransaction,
  type ParseResult,
  type AffectedNode,
  type IssuedCurrencyAmount,
  type NormalizedAmount,
  normalizeAmount,
  extractAccounts,
  decodeCurrency,
  isXrpAmount,
  rippleTimeToISO,
} from '../normalize.js';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('parser-dex');

/**
 * DEX offer details
 */
export interface OfferDetails {
  account: string;
  sequence: number;
  takerGets: NormalizedAmount | null;
  takerPays: NormalizedAmount | null;
  expiration: string | null;
  flags: number;
  passive: boolean;
  immediateOrCancel: boolean;
  fillOrKill: boolean;
  sell: boolean;
}

/**
 * Trade execution details
 */
export interface TradeExecution {
  takerGot: NormalizedAmount | null;
  takerPaid: NormalizedAmount | null;
  makerAccount: string;
  makerSequence: number;
  makerGot: NormalizedAmount | null;
  makerPaid: NormalizedAmount | null;
}

/**
 * Offer fill result
 */
export interface OfferFillResult {
  fillType: 'full' | 'partial' | 'none';
  fillPercentage: number;
  takerGot: NormalizedAmount | null;
  takerPaid: NormalizedAmount | null;
  remainingGets: NormalizedAmount | null;
  remainingPays: NormalizedAmount | null;
  tradesExecuted: TradeExecution[];
  offersConsumed: number;
  offerCreated: boolean;
  createdOfferSequence: number | null;
}

/**
 * Trading pair
 */
export interface TradingPair {
  base: {
    currency: string;
    issuer: string | null;
  };
  quote: {
    currency: string;
    issuer: string | null;
  };
  pairString: string;
}

/**
 * Order book side
 */
export type OrderBookSide = 'buy' | 'sell';

// =============================================================================
// Constants
// =============================================================================

/**
 * OfferCreate flags
 */
const OfferCreateFlags = {
  tfPassive: 0x00010000,
  tfImmediateOrCancel: 0x00020000,
  tfFillOrKill: 0x00040000,
  tfSell: 0x00080000,
} as const;

/**
 * Drops per XRP
 */
const DROPS_PER_XRP = 1_000_000;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get offer create flags description
 */
export function getOfferFlags(flags: number): {
  passive: boolean;
  immediateOrCancel: boolean;
  fillOrKill: boolean;
  sell: boolean;
} {
  return {
    passive: !!(flags & OfferCreateFlags.tfPassive),
    immediateOrCancel: !!(flags & OfferCreateFlags.tfImmediateOrCancel),
    fillOrKill: !!(flags & OfferCreateFlags.tfFillOrKill),
    sell: !!(flags & OfferCreateFlags.tfSell),
  };
}

/**
 * Extract trading pair from offer
 */
export function extractTradingPair(
  takerGets: string | IssuedCurrencyAmount | undefined,
  takerPays: string | IssuedCurrencyAmount | undefined
): TradingPair | null {
  if (!takerGets || !takerPays) {
    return null;
  }

  const base = isXrpAmount(takerGets)
    ? { currency: 'XRP', issuer: null }
    : { currency: decodeCurrency(takerGets.currency), issuer: takerGets.issuer };

  const quote = isXrpAmount(takerPays)
    ? { currency: 'XRP', issuer: null }
    : { currency: decodeCurrency(takerPays.currency), issuer: takerPays.issuer };

  // Create pair string (base/quote)
  const baseStr = base.issuer ? `${base.currency}.${base.issuer.substring(0, 8)}` : base.currency;
  const quoteStr = quote.issuer ? `${quote.currency}.${quote.issuer.substring(0, 8)}` : quote.currency;

  return {
    base,
    quote,
    pairString: `${baseStr}/${quoteStr}`,
  };
}

/**
 * Calculate exchange rate
 */
export function calculateExchangeRate(
  takerGets: NormalizedAmount | null,
  takerPays: NormalizedAmount | null
): number | null {
  if (!takerGets || !takerPays) {
    return null;
  }

  const getsValue = parseFloat(takerGets.value);
  const paysValue = parseFloat(takerPays.value);

  if (getsValue === 0) {
    return null;
  }

  return paysValue / getsValue;
}

/**
 * Determine order book side
 */
export function determineOrderBookSide(
  takerGets: string | IssuedCurrencyAmount | undefined,
  takerPays: string | IssuedCurrencyAmount | undefined
): OrderBookSide {
  // If selling XRP for tokens, it's a sell
  // If buying XRP with tokens, it's a buy
  const getsIsXrp = isXrpAmount(takerGets);
  const paysIsXrp = isXrpAmount(takerPays);

  if (getsIsXrp && !paysIsXrp) {
    return 'sell'; // Selling XRP
  }
  if (!getsIsXrp && paysIsXrp) {
    return 'buy'; // Buying XRP
  }

  // For token/token pairs, use alphabetical ordering
  if (!getsIsXrp && !paysIsXrp) {
    const getCurrency = decodeCurrency((takerGets as IssuedCurrencyAmount).currency);
    const payCurrency = decodeCurrency((takerPays as IssuedCurrencyAmount).currency);
    return getCurrency < payCurrency ? 'sell' : 'buy';
  }

  return 'sell'; // Default
}

/**
 * Extract amount from affected node field
 */
function extractAmountFromField(
  field: unknown
): NormalizedAmount | null {
  if (!field) {
    return null;
  }

  if (typeof field === 'string') {
    // XRP in drops
    const drops = BigInt(field);
    return {
      value: (Number(drops) / DROPS_PER_XRP).toFixed(6),
      currency: 'XRP',
      issuer: null,
      valueDrops: field,
    };
  }

  if (typeof field === 'object') {
    const issued = field as IssuedCurrencyAmount;
    return {
      value: issued.value,
      currency: decodeCurrency(issued.currency),
      issuer: issued.issuer,
      valueDrops: null,
    };
  }

  return null;
}

/**
 * Calculate fill result from affected nodes
 */
function calculateFillResult(
  tx: RawTransaction,
  originalGets: NormalizedAmount | null,
  originalPays: NormalizedAmount | null
): OfferFillResult {
  const result: OfferFillResult = {
    fillType: 'none',
    fillPercentage: 0,
    takerGot: null,
    takerPaid: null,
    remainingGets: null,
    remainingPays: null,
    tradesExecuted: [],
    offersConsumed: 0,
    offerCreated: false,
    createdOfferSequence: null,
  };

  if (!tx.meta?.AffectedNodes) {
    return result;
  }

  // Track trades and offer changes
  const consumedOffers: Array<{
    account: string;
    sequence: number;
    takerGets: NormalizedAmount | null;
    takerPays: NormalizedAmount | null;
  }> = [];

  let createdOffer: {
    sequence: number;
    takerGets: NormalizedAmount | null;
    takerPays: NormalizedAmount | null;
  } | null = null;

  for (const node of tx.meta.AffectedNodes) {
    // Check for deleted offers (fully consumed)
    if (node.DeletedNode?.LedgerEntryType === 'Offer') {
      const fields = node.DeletedNode.FinalFields as Record<string, unknown>;
      if (fields.Account !== tx.Account) {
        consumedOffers.push({
          account: fields.Account as string,
          sequence: fields.Sequence as number,
          takerGets: extractAmountFromField(fields.TakerGets),
          takerPays: extractAmountFromField(fields.TakerPays),
        });
      }
      result.offersConsumed++;
    }

    // Check for modified offers (partially consumed)
    if (node.ModifiedNode?.LedgerEntryType === 'Offer') {
      const prevFields = node.ModifiedNode.PreviousFields as Record<string, unknown> | undefined;
      const finalFields = node.ModifiedNode.FinalFields as Record<string, unknown> | undefined;

      if (prevFields && finalFields && finalFields.Account !== tx.Account) {
        const prevGets = extractAmountFromField(prevFields.TakerGets);
        const finalGets = extractAmountFromField(finalFields.TakerGets);

        if (prevGets && finalGets) {
          const consumed = parseFloat(prevGets.value) - parseFloat(finalGets.value);
          if (consumed > 0) {
            consumedOffers.push({
              account: finalFields.Account as string,
              sequence: finalFields.Sequence as number,
              takerGets: {
                ...prevGets,
                value: consumed.toString(),
              },
              takerPays: null, // Would need to calculate
            });
          }
        }
      }
    }

    // Check for created offer (taker's remaining offer)
    if (node.CreatedNode?.LedgerEntryType === 'Offer') {
      const fields = node.CreatedNode.NewFields as Record<string, unknown>;
      if (fields.Account === tx.Account) {
        result.offerCreated = true;
        createdOffer = {
          sequence: fields.Sequence as number,
          takerGets: extractAmountFromField(fields.TakerGets),
          takerPays: extractAmountFromField(fields.TakerPays),
        };
        result.createdOfferSequence = createdOffer.sequence;
        result.remainingGets = createdOffer.takerGets;
        result.remainingPays = createdOffer.takerPays;
      }
    }
  }

  // Calculate fill percentage
  if (originalGets && !result.offerCreated) {
    // Fully filled (no remaining offer)
    result.fillType = 'full';
    result.fillPercentage = 100;
    result.takerGot = originalGets;
    result.takerPaid = originalPays;
  } else if (originalGets && createdOffer?.takerGets) {
    // Partially filled
    const originalValue = parseFloat(originalGets.value);
    const remainingValue = parseFloat(createdOffer.takerGets.value);
    const filledValue = originalValue - remainingValue;

    if (filledValue > 0) {
      result.fillType = 'partial';
      result.fillPercentage = (filledValue / originalValue) * 100;
      result.takerGot = {
        ...originalGets,
        value: filledValue.toString(),
      };

      // Calculate proportional taker paid
      if (originalPays) {
        const originalPayValue = parseFloat(originalPays.value);
        const paidValue = (originalPayValue * filledValue) / originalValue;
        result.takerPaid = {
          ...originalPays,
          value: paidValue.toString(),
        };
      }
    }
  }

  // Build trade executions
  for (const consumed of consumedOffers) {
    result.tradesExecuted.push({
      takerGot: consumed.takerGets,
      takerPaid: consumed.takerPays,
      makerAccount: consumed.account,
      makerSequence: consumed.sequence,
      makerGot: consumed.takerPays, // Maker gets what taker pays
      makerPaid: consumed.takerGets, // Maker pays what taker gets
    });
  }

  result.offersConsumed = consumedOffers.length;

  return result;
}

/**
 * Determine DEX event type from fill result
 */
function determineDexEventType(
  tx: RawTransaction,
  fillResult: OfferFillResult
): EventType {
  const flags = tx.Flags ?? 0;
  const isIoC = !!(flags & OfferCreateFlags.tfImmediateOrCancel);
  const isFoK = !!(flags & OfferCreateFlags.tfFillOrKill);

  // If fully filled, it's a fill event
  if (fillResult.fillType === 'full') {
    return 'dex.offer_filled';
  }

  // If partially filled
  if (fillResult.fillType === 'partial') {
    // IoC with partial fill doesn't create offer
    if (isIoC) {
      return 'dex.offer_filled'; // Treat as fill since remaining is cancelled
    }
    return 'dex.offer_partially_filled';
  }

  // No fill - just offer creation
  if (fillResult.offerCreated) {
    return 'dex.offer_created';
  }

  // FoK that didn't fill
  if (isFoK) {
    return 'dex.offer_cancelled'; // FoK is auto-cancelled if not filled
  }

  // Default to created
  return 'dex.offer_created';
}

// =============================================================================
// Parsers
// =============================================================================

/**
 * Parse OfferCreate transaction
 */
export function parseOfferCreate(tx: RawTransaction): ParseResult {
  const flags = tx.Flags ?? 0;
  const offerFlags = getOfferFlags(flags);

  // Normalize amounts
  const takerGets = normalizeAmount(tx.TakerGets);
  const takerPays = normalizeAmount(tx.TakerPays);

  // Calculate fill result
  const fillResult = calculateFillResult(tx, takerGets, takerPays);

  // Determine event type
  const eventType = determineDexEventType(tx, fillResult);

  // Extract trading pair
  const tradingPair = extractTradingPair(tx.TakerGets, tx.TakerPays);

  // Calculate exchange rate
  const exchangeRate = calculateExchangeRate(takerGets, takerPays);

  // Determine order book side
  const side = determineOrderBookSide(tx.TakerGets, tx.TakerPays);

  // Build payload
  const payload: Record<string, unknown> = {
    account: tx.Account,
    sequence: tx.Sequence,
    taker_gets: takerGets,
    taker_pays: takerPays,
    expiration: tx.Expiration ? rippleTimeToISO(tx.Expiration) : null,

    // Flags
    flags: flags,
    passive: offerFlags.passive,
    immediate_or_cancel: offerFlags.immediateOrCancel,
    fill_or_kill: offerFlags.fillOrKill,
    sell: offerFlags.sell,

    // Trading pair info
    trading_pair: tradingPair?.pairString ?? null,
    base_currency: tradingPair?.base.currency ?? null,
    quote_currency: tradingPair?.quote.currency ?? null,
    exchange_rate: exchangeRate,
    order_side: side,

    // Fill result
    fill_type: fillResult.fillType,
    fill_percentage: Math.round(fillResult.fillPercentage * 100) / 100,
    taker_got: fillResult.takerGot,
    taker_paid: fillResult.takerPaid,
    remaining_gets: fillResult.remainingGets,
    remaining_pays: fillResult.remainingPays,

    // Execution details
    offer_created: fillResult.offerCreated,
    created_offer_sequence: fillResult.createdOfferSequence,
    offers_consumed: fillResult.offersConsumed,
    trades_executed: fillResult.tradesExecuted.length,
  };

  // Add trade details if any
  if (fillResult.tradesExecuted.length > 0) {
    payload.trades = fillResult.tradesExecuted.map((trade) => ({
      maker_account: trade.makerAccount,
      maker_sequence: trade.makerSequence,
      taker_got: trade.takerGot,
      taker_paid: trade.takerPaid,
    }));
  }

  // Add offer sequence being replaced if present
  if (tx.OfferSequence !== undefined) {
    payload.replaces_offer_sequence = tx.OfferSequence;
  }

  const accounts = extractAccounts(tx);

  // Add maker accounts from trades
  for (const trade of fillResult.tradesExecuted) {
    if (!accounts.includes(trade.makerAccount)) {
      accounts.push(trade.makerAccount);
    }
  }

  logger.debug(
    {
      txHash: tx.hash,
      eventType,
      account: tx.Account,
      pair: tradingPair?.pairString,
      fillType: fillResult.fillType,
      fillPct: fillResult.fillPercentage,
    },
    'OfferCreate parsed'
  );

  return {
    eventType,
    accounts,
    payload,
  };
}

/**
 * Parse OfferCancel transaction
 */
export function parseOfferCancel(tx: RawTransaction): ParseResult {
  const payload: Record<string, unknown> = {
    account: tx.Account,
    offer_sequence: tx.OfferSequence,
  };

  // Try to extract details of the cancelled offer from affected nodes
  if (tx.meta?.AffectedNodes) {
    for (const node of tx.meta.AffectedNodes) {
      if (node.DeletedNode?.LedgerEntryType === 'Offer') {
        const fields = node.DeletedNode.FinalFields as Record<string, unknown>;

        if (fields.Account === tx.Account && fields.Sequence === tx.OfferSequence) {
          payload.cancelled_offer = {
            taker_gets: extractAmountFromField(fields.TakerGets),
            taker_pays: extractAmountFromField(fields.TakerPays),
            expiration: fields.Expiration
              ? rippleTimeToISO(fields.Expiration as number)
              : null,
          };

          // Extract trading pair
          const tradingPair = extractTradingPair(
            fields.TakerGets as string | IssuedCurrencyAmount,
            fields.TakerPays as string | IssuedCurrencyAmount
          );
          if (tradingPair) {
            payload.trading_pair = tradingPair.pairString;
          }

          break;
        }
      }
    }
  }

  logger.debug(
    { txHash: tx.hash, account: tx.Account, sequence: tx.OfferSequence },
    'OfferCancel parsed'
  );

  return {
    eventType: 'dex.offer_cancelled',
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse any DEX transaction
 */
export function parseDexTransaction(tx: RawTransaction): ParseResult | null {
  switch (tx.TransactionType) {
    case 'OfferCreate':
      return parseOfferCreate(tx);
    case 'OfferCancel':
      return parseOfferCancel(tx);
    default:
      return null;
  }
}

/**
 * Check if transaction is DEX-related
 */
export function isDexTransaction(tx: RawTransaction): boolean {
  return tx.TransactionType === 'OfferCreate' || tx.TransactionType === 'OfferCancel';
}

/**
 * Extract offer details from transaction
 */
export function extractOfferDetails(tx: RawTransaction): OfferDetails | null {
  if (tx.TransactionType !== 'OfferCreate') {
    return null;
  }

  const flags = tx.Flags ?? 0;
  const offerFlags = getOfferFlags(flags);

  return {
    account: tx.Account,
    sequence: tx.Sequence!,
    takerGets: normalizeAmount(tx.TakerGets),
    takerPays: normalizeAmount(tx.TakerPays),
    expiration: tx.Expiration ? rippleTimeToISO(tx.Expiration) : null,
    flags,
    passive: offerFlags.passive,
    immediateOrCancel: offerFlags.immediateOrCancel,
    fillOrKill: offerFlags.fillOrKill,
    sell: offerFlags.sell,
  };
}

/**
 * Validate OfferCreate transaction
 */
export function validateOfferCreate(tx: RawTransaction): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!tx.Account) {
    errors.push('Missing Account');
  }

  if (tx.TakerGets === undefined) {
    errors.push('Missing TakerGets');
  }

  if (tx.TakerPays === undefined) {
    errors.push('Missing TakerPays');
  }

  // Amount validation
  const takerGets = normalizeAmount(tx.TakerGets);
  const takerPays = normalizeAmount(tx.TakerPays);

  if (takerGets && parseFloat(takerGets.value) <= 0) {
    errors.push('TakerGets must be positive');
  }

  if (takerPays && parseFloat(takerPays.value) <= 0) {
    errors.push('TakerPays must be positive');
  }

  // Check for same currency
  if (takerGets && takerPays) {
    if (
      takerGets.currency === takerPays.currency &&
      takerGets.issuer === takerPays.issuer
    ) {
      errors.push('Cannot trade same asset');
    }
  }

  // Flag conflicts
  const flags = tx.Flags ?? 0;
  if ((flags & OfferCreateFlags.tfImmediateOrCancel) && (flags & OfferCreateFlags.tfFillOrKill)) {
    warnings.push('Both ImmediateOrCancel and FillOrKill flags set');
  }

  // Expiration validation
  if (tx.Expiration) {
    const expirationTime = tx.Expiration + 946684800; // Add Ripple epoch
    const now = Date.now() / 1000;
    if (expirationTime < now) {
      warnings.push('Offer expiration is in the past');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get offer summary for logging/display
 */
export function getOfferSummary(tx: RawTransaction): string {
  if (tx.TransactionType === 'OfferCancel') {
    return `${tx.Account} cancel offer #${tx.OfferSequence}`;
  }

  const takerGets = normalizeAmount(tx.TakerGets);
  const takerPays = normalizeAmount(tx.TakerPays);

  if (!takerGets || !takerPays) {
    return `${tx.Account}: OfferCreate (invalid)`;
  }

  const side = determineOrderBookSide(tx.TakerGets, tx.TakerPays);
  const pair = extractTradingPair(tx.TakerGets, tx.TakerPays);

  return `${tx.Account} ${side} ${takerGets.value} ${takerGets.currency} @ ${pair?.pairString ?? 'unknown'}`;
}

/**
 * Check if offer matches filter criteria
 */
export function matchesOfferFilter(
  tx: RawTransaction,
  filter: {
    account?: string;
    baseCurrency?: string;
    quoteCurrency?: string;
    minAmount?: number;
    maxAmount?: number;
    side?: OrderBookSide;
    onlyFilled?: boolean;
    onlyCreated?: boolean;
  }
): boolean {
  if (tx.TransactionType !== 'OfferCreate') {
    return false;
  }

  // Account filter
  if (filter.account && tx.Account !== filter.account) {
    return false;
  }

  const tradingPair = extractTradingPair(tx.TakerGets, tx.TakerPays);
  const takerGets = normalizeAmount(tx.TakerGets);

  // Currency filters
  if (filter.baseCurrency && tradingPair?.base.currency !== filter.baseCurrency) {
    return false;
  }
  if (filter.quoteCurrency && tradingPair?.quote.currency !== filter.quoteCurrency) {
    return false;
  }

  // Side filter
  if (filter.side) {
    const side = determineOrderBookSide(tx.TakerGets, tx.TakerPays);
    if (side !== filter.side) {
      return false;
    }
  }

  // Amount filter
  if (takerGets) {
    const amount = parseFloat(takerGets.value);
    if (filter.minAmount !== undefined && amount < filter.minAmount) {
      return false;
    }
    if (filter.maxAmount !== undefined && amount > filter.maxAmount) {
      return false;
    }
  }

  // Fill status filters
  if (filter.onlyFilled || filter.onlyCreated) {
    const fillResult = calculateFillResult(tx, takerGets, normalizeAmount(tx.TakerPays));

    if (filter.onlyFilled && fillResult.fillType === 'none') {
      return false;
    }
    if (filter.onlyCreated && !fillResult.offerCreated) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Export
// =============================================================================

export default {
  parseOfferCreate,
  parseOfferCancel,
  parseDexTransaction,
  isDexTransaction,
  extractOfferDetails,
  validateOfferCreate,
  getOfferSummary,
  getOfferFlags,
  extractTradingPair,
  calculateExchangeRate,
  determineOrderBookSide,
  matchesOfferFilter,
};
