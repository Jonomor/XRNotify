// =============================================================================
// XRNotify Platform - XRPL Event Normalizer
// =============================================================================
// Converts raw XRPL transactions into normalized canonical events
// =============================================================================

import type { EventType, XrplEvent } from '@xrnotify/shared';
import { generateEventId, nowISO } from '@xrnotify/shared';
import { parsePaymentTransaction } from './parsers/payment';
import { parseNftTransaction } from './parsers/nft';
import { parseDexTransaction } from './parsers/dex';
import { parseTrustlineTransaction } from './parsers/trustline';
import { createModuleLogger } from '@/lib/logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RawTransaction {
  hash: string;
  ledger_index: number;
  date: number; // Ripple epoch seconds
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | AmountObject;
  Fee: string;
  Sequence: number;
  Flags?: number;
  meta: TransactionMeta;
  // Type-specific fields
  NFTokenID?: string;
  NFTokenOffers?: string[];
  NFTokenSellOffer?: string;
  NFTokenBuyOffer?: string;
  TakerGets?: string | AmountObject;
  TakerPays?: string | AmountObject;
  LimitAmount?: AmountObject;
  OfferSequence?: number;
  // ... other fields as needed
  [key: string]: unknown;
}

export interface AmountObject {
  currency: string;
  issuer: string;
  value: string;
}

export interface TransactionMeta {
  TransactionResult: string;
  AffectedNodes: AffectedNode[];
  delivered_amount?: string | AmountObject;
  nftoken_id?: string;
  offer_id?: string;
}

export interface AffectedNode {
  CreatedNode?: NodeChange;
  ModifiedNode?: NodeChange;
  DeletedNode?: NodeChange;
}

export interface NodeChange {
  LedgerEntryType: string;
  LedgerIndex: string;
  FinalFields?: Record<string, unknown>;
  PreviousFields?: Record<string, unknown>;
  NewFields?: Record<string, unknown>;
  PreviousTxnID?: string;
  PreviousTxnLgrSeq?: number;
}

export interface NormalizedEvent {
  id: string;
  event_type: EventType;
  ledger_index: number;
  tx_hash: string;
  timestamp: string;
  accounts: string[];
  payload: Record<string, unknown>;
  raw_tx?: RawTransaction;
}

export interface NormalizerResult {
  events: NormalizedEvent[];
  errors: NormalizerError[];
}

export interface NormalizerError {
  tx_hash: string;
  error: string;
  transaction_type?: string;
}

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('xrpl-normalizer');

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Ripple epoch starts at 2000-01-01T00:00:00Z
const RIPPLE_EPOCH_OFFSET = 946684800;

// Transaction types we support
const SUPPORTED_TRANSACTION_TYPES = new Set([
  'Payment',
  'TrustSet',
  'NFTokenMint',
  'NFTokenBurn',
  'NFTokenCreateOffer',
  'NFTokenAcceptOffer',
  'NFTokenCancelOffer',
  'OfferCreate',
  'OfferCancel',
  'AccountSet',
  'AccountDelete',
  'EscrowCreate',
  'EscrowFinish',
  'EscrowCancel',
  'CheckCreate',
  'CheckCash',
  'CheckCancel',
]);

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Convert Ripple epoch timestamp to ISO string
 */
export function rippleTimeToISO(rippleTime: number): string {
  const unixTimestamp = (rippleTime + RIPPLE_EPOCH_OFFSET) * 1000;
  return new Date(unixTimestamp).toISOString();
}

/**
 * Convert drops to XRP (string to avoid floating point issues)
 */
export function dropsToXrp(drops: string): string {
  const dropsNum = BigInt(drops);
  const xrp = Number(dropsNum) / 1_000_000;
  return xrp.toString();
}

/**
 * Check if transaction was successful
 */
export function isSuccessfulTransaction(meta: TransactionMeta): boolean {
  return meta.TransactionResult === 'tesSUCCESS';
}

/**
 * Extract all accounts involved in a transaction
 */
export function extractAccounts(tx: RawTransaction): string[] {
  const accounts = new Set<string>();
  
  // Primary account
  accounts.add(tx.Account);
  
  // Destination if present
  if (tx.Destination) {
    accounts.add(tx.Destination);
  }
  
  // Extract from affected nodes
  for (const node of tx.meta.AffectedNodes) {
    const change = node.CreatedNode ?? node.ModifiedNode ?? node.DeletedNode;
    if (!change) continue;
    
    const fields = change.FinalFields ?? change.NewFields ?? {};
    
    // Common account fields
    if (typeof fields.Account === 'string') accounts.add(fields.Account);
    if (typeof fields.Owner === 'string') accounts.add(fields.Owner);
    if (typeof fields.Destination === 'string') accounts.add(fields.Destination);
    if (typeof fields.HighLimit === 'object' && fields.HighLimit) {
      const hl = fields.HighLimit as AmountObject;
      if (hl.issuer) accounts.add(hl.issuer);
    }
    if (typeof fields.LowLimit === 'object' && fields.LowLimit) {
      const ll = fields.LowLimit as AmountObject;
      if (ll.issuer) accounts.add(ll.issuer);
    }
  }
  
  return Array.from(accounts);
}

/**
 * Parse amount (either drops string or currency object)
 */
export function parseAmount(amount: string | AmountObject | undefined): {
  value: string;
  currency: string;
  issuer?: string;
} | null {
  if (!amount) return null;
  
  if (typeof amount === 'string') {
    // XRP in drops
    return {
      value: dropsToXrp(amount),
      currency: 'XRP',
    };
  }
  
  // Issued currency
  return {
    value: amount.value,
    currency: amount.currency,
    issuer: amount.issuer,
  };
}

// -----------------------------------------------------------------------------
// Main Normalizer
// -----------------------------------------------------------------------------

/**
 * Normalize a raw XRPL transaction into canonical events
 * A single transaction may produce multiple events (e.g., offer fills)
 */
export function normalizeTransaction(
  tx: RawTransaction,
  includeRaw = false
): NormalizerResult {
  const events: NormalizedEvent[] = [];
  const errors: NormalizerError[] = [];
  
  // Skip unsupported transaction types
  if (!SUPPORTED_TRANSACTION_TYPES.has(tx.TransactionType)) {
    logger.debug({ 
      tx_hash: tx.hash, 
      type: tx.TransactionType 
    }, 'Skipping unsupported transaction type');
    return { events, errors };
  }
  
  // Skip failed transactions
  if (!isSuccessfulTransaction(tx.meta)) {
    logger.debug({ 
      tx_hash: tx.hash, 
      result: tx.meta.TransactionResult 
    }, 'Skipping failed transaction');
    return { events, errors };
  }
  
  try {
    const timestamp = rippleTimeToISO(tx.date);
    const accounts = extractAccounts(tx);
    
    // Route to appropriate parser
    let parsedEvents: Array<{
      event_type: EventType;
      payload: Record<string, unknown>;
      sub_index?: number;
    }> = [];
    
    switch (tx.TransactionType) {
      case 'Payment':
        parsedEvents = parsePaymentTransaction(tx);
        break;
        
      case 'TrustSet':
        parsedEvents = parseTrustlineTransaction(tx);
        break;
        
      case 'NFTokenMint':
      case 'NFTokenBurn':
      case 'NFTokenCreateOffer':
      case 'NFTokenAcceptOffer':
      case 'NFTokenCancelOffer':
        parsedEvents = parseNftTransaction(tx);
        break;
        
      case 'OfferCreate':
      case 'OfferCancel':
        parsedEvents = parseDexTransaction(tx);
        break;
        
      case 'AccountSet':
        parsedEvents = [{
          event_type: 'account.settings_changed',
          payload: {
            account: tx.Account,
            flags: tx.Flags,
            // Extract specific settings if needed
          },
        }];
        break;
        
      case 'AccountDelete':
        parsedEvents = [{
          event_type: 'account.deleted',
          payload: {
            account: tx.Account,
            destination: tx.Destination,
          },
        }];
        break;
        
      case 'EscrowCreate':
        parsedEvents = [{
          event_type: 'escrow.created',
          payload: {
            account: tx.Account,
            destination: tx.Destination,
            amount: parseAmount(tx.Amount),
            condition: tx.Condition,
            finish_after: tx.FinishAfter,
            cancel_after: tx.CancelAfter,
          },
        }];
        break;
        
      case 'EscrowFinish':
        parsedEvents = [{
          event_type: 'escrow.finished',
          payload: {
            account: tx.Account,
            owner: tx.Owner,
            offer_sequence: tx.OfferSequence,
          },
        }];
        break;
        
      case 'EscrowCancel':
        parsedEvents = [{
          event_type: 'escrow.cancelled',
          payload: {
            account: tx.Account,
            owner: tx.Owner,
            offer_sequence: tx.OfferSequence,
          },
        }];
        break;
        
      case 'CheckCreate':
        parsedEvents = [{
          event_type: 'check.created',
          payload: {
            account: tx.Account,
            destination: tx.Destination,
            send_max: parseAmount(tx.SendMax as string | AmountObject | undefined),
            expiration: tx.Expiration,
          },
        }];
        break;
        
      case 'CheckCash':
        parsedEvents = [{
          event_type: 'check.cashed',
          payload: {
            account: tx.Account,
            check_id: tx.CheckID,
            amount: parseAmount(tx.Amount) ?? parseAmount(tx.DeliverMin as string | AmountObject | undefined),
          },
        }];
        break;
        
      case 'CheckCancel':
        parsedEvents = [{
          event_type: 'check.cancelled',
          payload: {
            account: tx.Account,
            check_id: tx.CheckID,
          },
        }];
        break;
        
      default:
        logger.warn({ type: tx.TransactionType }, 'Unhandled transaction type');
    }
    
    // Convert parsed events to normalized events
    for (const parsed of parsedEvents) {
      const eventId = generateEventId(
        tx.ledger_index,
        tx.hash,
        parsed.event_type,
        parsed.sub_index
      );
      
      const event: NormalizedEvent = {
        id: eventId,
        event_type: parsed.event_type,
        ledger_index: tx.ledger_index,
        tx_hash: tx.hash,
        timestamp,
        accounts,
        payload: {
          ...parsed.payload,
          fee: dropsToXrp(tx.Fee),
          sequence: tx.Sequence,
        },
      };
      
      if (includeRaw) {
        event.raw_tx = tx;
      }
      
      events.push(event);
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      tx_hash: tx.hash, 
      type: tx.TransactionType,
      error: message,
    }, 'Failed to normalize transaction');
    
    errors.push({
      tx_hash: tx.hash,
      transaction_type: tx.TransactionType,
      error: message,
    });
  }
  
  return { events, errors };
}

/**
 * Normalize a batch of transactions
 */
export function normalizeTransactions(
  transactions: RawTransaction[],
  includeRaw = false
): NormalizerResult {
  const allEvents: NormalizedEvent[] = [];
  const allErrors: NormalizerError[] = [];
  
  for (const tx of transactions) {
    const { events, errors } = normalizeTransaction(tx, includeRaw);
    allEvents.push(...events);
    allErrors.push(...errors);
  }
  
  // Sort by ledger index, then by event type for deterministic ordering
  allEvents.sort((a, b) => {
    if (a.ledger_index !== b.ledger_index) {
      return a.ledger_index - b.ledger_index;
    }
    return a.id.localeCompare(b.id);
  });
  
  return { events: allEvents, errors: allErrors };
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  parsePaymentTransaction,
  parseNftTransaction,
  parseDexTransaction,
  parseTrustlineTransaction,
};
