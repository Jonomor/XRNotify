// =============================================================================
// XRNotify Platform - Trustline Transaction Parser
// =============================================================================
// Parses XRPL TrustSet transactions into normalized events
// =============================================================================

import type { EventType } from '@xrnotify/shared';
import type { 
  RawTransaction, 
  AmountObject, 
  AffectedNode,
} from '../normalize';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ParsedEvent {
  event_type: EventType;
  payload: Record<string, unknown>;
  sub_index?: number;
}

interface TrustlineDetails {
  currency: string;
  issuer: string;
  limit: string;
  balance?: string;
  quality_in?: number;
  quality_out?: number;
  no_ripple?: boolean;
  freeze?: boolean;
  authorized?: boolean;
}

interface TrustlineChange {
  event_type: EventType;
  account: string;
  peer: string;
  currency: string;
  issuer: string;
  previous?: TrustlineDetails;
  current?: TrustlineDetails;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// TrustSet flags
const TRUSTSET_FLAGS = {
  tfSetfAuth: 0x00010000,
  tfSetNoRipple: 0x00020000,
  tfClearNoRipple: 0x00040000,
  tfSetFreeze: 0x00100000,
  tfClearFreeze: 0x00200000,
};

// RippleState flags (in the ledger entry)
const RIPPLESTATE_FLAGS = {
  lsfLowReserve: 0x00010000,
  lsfHighReserve: 0x00020000,
  lsfLowAuth: 0x00040000,
  lsfHighAuth: 0x00080000,
  lsfLowNoRipple: 0x00100000,
  lsfHighNoRipple: 0x00200000,
  lsfLowFreeze: 0x00400000,
  lsfHighFreeze: 0x00800000,
};

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function extractTrustsetFlags(flags: number | undefined): {
  set_auth: boolean;
  set_no_ripple: boolean;
  clear_no_ripple: boolean;
  set_freeze: boolean;
  clear_freeze: boolean;
} {
  const f = flags ?? 0;
  return {
    set_auth: !!(f & TRUSTSET_FLAGS.tfSetfAuth),
    set_no_ripple: !!(f & TRUSTSET_FLAGS.tfSetNoRipple),
    clear_no_ripple: !!(f & TRUSTSET_FLAGS.tfClearNoRipple),
    set_freeze: !!(f & TRUSTSET_FLAGS.tfSetFreeze),
    clear_freeze: !!(f & TRUSTSET_FLAGS.tfClearFreeze),
  };
}

/**
 * Determine which account is "high" and which is "low" in a RippleState
 * The account with the lexicographically higher address is "high"
 */
function getHighLowAccounts(account1: string, account2: string): {
  high: string;
  low: string;
  isAccount1High: boolean;
} {
  const isAccount1High = account1 > account2;
  return {
    high: isAccount1High ? account1 : account2,
    low: isAccount1High ? account2 : account1,
    isAccount1High,
  };
}

/**
 * Extract trustline details from RippleState fields
 */
function extractTrustlineFromFields(
  fields: Record<string, unknown>,
  account: string,
  flags: number
): TrustlineDetails | null {
  const balance = fields.Balance as AmountObject | undefined;
  const highLimit = fields.HighLimit as AmountObject | undefined;
  const lowLimit = fields.LowLimit as AmountObject | undefined;
  
  if (!balance || !highLimit || !lowLimit) return null;
  
  // Determine if account is high or low
  const { isAccount1High } = getHighLowAccounts(account, 
    highLimit.issuer === account ? lowLimit.issuer : highLimit.issuer);
  
  const isHigh = isAccount1High;
  const myLimit = isHigh ? highLimit : lowLimit;
  const peerLimit = isHigh ? lowLimit : highLimit;
  
  // Balance is from low's perspective, so negate if we're high
  const balanceValue = parseFloat(balance.value);
  const myBalance = isHigh ? -balanceValue : balanceValue;
  
  // Extract flags for this side
  const noRipple = isHigh 
    ? !!(flags & RIPPLESTATE_FLAGS.lsfHighNoRipple)
    : !!(flags & RIPPLESTATE_FLAGS.lsfLowNoRipple);
  const freeze = isHigh
    ? !!(flags & RIPPLESTATE_FLAGS.lsfHighFreeze)
    : !!(flags & RIPPLESTATE_FLAGS.lsfLowFreeze);
  const authorized = isHigh
    ? !!(flags & RIPPLESTATE_FLAGS.lsfHighAuth)
    : !!(flags & RIPPLESTATE_FLAGS.lsfLowAuth);
  
  return {
    currency: balance.currency,
    issuer: peerLimit.issuer,
    limit: myLimit.value,
    balance: myBalance.toString(),
    quality_in: fields.QualityIn as number | undefined,
    quality_out: fields.QualityOut as number | undefined,
    no_ripple: noRipple,
    freeze: freeze,
    authorized: authorized,
  };
}

/**
 * Analyze RippleState changes to determine event type and details
 */
function analyzeRippleStateChange(
  node: AffectedNode,
  txAccount: string
): TrustlineChange | null {
  const created = node.CreatedNode;
  const modified = node.ModifiedNode;
  const deleted = node.DeletedNode;
  
  const change = created ?? modified ?? deleted;
  if (!change || change.LedgerEntryType !== 'RippleState') return null;
  
  const finalFields = change.FinalFields as Record<string, unknown> | undefined;
  const newFields = change.NewFields as Record<string, unknown> | undefined;
  const prevFields = change.PreviousFields as Record<string, unknown> | undefined;
  
  const fields = finalFields ?? newFields;
  if (!fields) return null;
  
  const flags = (fields.Flags as number) ?? 0;
  const highLimit = fields.HighLimit as AmountObject | undefined;
  const lowLimit = fields.LowLimit as AmountObject | undefined;
  
  if (!highLimit || !lowLimit) return null;
  
  // Determine accounts
  const highAccount = highLimit.issuer;
  const lowAccount = lowLimit.issuer;
  
  // Determine who initiated and who is the peer
  const { isAccount1High } = getHighLowAccounts(txAccount, 
    highAccount === txAccount ? lowAccount : highAccount);
  
  const account = txAccount;
  const peer = isAccount1High ? lowAccount : highAccount;
  const currency = highLimit.currency;
  const issuer = peer; // The issuer from the truster's perspective
  
  // Determine event type
  let eventType: EventType;
  let previous: TrustlineDetails | undefined;
  let current: TrustlineDetails | undefined;
  
  if (created) {
    eventType = 'trustline.created';
    current = extractTrustlineFromFields(fields, account, flags);
  } else if (deleted) {
    eventType = 'trustline.deleted';
    previous = extractTrustlineFromFields(fields, account, flags);
  } else if (modified) {
    eventType = 'trustline.modified';
    if (prevFields) {
      const prevFlags = (prevFields.Flags as number) ?? flags;
      previous = extractTrustlineFromFields(
        { ...fields, ...prevFields },
        account,
        prevFlags
      );
    }
    current = extractTrustlineFromFields(fields, account, flags);
  } else {
    return null;
  }
  
  return {
    event_type: eventType,
    account,
    peer,
    currency,
    issuer,
    previous,
    current,
  };
}

/**
 * Check if the trustline limit is being set to zero (deletion intent)
 */
function isZeroLimit(limitAmount: AmountObject | undefined): boolean {
  if (!limitAmount) return false;
  return parseFloat(limitAmount.value) === 0;
}

/**
 * Determine what changes were made in the TrustSet
 */
function analyzeChanges(
  previous: TrustlineDetails | undefined,
  current: TrustlineDetails | undefined
): {
  limit_changed: boolean;
  no_ripple_changed: boolean;
  freeze_changed: boolean;
  authorized_changed: boolean;
  previous_limit?: string;
  new_limit?: string;
} {
  const changes = {
    limit_changed: false,
    no_ripple_changed: false,
    freeze_changed: false,
    authorized_changed: false,
    previous_limit: previous?.limit,
    new_limit: current?.limit,
  };
  
  if (previous && current) {
    changes.limit_changed = previous.limit !== current.limit;
    changes.no_ripple_changed = previous.no_ripple !== current.no_ripple;
    changes.freeze_changed = previous.freeze !== current.freeze;
    changes.authorized_changed = previous.authorized !== current.authorized;
  } else if (current) {
    // New trustline
    changes.limit_changed = true;
    changes.no_ripple_changed = !!current.no_ripple;
    changes.freeze_changed = !!current.freeze;
    changes.authorized_changed = !!current.authorized;
  }
  
  return changes;
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse a TrustSet transaction into normalized events
 */
export function parseTrustlineTransaction(tx: RawTransaction): ParsedEvent[] {
  if (tx.TransactionType !== 'TrustSet') {
    return [];
  }
  
  const events: ParsedEvent[] = [];
  const txFlags = extractTrustsetFlags(tx.Flags);
  
  // Get the limit amount from the transaction
  const limitAmount = tx.LimitAmount as AmountObject | undefined;
  
  // Analyze affected RippleState nodes
  for (const node of tx.meta.AffectedNodes) {
    const change = analyzeRippleStateChange(node, tx.Account);
    if (!change) continue;
    
    // Only include events where the tx account is involved
    if (change.account !== tx.Account) continue;
    
    const changes = analyzeChanges(change.previous, change.current);
    
    const payload: Record<string, unknown> = {
      account: change.account,
      peer: change.peer,
      currency: change.currency,
      issuer: change.issuer,
      
      // Current state
      limit: change.current?.limit ?? '0',
      balance: change.current?.balance ?? '0',
      
      // Flags state
      no_ripple: change.current?.no_ripple ?? false,
      freeze: change.current?.freeze ?? false,
      authorized: change.current?.authorized ?? false,
      
      // Quality settings
      quality_in: tx.QualityIn ?? change.current?.quality_in,
      quality_out: tx.QualityOut ?? change.current?.quality_out,
      
      // What was requested in the transaction
      requested_limit: limitAmount?.value,
      
      // Transaction flags
      tx_flags: txFlags,
      
      // What changed
      changes,
    };
    
    // Add previous state for modifications
    if (change.previous && change.event_type === 'trustline.modified') {
      payload.previous = {
        limit: change.previous.limit,
        balance: change.previous.balance,
        no_ripple: change.previous.no_ripple,
        freeze: change.previous.freeze,
        authorized: change.previous.authorized,
      };
    }
    
    events.push({
      event_type: change.event_type,
      payload,
    });
  }
  
  // If no RippleState changes found, create a basic event from tx data
  if (events.length === 0 && limitAmount) {
    events.push({
      event_type: 'trustline.modified',
      payload: {
        account: tx.Account,
        currency: limitAmount.currency,
        issuer: limitAmount.issuer,
        requested_limit: limitAmount.value,
        tx_flags: txFlags,
        // Note: Detailed changes not available without RippleState analysis
      },
    });
  }
  
  return events;
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  extractTrustsetFlags,
  analyzeRippleStateChange,
  getHighLowAccounts,
  isZeroLimit,
  analyzeChanges,
};
