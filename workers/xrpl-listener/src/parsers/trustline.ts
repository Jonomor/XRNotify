// =============================================================================
// XRNotify XRPL Listener - Trustline Parser
// =============================================================================
// Parses XRPL TrustSet transactions into normalized events
// =============================================================================

import type { EventType } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TrustSetTransaction {
  TransactionType: 'TrustSet';
  Account: string;
  LimitAmount: LimitAmount;
  QualityIn?: number;
  QualityOut?: number;
  Flags?: number;
}

export interface LimitAmount {
  currency: string;
  issuer: string;
  value: string;
}

export interface TrustSetMeta {
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

export interface ParsedTrustlineEvent {
  eventType: EventType;
  payload: TrustlinePayload;
}

export interface TrustlinePayload {
  /** Account setting the trust line */
  account: string;
  /** Currency code */
  currency: string;
  /** Issuer account */
  issuer: string;
  /** Trust limit */
  limit: string;
  /** Previous limit (for modifications) */
  previous_limit?: string;
  /** Quality in (for rippling) */
  quality_in?: number;
  /** Quality out (for rippling) */
  quality_out?: number;
  /** Whether rippling is enabled */
  no_ripple?: boolean;
  /** Whether trust line is frozen */
  frozen?: boolean;
  /** Whether authorized by issuer */
  authorized?: boolean;
  /** Current balance on the trust line */
  balance?: string;
}

// -----------------------------------------------------------------------------
// TrustSet Flags
// -----------------------------------------------------------------------------

export const TrustSetFlags = {
  /** Authorize the other party to hold tokens */
  SET_AUTH: 0x00010000,
  /** Enable No Ripple flag */
  SET_NO_RIPPLE: 0x00020000,
  /** Disable No Ripple flag */
  CLEAR_NO_RIPPLE: 0x00040000,
  /** Freeze the trust line */
  SET_FREEZE: 0x00100000,
  /** Unfreeze the trust line */
  CLEAR_FREEZE: 0x00200000,
} as const;

// -----------------------------------------------------------------------------
// RippleState Flags (on ledger object)
// -----------------------------------------------------------------------------

export const RippleStateFlags = {
  /** Low account has authorized high account */
  LOW_AUTH: 0x00010000,
  /** High account has authorized low account */
  HIGH_AUTH: 0x00020000,
  /** Low account has No Ripple flag set */
  LOW_NO_RIPPLE: 0x00040000,
  /** High account has No Ripple flag set */
  HIGH_NO_RIPPLE: 0x00080000,
  /** Low account has frozen trust line */
  LOW_FREEZE: 0x00100000,
  /** High account has frozen trust line */
  HIGH_FREEZE: 0x00200000,
} as const;

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse TrustSet transactions into normalized events
 */
export function parseTrustline(
  tx: TrustSetTransaction,
  meta?: TrustSetMeta
): ParsedTrustlineEvent[] {
  // Determine event type from meta (created, modified, or deleted)
  const { eventType, rippleState } = determineEventType(meta);

  // Build base payload
  const payload: TrustlinePayload = {
    account: tx.Account,
    currency: tx.LimitAmount.currency,
    issuer: tx.LimitAmount.issuer,
    limit: tx.LimitAmount.value,
  };

  // Add quality settings if present
  if (tx.QualityIn !== undefined) {
    payload.quality_in = tx.QualityIn;
  }
  if (tx.QualityOut !== undefined) {
    payload.quality_out = tx.QualityOut;
  }

  // Parse flags
  const flags = tx.Flags ?? 0;
  if (flags & TrustSetFlags.SET_NO_RIPPLE) {
    payload.no_ripple = true;
  } else if (flags & TrustSetFlags.CLEAR_NO_RIPPLE) {
    payload.no_ripple = false;
  }

  if (flags & TrustSetFlags.SET_FREEZE) {
    payload.frozen = true;
  } else if (flags & TrustSetFlags.CLEAR_FREEZE) {
    payload.frozen = false;
  }

  if (flags & TrustSetFlags.SET_AUTH) {
    payload.authorized = true;
  }

  // Extract additional info from RippleState
  if (rippleState) {
    const extracted = extractRippleStateInfo(tx.Account, rippleState);
    if (extracted.balance !== undefined) {
      payload.balance = extracted.balance;
    }
    if (extracted.previousLimit !== undefined) {
      payload.previous_limit = extracted.previousLimit;
    }
    if (extracted.noRipple !== undefined && payload.no_ripple === undefined) {
      payload.no_ripple = extracted.noRipple;
    }
    if (extracted.frozen !== undefined && payload.frozen === undefined) {
      payload.frozen = extracted.frozen;
    }
  }

  return [{
    eventType,
    payload,
  }];
}

// -----------------------------------------------------------------------------
// Event Type Detection
// -----------------------------------------------------------------------------

interface EventTypeResult {
  eventType: EventType;
  rippleState?: Record<string, unknown>;
}

function determineEventType(meta?: TrustSetMeta): EventTypeResult {
  if (!meta?.AffectedNodes) {
    return { eventType: 'trustline.modified' };
  }

  for (const node of meta.AffectedNodes) {
    // New trust line created
    if ('CreatedNode' in node) {
      const cn = node.CreatedNode;
      if (cn.LedgerEntryType === 'RippleState') {
        return {
          eventType: 'trustline.created',
          rippleState: cn.NewFields as Record<string, unknown> | undefined,
        };
      }
    }

    // Trust line deleted (limit set to 0 with 0 balance)
    if ('DeletedNode' in node) {
      const dn = node.DeletedNode;
      if (dn.LedgerEntryType === 'RippleState') {
        return {
          eventType: 'trustline.deleted',
          rippleState: dn.FinalFields as Record<string, unknown> | undefined,
        };
      }
    }

    // Trust line modified
    if ('ModifiedNode' in node) {
      const mn = node.ModifiedNode;
      if (mn.LedgerEntryType === 'RippleState') {
        return {
          eventType: 'trustline.modified',
          rippleState: mn.FinalFields as Record<string, unknown> | undefined,
        };
      }
    }
  }

  return { eventType: 'trustline.modified' };
}

// -----------------------------------------------------------------------------
// RippleState Extraction
// -----------------------------------------------------------------------------

interface RippleStateInfo {
  balance?: string;
  previousLimit?: string;
  noRipple?: boolean;
  frozen?: boolean;
}

function extractRippleStateInfo(
  account: string,
  fields: Record<string, unknown>
): RippleStateInfo {
  const result: RippleStateInfo = {};

  // Balance is stored from the perspective of the low account
  // Positive = low owes high, Negative = high owes low
  const balance = fields.Balance as { value?: string } | undefined;
  if (balance?.value) {
    result.balance = balance.value;
  }

  // Determine if this account is high or low
  const highLimit = fields.HighLimit as { issuer?: string; value?: string } | undefined;
  const lowLimit = fields.LowLimit as { issuer?: string; value?: string } | undefined;

  const isHighAccount = highLimit?.issuer === account;

  // Get the limit from this account's perspective
  if (isHighAccount && highLimit?.value) {
    result.previousLimit = highLimit.value;
  } else if (!isHighAccount && lowLimit?.value) {
    result.previousLimit = lowLimit.value;
  }

  // Check flags
  const flags = fields.Flags as number | undefined;
  if (flags !== undefined) {
    if (isHighAccount) {
      result.noRipple = (flags & RippleStateFlags.HIGH_NO_RIPPLE) !== 0;
      result.frozen = (flags & RippleStateFlags.HIGH_FREEZE) !== 0;
    } else {
      result.noRipple = (flags & RippleStateFlags.LOW_NO_RIPPLE) !== 0;
      result.frozen = (flags & RippleStateFlags.LOW_FREEZE) !== 0;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Check if trust line allows rippling
 */
export function allowsRippling(noRipple?: boolean): boolean {
  return noRipple !== true;
}

/**
 * Check if trust line is removing trust (limit = 0)
 */
export function isRemovingTrust(limit: string): boolean {
  return limit === '0' || parseFloat(limit) === 0;
}

/**
 * Format currency code for display
 * Handles both 3-char codes and hex-encoded currencies
 */
export function formatCurrency(currency: string): string {
  // Standard 3-character currency code
  if (currency.length === 3) {
    return currency;
  }

  // Hex-encoded currency (40 characters)
  if (currency.length === 40) {
    try {
      // Try to decode as ASCII
      const bytes = Buffer.from(currency, 'hex');
      const decoded = bytes.toString('ascii').replace(/\0/g, '').trim();
      if (decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
        return decoded;
      }
    } catch {
      // Fall through to return original
    }
  }

  return currency;
}

/**
 * Get the counterparty (issuer from account's perspective)
 */
export function getCounterparty(
  account: string,
  highLimit: { issuer?: string } | undefined,
  lowLimit: { issuer?: string } | undefined
): string | null {
  if (highLimit?.issuer === account && lowLimit?.issuer) {
    return lowLimit.issuer;
  }
  if (lowLimit?.issuer === account && highLimit?.issuer) {
    return highLimit.issuer;
  }
  return null;
}

/**
 * Parse balance to determine who owes whom
 */
export function parseBalance(
  balance: string,
  account: string,
  highAccount: string
): { holder: string; owes: string; amount: string } {
  const value = parseFloat(balance);
  const absValue = Math.abs(value).toString();

  // Positive balance = low account owes high account
  // Negative balance = high account owes low account
  if (value >= 0) {
    return {
      holder: highAccount,
      owes: account === highAccount ? 'counterparty' : 'self',
      amount: absValue,
    };
  } else {
    return {
      holder: account === highAccount ? account : highAccount,
      owes: account === highAccount ? 'self' : 'counterparty',
      amount: absValue,
    };
  }
}
