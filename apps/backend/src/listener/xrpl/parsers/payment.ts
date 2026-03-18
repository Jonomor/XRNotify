/**
 * @fileoverview XRNotify Payment Transaction Parser
 * Parses XRPL Payment transactions into normalized events.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/parsers/payment
 */

import { createModuleLogger } from '../../../core/logger.js';
import {
  type RawTransaction,
  type IssuedCurrencyAmount,
  type LedgerContext,
  type ParseResult,
  type NormalizedAmount,
  normalizeAmount,
  isXrpAmount,
  decodeCurrency,
  extractAccounts,
} from '../normalize.js';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('parser-payment');

/**
 * Payment details extracted from transaction
 */
export interface PaymentDetails {
  source: string;
  destination: string;
  amount: NormalizedAmount | null;
  deliveredAmount: NormalizedAmount | null;
  sendMax: NormalizedAmount | null;
  sourceTag: number | null;
  destinationTag: number | null;
  invoiceId: string | null;
  paths: PaymentPath[] | null;
  memos: PaymentMemo[] | null;
  fee: NormalizedAmount | null;
  isPartialPayment: boolean;
  isNoDirectRipple: boolean;
  isLimitQuality: boolean;
}

/**
 * Payment path
 */
export interface PaymentPath {
  currency: string;
  issuer: string | null;
  account: string | null;
}

/**
 * Payment memo
 */
export interface PaymentMemo {
  type: string | null;
  data: string | null;
  format: string | null;
}

/**
 * Path finding result
 */
export interface PathInfo {
  pathCount: number;
  intermediaries: string[];
  currencies: string[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Payment flags
 */
const PaymentFlags = {
  tfNoDirectRipple: 0x00010000,
  tfPartialPayment: 0x00020000,
  tfLimitQuality: 0x00040000,
} as const;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Decode hex string to UTF-8
 */
function hexToUtf8(hex: string | undefined): string | null {
  if (!hex) {
    return null;
  }
  try {
    return Buffer.from(hex, 'hex').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Parse memos from transaction
 */
function parseMemos(
  memos: RawTransaction['Memos']
): PaymentMemo[] | null {
  if (!memos || memos.length === 0) {
    return null;
  }

  return memos.map((m) => ({
    type: hexToUtf8(m.Memo.MemoType),
    data: hexToUtf8(m.Memo.MemoData),
    format: hexToUtf8(m.Memo.MemoFormat),
  }));
}

/**
 * Parse paths from transaction
 */
function parsePaths(
  paths: Array<Array<{ currency?: string; issuer?: string; account?: string }>> | undefined
): PaymentPath[] | null {
  if (!paths || paths.length === 0) {
    return null;
  }

  const result: PaymentPath[] = [];

  for (const pathArray of paths) {
    for (const step of pathArray) {
      result.push({
        currency: step.currency ? decodeCurrency(step.currency) : 'XRP',
        issuer: step.issuer ?? null,
        account: step.account ?? null,
      });
    }
  }

  return result.length > 0 ? result : null;
}

/**
 * Extract path information
 */
function extractPathInfo(
  paths: Array<Array<{ currency?: string; issuer?: string; account?: string }>> | undefined
): PathInfo | null {
  if (!paths || paths.length === 0) {
    return null;
  }

  const intermediaries = new Set<string>();
  const currencies = new Set<string>();

  for (const pathArray of paths) {
    for (const step of pathArray) {
      if (step.account) {
        intermediaries.add(step.account);
      }
      if (step.currency) {
        currencies.add(decodeCurrency(step.currency));
      }
    }
  }

  return {
    pathCount: paths.length,
    intermediaries: [...intermediaries],
    currencies: [...currencies],
  };
}

/**
 * Calculate payment efficiency (delivered/sent ratio)
 */
function calculateEfficiency(
  sentAmount: NormalizedAmount | null,
  deliveredAmount: NormalizedAmount | null
): number | null {
  if (!sentAmount || !deliveredAmount) {
    return null;
  }

  // Only calculate for same currency
  if (sentAmount.currency !== deliveredAmount.currency) {
    return null;
  }

  const sent = parseFloat(sentAmount.value);
  const delivered = parseFloat(deliveredAmount.value);

  if (sent === 0) {
    return null;
  }

  return Math.round((delivered / sent) * 10000) / 100; // 2 decimal places percentage
}

/**
 * Detect cross-currency payment
 */
function isCrossCurrency(tx: RawTransaction): boolean {
  const amount = tx.Amount;
  const sendMax = tx.SendMax;

  if (!sendMax) {
    return false;
  }

  const amountIsXrp = isXrpAmount(amount);
  const sendMaxIsXrp = isXrpAmount(sendMax);

  if (amountIsXrp !== sendMaxIsXrp) {
    return true;
  }

  if (!amountIsXrp && !sendMaxIsXrp) {
    const amountCurrency = (amount as IssuedCurrencyAmount).currency;
    const sendMaxCurrency = (sendMax as IssuedCurrencyAmount).currency;
    return amountCurrency !== sendMaxCurrency;
  }

  return false;
}

/**
 * Detect self-payment
 */
function isSelfPayment(tx: RawTransaction): boolean {
  return tx.Account === tx.Destination;
}

/**
 * Get payment direction relative to an account
 */
export function getPaymentDirection(
  tx: RawTransaction,
  account: string
): 'sent' | 'received' | 'self' | 'none' {
  if (tx.Account === account && tx.Destination === account) {
    return 'self';
  }
  if (tx.Account === account) {
    return 'sent';
  }
  if (tx.Destination === account) {
    return 'received';
  }
  return 'none';
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse Payment transaction
 */
export function parsePayment(tx: RawTransaction): ParseResult {
  const flags = tx.Flags ?? 0;

  // Extract amounts
  const amount = normalizeAmount(tx.Amount);
  const deliveredAmount = normalizeAmount(tx.meta?.delivered_amount);
  const sendMax = normalizeAmount(tx.SendMax);
  const fee = normalizeAmount(tx.Fee);

  // Determine event type
  const isXrp = isXrpAmount(tx.Amount);
  const eventType: EventType = isXrp ? 'payment.xrp' : 'payment.issued';

  // Parse additional data
  const memos = parseMemos(tx.Memos);
  const paths = parsePaths(tx.Paths as Array<Array<{ currency?: string; issuer?: string; account?: string }>>);
  const pathInfo = extractPathInfo(tx.Paths as Array<Array<{ currency?: string; issuer?: string; account?: string }>>);

  // Build payload
  const payload: Record<string, unknown> = {
    // Core payment fields
    source: tx.Account,
    destination: tx.Destination,
    amount: amount,
    delivered_amount: deliveredAmount,

    // Optional fields
    send_max: sendMax,
    source_tag: tx.SourceTag ?? null,
    destination_tag: tx.DestinationTag ?? null,
    invoice_id: tx.InvoiceID ?? null,

    // Fee
    fee: fee,

    // Flags
    is_partial_payment: !!(flags & PaymentFlags.tfPartialPayment),
    is_no_direct_ripple: !!(flags & PaymentFlags.tfNoDirectRipple),
    is_limit_quality: !!(flags & PaymentFlags.tfLimitQuality),

    // Derived fields
    is_cross_currency: isCrossCurrency(tx),
    is_self_payment: isSelfPayment(tx),
  };

  // Add paths info if present
  if (pathInfo) {
    payload.path_info = pathInfo;
  }

  // Add memos if present
  if (memos && memos.length > 0) {
    payload.memos = memos;
  }

  // Calculate efficiency for partial payments
  if (flags & PaymentFlags.tfPartialPayment) {
    const efficiency = calculateEfficiency(amount, deliveredAmount);
    if (efficiency !== null) {
      payload.efficiency_percent = efficiency;
    }
  }

  // Extract all accounts
  const accounts = extractAccounts(tx);

  logger.debug(
    {
      txHash: tx.hash,
      eventType,
      source: tx.Account,
      destination: tx.Destination,
      isXrp,
      isCrossCurrency: payload.is_cross_currency,
    },
    'Payment parsed'
  );

  return {
    eventType,
    accounts,
    payload,
  };
}

/**
 * Extract payment details (for detailed analysis)
 */
export function extractPaymentDetails(tx: RawTransaction): PaymentDetails {
  const flags = tx.Flags ?? 0;

  return {
    source: tx.Account,
    destination: tx.Destination!,
    amount: normalizeAmount(tx.Amount),
    deliveredAmount: normalizeAmount(tx.meta?.delivered_amount),
    sendMax: normalizeAmount(tx.SendMax),
    sourceTag: tx.SourceTag ?? null,
    destinationTag: tx.DestinationTag ?? null,
    invoiceId: tx.InvoiceID as string ?? null,
    paths: parsePaths(tx.Paths as Array<Array<{ currency?: string; issuer?: string; account?: string }>>),
    memos: parseMemos(tx.Memos),
    fee: normalizeAmount(tx.Fee),
    isPartialPayment: !!(flags & PaymentFlags.tfPartialPayment),
    isNoDirectRipple: !!(flags & PaymentFlags.tfNoDirectRipple),
    isLimitQuality: !!(flags & PaymentFlags.tfLimitQuality),
  };
}

/**
 * Validate payment transaction
 */
export function validatePayment(tx: RawTransaction): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!tx.Account) {
    errors.push('Missing Account');
  }

  if (!tx.Destination) {
    errors.push('Missing Destination');
  }

  if (tx.Amount === undefined) {
    errors.push('Missing Amount');
  }

  // Amount validation
  if (tx.Amount !== undefined) {
    if (isXrpAmount(tx.Amount)) {
      const drops = BigInt(tx.Amount);
      if (drops < 0) {
        errors.push('Negative XRP amount');
      }
    } else {
      const value = parseFloat((tx.Amount as IssuedCurrencyAmount).value);
      if (isNaN(value)) {
        errors.push('Invalid issued currency amount');
      }
    }
  }

  // SendMax validation for cross-currency
  if (tx.SendMax !== undefined && tx.Amount !== undefined) {
    const amountIsXrp = isXrpAmount(tx.Amount);
    const sendMaxIsXrp = isXrpAmount(tx.SendMax);

    if (amountIsXrp && sendMaxIsXrp) {
      const amount = BigInt(tx.Amount);
      const sendMax = BigInt(tx.SendMax);
      if (sendMax < amount) {
        errors.push('SendMax less than Amount for XRP payment');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get payment summary for logging/display
 */
export function getPaymentSummary(tx: RawTransaction): string {
  const amount = normalizeAmount(tx.Amount);
  const delivered = normalizeAmount(tx.meta?.delivered_amount);

  const amountStr = amount
    ? `${amount.value} ${amount.currency}`
    : 'unknown';

  const deliveredStr = delivered
    ? `${delivered.value} ${delivered.currency}`
    : amountStr;

  return `${tx.Account} → ${tx.Destination}: ${deliveredStr}`;
}

/**
 * Check if payment matches filter criteria
 */
export function matchesPaymentFilter(
  tx: RawTransaction,
  filter: {
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
    sourceAccount?: string;
    destinationAccount?: string;
    isXrpOnly?: boolean;
    isIssuedOnly?: boolean;
  }
): boolean {
  // Currency type filter
  const isXrp = isXrpAmount(tx.Amount);
  if (filter.isXrpOnly && !isXrp) return false;
  if (filter.isIssuedOnly && isXrp) return false;

  // Account filters
  if (filter.sourceAccount && tx.Account !== filter.sourceAccount) return false;
  if (filter.destinationAccount && tx.Destination !== filter.destinationAccount) return false;

  // Amount filters
  const amount = normalizeAmount(tx.meta?.delivered_amount ?? tx.Amount);
  if (amount) {
    const value = parseFloat(amount.value);

    // Currency filter
    if (filter.currency && amount.currency !== filter.currency) return false;

    // Amount range filter
    if (filter.minAmount !== undefined && value < filter.minAmount) return false;
    if (filter.maxAmount !== undefined && value > filter.maxAmount) return false;
  }

  return true;
}

// =============================================================================
// Export
// =============================================================================

export default {
  parsePayment,
  extractPaymentDetails,
  validatePayment,
  getPaymentSummary,
  getPaymentDirection,
  matchesPaymentFilter,
};
