/**
 * @fileoverview XRNotify TrustLine Transaction Parser
 * Parses XRPL TrustSet transactions into normalized events.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/parsers/trustline
 */

import { createModuleLogger } from '../../../core/logger.js';
import {
  type RawTransaction,
  type ParseResult,
  type AffectedNode,
  type IssuedCurrencyAmount,
  extractAccounts,
  decodeCurrency,
} from '../normalize.js';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('parser-trustline');

/**
 * Trust line details
 */
export interface TrustLineDetails {
  account: string;
  issuer: string;
  currency: string;
  limit: string;
  balance: string;
  qualityIn: number;
  qualityOut: number;
  noRipple: boolean;
  noRipplePeer: boolean;
  freeze: boolean;
  freezePeer: boolean;
  authorized: boolean;
  authorizedPeer: boolean;
}

/**
 * Trust line change
 */
export interface TrustLineChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

/**
 * Ripple state (trust line ledger entry)
 */
interface RippleStateFields {
  Balance?: IssuedCurrencyAmount;
  HighLimit?: IssuedCurrencyAmount;
  LowLimit?: IssuedCurrencyAmount;
  Flags?: number;
  HighNode?: string;
  LowNode?: string;
  HighQualityIn?: number;
  HighQualityOut?: number;
  LowQualityIn?: number;
  LowQualityOut?: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * TrustSet flags
 */
const TrustSetFlags = {
  tfSetfAuth: 0x00010000,
  tfSetNoRipple: 0x00020000,
  tfClearNoRipple: 0x00040000,
  tfSetFreeze: 0x00100000,
  tfClearFreeze: 0x00200000,
} as const;

/**
 * RippleState flags
 */
const RippleStateFlags = {
  lsfLowReserve: 0x00010000,
  lsfHighReserve: 0x00020000,
  lsfLowAuth: 0x00040000,
  lsfHighAuth: 0x00080000,
  lsfLowNoRipple: 0x00100000,
  lsfHighNoRipple: 0x00200000,
  lsfLowFreeze: 0x00400000,
  lsfHighFreeze: 0x00800000,
} as const;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine if account is high or low in the trust line
 * 
 * In XRPL, the account with the numerically higher address is "High"
 */
function isHighAccount(account: string, otherAccount: string): boolean {
  return account > otherAccount;
}

/**
 * Extract trust line state from RippleState fields
 */
function extractTrustLineState(
  fields: RippleStateFields,
  account: string
): TrustLineDetails | null {
  if (!fields.HighLimit || !fields.LowLimit) {
    return null;
  }

  const highAccount = fields.HighLimit.issuer;
  const lowAccount = fields.LowLimit.issuer;
  const isHigh = isHighAccount(account, account === highAccount ? lowAccount : highAccount);

  const flags = fields.Flags ?? 0;

  // Determine which side's values to use
  const limit = isHigh ? fields.HighLimit : fields.LowLimit;
  const peerLimit = isHigh ? fields.LowLimit : fields.HighLimit;

  // Balance is from low account's perspective
  const rawBalance = fields.Balance?.value ?? '0';
  const balance = isHigh ? (parseFloat(rawBalance) * -1).toString() : rawBalance;

  return {
    account,
    issuer: isHigh ? lowAccount : highAccount,
    currency: decodeCurrency(limit.currency),
    limit: limit.value,
    balance,
    qualityIn: isHigh ? (fields.HighQualityIn ?? 0) : (fields.LowQualityIn ?? 0),
    qualityOut: isHigh ? (fields.HighQualityOut ?? 0) : (fields.LowQualityOut ?? 0),
    noRipple: isHigh
      ? !!(flags & RippleStateFlags.lsfHighNoRipple)
      : !!(flags & RippleStateFlags.lsfLowNoRipple),
    noRipplePeer: isHigh
      ? !!(flags & RippleStateFlags.lsfLowNoRipple)
      : !!(flags & RippleStateFlags.lsfHighNoRipple),
    freeze: isHigh
      ? !!(flags & RippleStateFlags.lsfHighFreeze)
      : !!(flags & RippleStateFlags.lsfLowFreeze),
    freezePeer: isHigh
      ? !!(flags & RippleStateFlags.lsfLowFreeze)
      : !!(flags & RippleStateFlags.lsfHighFreeze),
    authorized: isHigh
      ? !!(flags & RippleStateFlags.lsfHighAuth)
      : !!(flags & RippleStateFlags.lsfLowAuth),
    authorizedPeer: isHigh
      ? !!(flags & RippleStateFlags.lsfLowAuth)
      : !!(flags & RippleStateFlags.lsfHighAuth),
  };
}

/**
 * Find RippleState changes in affected nodes
 */
function findRippleStateChanges(
  nodes: AffectedNode[]
): {
  created: RippleStateFields | null;
  deleted: RippleStateFields | null;
  modified: {
    previous: RippleStateFields | null;
    final: RippleStateFields | null;
  } | null;
  ledgerIndex: string | null;
} {
  let created: RippleStateFields | null = null;
  let deleted: RippleStateFields | null = null;
  let modified: { previous: RippleStateFields | null; final: RippleStateFields | null } | null = null;
  let ledgerIndex: string | null = null;

  for (const node of nodes) {
    if (node.CreatedNode?.LedgerEntryType === 'RippleState') {
      created = node.CreatedNode.NewFields as RippleStateFields;
      ledgerIndex = node.CreatedNode.LedgerIndex;
    }

    if (node.DeletedNode?.LedgerEntryType === 'RippleState') {
      deleted = node.DeletedNode.FinalFields as RippleStateFields;
      ledgerIndex = node.DeletedNode.LedgerIndex;
    }

    if (node.ModifiedNode?.LedgerEntryType === 'RippleState') {
      modified = {
        previous: node.ModifiedNode.PreviousFields as RippleStateFields | null,
        final: node.ModifiedNode.FinalFields as RippleStateFields | null,
      };
      ledgerIndex = node.ModifiedNode.LedgerIndex;
    }
  }

  return { created, deleted, modified, ledgerIndex };
}

/**
 * Calculate changes between trust line states
 */
function calculateChanges(
  previous: TrustLineDetails | null,
  current: TrustLineDetails | null
): TrustLineChange[] {
  const changes: TrustLineChange[] = [];

  if (!previous || !current) {
    return changes;
  }

  const fields: Array<keyof TrustLineDetails> = [
    'limit',
    'balance',
    'qualityIn',
    'qualityOut',
    'noRipple',
    'noRipplePeer',
    'freeze',
    'freezePeer',
    'authorized',
    'authorizedPeer',
  ];

  for (const field of fields) {
    if (previous[field] !== current[field]) {
      changes.push({
        field,
        previousValue: previous[field],
        newValue: current[field],
      });
    }
  }

  return changes;
}

/**
 * Determine event type based on trust line state
 */
function determineEventType(
  tx: RawTransaction,
  rippleStateChanges: ReturnType<typeof findRippleStateChanges>
): EventType {
  // Check for creation
  if (rippleStateChanges.created) {
    return 'trustline.created';
  }

  // Check for deletion
  if (rippleStateChanges.deleted) {
    return 'trustline.removed';
  }

  // Check limit amount
  const limitAmount = tx.LimitAmount;
  if (limitAmount && parseFloat(limitAmount.value) === 0) {
    // Zero limit typically indicates removal intent
    // But if the line still exists (modified), it's just a modification
    if (rippleStateChanges.modified) {
      return 'trustline.modified';
    }
    return 'trustline.removed';
  }

  return 'trustline.modified';
}

/**
 * Get trust set flags description
 */
export function getTrustSetFlags(flags: number): {
  setAuth: boolean;
  setNoRipple: boolean;
  clearNoRipple: boolean;
  setFreeze: boolean;
  clearFreeze: boolean;
} {
  return {
    setAuth: !!(flags & TrustSetFlags.tfSetfAuth),
    setNoRipple: !!(flags & TrustSetFlags.tfSetNoRipple),
    clearNoRipple: !!(flags & TrustSetFlags.tfClearNoRipple),
    setFreeze: !!(flags & TrustSetFlags.tfSetFreeze),
    clearFreeze: !!(flags & TrustSetFlags.tfClearFreeze),
  };
}

/**
 * Check if this is a trust line authorization
 */
function isAuthorization(tx: RawTransaction): boolean {
  return !!(tx.Flags ?? 0 & TrustSetFlags.tfSetfAuth);
}

/**
 * Check if this is a freeze operation
 */
function isFreezeOperation(tx: RawTransaction): boolean {
  const flags = tx.Flags ?? 0;
  return !!(flags & TrustSetFlags.tfSetFreeze) || !!(flags & TrustSetFlags.tfClearFreeze);
}

/**
 * Check if this is a rippling configuration
 */
function isRipplingConfig(tx: RawTransaction): boolean {
  const flags = tx.Flags ?? 0;
  return !!(flags & TrustSetFlags.tfSetNoRipple) || !!(flags & TrustSetFlags.tfClearNoRipple);
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse TrustSet transaction
 */
export function parseTrustSet(tx: RawTransaction): ParseResult {
  const limitAmount = tx.LimitAmount;
  const flags = tx.Flags ?? 0;
  const txFlags = getTrustSetFlags(flags);

  // Find RippleState changes
  const rippleStateChanges = tx.meta?.AffectedNodes
    ? findRippleStateChanges(tx.meta.AffectedNodes)
    : { created: null, deleted: null, modified: null, ledgerIndex: null };

  // Determine event type
  const eventType = determineEventType(tx, rippleStateChanges);

  // Build base payload
  const payload: Record<string, unknown> = {
    account: tx.Account,
    result_code: tx.meta?.TransactionResult,
    event_subtype: eventType.split('.')[1], // 'created', 'modified', or 'removed'
  };

  // Add limit amount details
  if (limitAmount) {
    payload.currency = decodeCurrency(limitAmount.currency);
    payload.issuer = limitAmount.issuer;
    payload.limit = limitAmount.value;
  }

  // Add quality settings
  if (tx.QualityIn !== undefined) {
    payload.quality_in = tx.QualityIn;
    payload.quality_in_percent = tx.QualityIn / 10000000; // Convert to percentage
  }

  if (tx.QualityOut !== undefined) {
    payload.quality_out = tx.QualityOut;
    payload.quality_out_percent = tx.QualityOut / 10000000;
  }

  // Add flags
  payload.flags = flags;
  payload.set_auth = txFlags.setAuth;
  payload.set_no_ripple = txFlags.setNoRipple;
  payload.clear_no_ripple = txFlags.clearNoRipple;
  payload.set_freeze = txFlags.setFreeze;
  payload.clear_freeze = txFlags.clearFreeze;

  // Categorize the operation
  payload.is_authorization = isAuthorization(tx);
  payload.is_freeze_operation = isFreezeOperation(tx);
  payload.is_rippling_config = isRipplingConfig(tx);

  // Add trust line state if available
  if (rippleStateChanges.created) {
    const state = extractTrustLineState(rippleStateChanges.created, tx.Account);
    if (state) {
      payload.trust_line = {
        balance: state.balance,
        limit: state.limit,
        no_ripple: state.noRipple,
        freeze: state.freeze,
        authorized: state.authorized,
      };
    }
    payload.ledger_index = rippleStateChanges.ledgerIndex;
  }

  if (rippleStateChanges.modified) {
    const previousState = rippleStateChanges.modified.previous
      ? extractTrustLineState(
          { ...rippleStateChanges.modified.final, ...rippleStateChanges.modified.previous } as RippleStateFields,
          tx.Account
        )
      : null;

    const currentState = rippleStateChanges.modified.final
      ? extractTrustLineState(rippleStateChanges.modified.final, tx.Account)
      : null;

    if (currentState) {
      payload.trust_line = {
        balance: currentState.balance,
        limit: currentState.limit,
        no_ripple: currentState.noRipple,
        freeze: currentState.freeze,
        authorized: currentState.authorized,
      };
    }

    // Calculate what changed
    const changes = calculateChanges(previousState, currentState);
    if (changes.length > 0) {
      payload.changes = changes;
    }

    payload.ledger_index = rippleStateChanges.ledgerIndex;
  }

  if (rippleStateChanges.deleted) {
    const state = extractTrustLineState(rippleStateChanges.deleted, tx.Account);
    if (state) {
      payload.final_balance = state.balance;
    }
    payload.ledger_index = rippleStateChanges.ledgerIndex;
  }

  // Extract all involved accounts
  const accounts = extractAccounts(tx);

  logger.debug(
    {
      txHash: tx.hash,
      eventType,
      account: tx.Account,
      currency: payload.currency,
      issuer: payload.issuer,
    },
    'TrustSet parsed'
  );

  return {
    eventType,
    accounts,
    payload,
  };
}

/**
 * Extract trust line details from a TrustSet transaction
 */
export function extractTrustLineFromTx(tx: RawTransaction): TrustLineDetails | null {
  const limitAmount = tx.LimitAmount;
  if (!limitAmount) {
    return null;
  }

  const flags = tx.Flags ?? 0;
  const txFlags = getTrustSetFlags(flags);

  return {
    account: tx.Account,
    issuer: limitAmount.issuer,
    currency: decodeCurrency(limitAmount.currency),
    limit: limitAmount.value,
    balance: '0', // Balance not available from TrustSet alone
    qualityIn: tx.QualityIn ?? 0,
    qualityOut: tx.QualityOut ?? 0,
    noRipple: txFlags.setNoRipple && !txFlags.clearNoRipple,
    noRipplePeer: false, // Not determinable from TrustSet alone
    freeze: txFlags.setFreeze && !txFlags.clearFreeze,
    freezePeer: false,
    authorized: txFlags.setAuth,
    authorizedPeer: false,
  };
}

/**
 * Validate TrustSet transaction
 */
export function validateTrustSet(tx: RawTransaction): {
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

  if (!tx.LimitAmount) {
    errors.push('Missing LimitAmount');
  } else {
    // Validate limit amount
    if (!tx.LimitAmount.currency) {
      errors.push('Missing currency in LimitAmount');
    }

    if (!tx.LimitAmount.issuer) {
      errors.push('Missing issuer in LimitAmount');
    }

    if (tx.LimitAmount.value === undefined) {
      errors.push('Missing value in LimitAmount');
    }

    // Check for self-trust
    if (tx.Account === tx.LimitAmount.issuer) {
      errors.push('Cannot create trust line to self');
    }

    // Warn about zero limit
    if (parseFloat(tx.LimitAmount.value) === 0) {
      warnings.push('Setting limit to zero will remove the trust line if balance is also zero');
    }

    // Warn about very high limits
    const limit = parseFloat(tx.LimitAmount.value);
    if (limit > 1e15) {
      warnings.push('Very high trust limit set');
    }
  }

  // Check conflicting flags
  const flags = tx.Flags ?? 0;
  if ((flags & TrustSetFlags.tfSetNoRipple) && (flags & TrustSetFlags.tfClearNoRipple)) {
    errors.push('Cannot set and clear NoRipple in same transaction');
  }

  if ((flags & TrustSetFlags.tfSetFreeze) && (flags & TrustSetFlags.tfClearFreeze)) {
    errors.push('Cannot set and clear Freeze in same transaction');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get trust line summary for logging/display
 */
export function getTrustLineSummary(tx: RawTransaction): string {
  const limitAmount = tx.LimitAmount;
  if (!limitAmount) {
    return `${tx.Account}: TrustSet (no limit)`;
  }

  const currency = decodeCurrency(limitAmount.currency);
  const action = parseFloat(limitAmount.value) === 0 ? 'remove' : 'set';

  return `${tx.Account} ${action} trust: ${limitAmount.value} ${currency} (${limitAmount.issuer})`;
}

/**
 * Check if trust line matches filter criteria
 */
export function matchesTrustLineFilter(
  tx: RawTransaction,
  filter: {
    account?: string;
    issuer?: string;
    currency?: string;
    minLimit?: number;
    maxLimit?: number;
    eventType?: EventType;
  }
): boolean {
  const limitAmount = tx.LimitAmount;
  if (!limitAmount) {
    return false;
  }

  // Account filter
  if (filter.account && tx.Account !== filter.account) {
    return false;
  }

  // Issuer filter
  if (filter.issuer && limitAmount.issuer !== filter.issuer) {
    return false;
  }

  // Currency filter
  if (filter.currency) {
    const currency = decodeCurrency(limitAmount.currency);
    if (currency !== filter.currency) {
      return false;
    }
  }

  // Limit range filter
  const limit = parseFloat(limitAmount.value);
  if (filter.minLimit !== undefined && limit < filter.minLimit) {
    return false;
  }
  if (filter.maxLimit !== undefined && limit > filter.maxLimit) {
    return false;
  }

  // Event type filter
  if (filter.eventType) {
    const rippleStateChanges = tx.meta?.AffectedNodes
      ? findRippleStateChanges(tx.meta.AffectedNodes)
      : { created: null, deleted: null, modified: null, ledgerIndex: null };

    const eventType = determineEventType(tx, rippleStateChanges);
    if (eventType !== filter.eventType) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Export
// =============================================================================

export default {
  parseTrustSet,
  extractTrustLineFromTx,
  validateTrustSet,
  getTrustLineSummary,
  getTrustSetFlags,
  matchesTrustLineFilter,
  isAuthorization,
  isFreezeOperation,
  isRipplingConfig,
};
