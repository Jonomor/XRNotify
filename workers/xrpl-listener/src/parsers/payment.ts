// =============================================================================
// XRNotify XRPL Listener - Payment Parser
// =============================================================================
// Parses XRPL Payment transactions into normalized events
// =============================================================================

import type { EventType } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PaymentTransaction {
  TransactionType: 'Payment';
  Account: string;
  Destination: string;
  Amount: Amount;
  SendMax?: Amount;
  DeliverMin?: Amount;
  DestinationTag?: number;
  SourceTag?: number;
  InvoiceID?: string;
  Paths?: PathSet;
  Flags?: number;
}

export type Amount = string | IssuedCurrencyAmount;

export interface IssuedCurrencyAmount {
  currency: string;
  issuer: string;
  value: string;
}

export type PathSet = Path[];
export type Path = PathStep[];

export interface PathStep {
  account?: string;
  currency?: string;
  issuer?: string;
}

export interface PaymentMeta {
  TransactionResult: string;
  delivered_amount?: Amount;
  AffectedNodes?: unknown[];
}

export interface ParsedPaymentEvent {
  eventType: EventType;
  payload: PaymentPayload;
}

export interface PaymentPayload {
  /** Sender account */
  account: string;
  /** Recipient account */
  destination: string;
  /** Amount delivered (in drops for XRP, or value for issued currency) */
  amount: string;
  /** Currency code (XRP or 3-char/hex code) */
  currency: string;
  /** Issuer address (undefined for XRP) */
  issuer?: string;
  /** Original send amount if different from delivered */
  send_amount?: string;
  /** Destination tag if present */
  destination_tag?: number;
  /** Source tag if present */
  source_tag?: number;
  /** Whether this was a partial payment */
  partial_payment: boolean;
  /** Whether path-finding was used */
  path_payment: boolean;
}

// -----------------------------------------------------------------------------
// Payment Flags
// -----------------------------------------------------------------------------

export const PaymentFlags = {
  /** Allow partial payment (tfPartialPayment) */
  PARTIAL_PAYMENT: 0x00020000,
  /** Disallow rippling through trust lines (tfNoDirectRipple) */
  NO_DIRECT_RIPPLE: 0x00010000,
  /** Limit quality of paths (tfLimitQuality) */
  LIMIT_QUALITY: 0x00040000,
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
 * Check if amount is issued currency
 */
export function isIssuedAmount(amount: Amount): amount is IssuedCurrencyAmount {
  return typeof amount === 'object' && 'currency' in amount;
}

/**
 * Get currency code from amount
 */
export function getCurrency(amount: Amount): string {
  if (isXrpAmount(amount)) {
    return 'XRP';
  }
  return amount.currency;
}

/**
 * Get value from amount
 */
export function getValue(amount: Amount): string {
  if (isXrpAmount(amount)) {
    return amount; // drops
  }
  return amount.value;
}

/**
 * Get issuer from amount (undefined for XRP)
 */
export function getIssuer(amount: Amount): string | undefined {
  if (isXrpAmount(amount)) {
    return undefined;
  }
  return amount.issuer;
}

/**
 * Convert XRP drops to decimal string
 */
export function dropsToXrp(drops: string): string {
  const dropsNum = BigInt(drops);
  const xrp = Number(dropsNum) / 1_000_000;
  return xrp.toString();
}

/**
 * Format amount for display
 */
export function formatAmount(amount: Amount): string {
  if (isXrpAmount(amount)) {
    return `${dropsToXrp(amount)} XRP`;
  }
  return `${amount.value} ${amount.currency}`;
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse a Payment transaction into normalized events
 */
export function parsePayment(
  tx: PaymentTransaction,
  meta?: PaymentMeta
): ParsedPaymentEvent[] {
  // Determine delivered amount (use meta if available for partial payments)
  const deliveredAmount = meta?.delivered_amount ?? tx.Amount;
  
  // Determine if this is XRP or issued currency
  const isXrp = isXrpAmount(deliveredAmount);
  const eventType: EventType = isXrp ? 'payment.xrp' : 'payment.issued';
  
  // Check flags
  const flags = tx.Flags ?? 0;
  const isPartialPayment = (flags & PaymentFlags.PARTIAL_PAYMENT) !== 0;
  const hasPath = tx.Paths !== undefined && tx.Paths.length > 0;
  
  // Build payload
  const payload: PaymentPayload = {
    account: tx.Account,
    destination: tx.Destination,
    amount: getValue(deliveredAmount),
    currency: getCurrency(deliveredAmount),
    issuer: getIssuer(deliveredAmount),
    partial_payment: isPartialPayment,
    path_payment: hasPath,
  };
  
  // Add optional fields
  if (tx.DestinationTag !== undefined) {
    payload.destination_tag = tx.DestinationTag;
  }
  
  if (tx.SourceTag !== undefined) {
    payload.source_tag = tx.SourceTag;
  }
  
  // If partial payment, include original send amount
  if (isPartialPayment && tx.SendMax) {
    payload.send_amount = getValue(tx.SendMax);
  }
  
  return [{
    eventType,
    payload,
  }];
}

// -----------------------------------------------------------------------------
// Specialized Parsers
// -----------------------------------------------------------------------------

/**
 * Parse cross-currency payment details
 */
export function parseCrossCurrencyPayment(
  tx: PaymentTransaction,
  meta?: PaymentMeta
): {
  sourceCurrency: string;
  sourceAmount: string;
  destinationCurrency: string;
  destinationAmount: string;
  exchangeRate?: number;
} | null {
  if (!tx.SendMax || !meta?.delivered_amount) {
    return null;
  }
  
  const sourceAmount = getValue(tx.SendMax);
  const sourceCurrency = getCurrency(tx.SendMax);
  const destAmount = getValue(meta.delivered_amount);
  const destCurrency = getCurrency(meta.delivered_amount);
  
  // Only relevant if currencies differ
  if (sourceCurrency === destCurrency) {
    return null;
  }
  
  // Calculate exchange rate if both are numeric
  let exchangeRate: number | undefined;
  try {
    const sourceNum = parseFloat(sourceCurrency === 'XRP' ? dropsToXrp(sourceAmount) : sourceAmount);
    const destNum = parseFloat(destCurrency === 'XRP' ? dropsToXrp(destAmount) : destAmount);
    if (sourceNum > 0) {
      exchangeRate = destNum / sourceNum;
    }
  } catch {
    // Ignore calculation errors
  }
  
  return {
    sourceCurrency,
    sourceAmount,
    destinationCurrency: destCurrency,
    destinationAmount: destAmount,
    exchangeRate,
  };
}

/**
 * Extract path currencies from a payment
 */
export function extractPathCurrencies(paths?: PathSet): string[] {
  if (!paths) return [];
  
  const currencies = new Set<string>();
  
  for (const path of paths) {
    for (const step of path) {
      if (step.currency) {
        currencies.add(step.currency);
      }
    }
  }
  
  return Array.from(currencies);
}

/**
 * Check if payment is a self-payment (same account)
 */
export function isSelfPayment(tx: PaymentTransaction): boolean {
  return tx.Account === tx.Destination;
}

/**
 * Check if payment involves rippling (issued currency through trust lines)
 */
export function involvesRippling(tx: PaymentTransaction): boolean {
  // Has paths or is issued currency payment
  return tx.Paths !== undefined || isIssuedAmount(tx.Amount);
}
