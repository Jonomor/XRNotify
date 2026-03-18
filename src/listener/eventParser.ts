/**
 * XRNotify Event Parser
 * Parses raw XRPL transactions into normalized event payloads
 */

import { createChildLogger } from '../core/logger.js';
import { xrplEventsPublished } from '../core/metrics.js';

const log = createChildLogger('event-parser');

// ============================================
// Event Type Definitions
// ============================================

export type EventType =
  | 'payment_received'
  | 'payment_sent'
  | 'nft_minted'
  | 'nft_burned'
  | 'nft_offer_created'
  | 'nft_offer_accepted'
  | 'trustline_created'
  | 'trustline_modified'
  | 'trustline_removed'
  | 'dex_order_created'
  | 'dex_order_cancelled'
  | 'dex_order_filled'
  | 'escrow_created'
  | 'escrow_finished'
  | 'escrow_cancelled'
  | 'account_created'
  | 'account_deleted'
  | 'check_created'
  | 'check_cashed'
  | 'check_cancelled';

export interface BaseEvent {
  event_type: EventType;
  ledger_index: number;
  tx_hash: string;
  timestamp: string;
  validated: boolean;
}

export interface PaymentEvent extends BaseEvent {
  event_type: 'payment_received' | 'payment_sent';
  from: string;
  to: string;
  amount: string;
  currency: string;
  issuer?: string;
  destination_tag?: number;
  source_tag?: number;
  fee_drops: string;
}

export interface NFTokenEvent extends BaseEvent {
  event_type: 'nft_minted' | 'nft_burned';
  account: string;
  token_id: string;
  uri?: string;
  flags?: number;
  transfer_fee?: number;
  taxon?: number;
}

export interface TrustlineEvent extends BaseEvent {
  event_type: 'trustline_created' | 'trustline_modified' | 'trustline_removed';
  account: string;
  issuer: string;
  currency: string;
  limit: string;
  quality_in?: number;
  quality_out?: number;
}

export interface DEXEvent extends BaseEvent {
  event_type: 'dex_order_created' | 'dex_order_cancelled' | 'dex_order_filled';
  account: string;
  taker_gets: {
    currency: string;
    value: string;
    issuer?: string;
  };
  taker_pays: {
    currency: string;
    value: string;
    issuer?: string;
  };
  sequence?: number;
  offer_sequence?: number;
}

export interface EscrowEvent extends BaseEvent {
  event_type: 'escrow_created' | 'escrow_finished' | 'escrow_cancelled';
  account: string;
  destination: string;
  amount_drops: string;
  condition?: string;
  cancel_after?: number;
  finish_after?: number;
}

export type XRNotifyEvent =
  | PaymentEvent
  | NFTokenEvent
  | TrustlineEvent
  | DEXEvent
  | EscrowEvent
  | BaseEvent;

// ============================================
// XRPL Timestamp Conversion
// ============================================

const RIPPLE_EPOCH = 946684800; // January 1, 2000 00:00:00 UTC

function rippleTimeToISO(rippleTime: number): string {
  return new Date((rippleTime + RIPPLE_EPOCH) * 1000).toISOString();
}

// ============================================
// Amount Parsing
// ============================================

interface ParsedAmount {
  value: string;
  currency: string;
  issuer?: string;
}

function parseAmount(amount: unknown): ParsedAmount {
  if (typeof amount === 'string') {
    // XRP in drops
    return {
      value: (Number(amount) / 1_000_000).toFixed(6),
      currency: 'XRP',
    };
  }
  
  if (typeof amount === 'object' && amount !== null) {
    const amtObj = amount as { value: string; currency: string; issuer?: string };
    return {
      value: amtObj.value,
      currency: amtObj.currency,
      issuer: amtObj.issuer,
    };
  }
  
  return { value: '0', currency: 'UNKNOWN' };
}

// ============================================
// Transaction Parsers
// ============================================

function parsePayment(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  const amount = parseAmount(tx.Amount);
  const delivered = meta.delivered_amount
    ? parseAmount(meta.delivered_amount)
    : amount;

  const baseEvent = {
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    from: tx.Account as string,
    to: tx.Destination as string,
    amount: delivered.value,
    currency: delivered.currency,
    issuer: delivered.issuer,
    destination_tag: tx.DestinationTag as number | undefined,
    source_tag: tx.SourceTag as number | undefined,
    fee_drops: tx.Fee as string,
  };

  return {
    ...baseEvent,
    event_type: 'payment_received',
  } as PaymentEvent;
}

function parseNFTokenMint(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  // Extract NFTokenID from affected nodes
  let tokenId = '';
  const affectedNodes = meta.AffectedNodes as Array<Record<string, unknown>> || [];
  
  for (const node of affectedNodes) {
    const modified = node.ModifiedNode as Record<string, unknown> | undefined;
    const created = node.CreatedNode as Record<string, unknown> | undefined;
    
    const nodeData = modified || created;
    if (nodeData && nodeData.LedgerEntryType === 'NFTokenPage') {
      const finalFields = (nodeData.FinalFields || nodeData.NewFields) as Record<string, unknown> | undefined;
      if (finalFields?.NFTokens) {
        const tokens = finalFields.NFTokens as Array<{ NFToken: { NFTokenID: string } }>;
        if (tokens.length > 0) {
          tokenId = tokens[tokens.length - 1].NFToken.NFTokenID;
        }
      }
    }
  }

  return {
    event_type: 'nft_minted',
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    token_id: tokenId,
    uri: tx.URI ? Buffer.from(tx.URI as string, 'hex').toString('utf8') : undefined,
    flags: tx.Flags as number | undefined,
    transfer_fee: tx.TransferFee as number | undefined,
    taxon: tx.NFTokenTaxon as number | undefined,
  } as NFTokenEvent;
}

function parseNFTokenBurn(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  return {
    event_type: 'nft_burned',
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    token_id: tx.NFTokenID as string,
  } as NFTokenEvent;
}

function parseTrustSet(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  const limitAmount = tx.LimitAmount as { currency: string; issuer: string; value: string };
  
  // Determine event type based on limit value
  const limit = parseFloat(limitAmount.value);
  let eventType: 'trustline_created' | 'trustline_modified' | 'trustline_removed';
  
  // Check if this is a new or modified trustline
  const affectedNodes = meta.AffectedNodes as Array<Record<string, unknown>> || [];
  const isCreated = affectedNodes.some(node => 
    node.CreatedNode && (node.CreatedNode as Record<string, unknown>).LedgerEntryType === 'RippleState'
  );
  
  if (limit === 0) {
    eventType = 'trustline_removed';
  } else if (isCreated) {
    eventType = 'trustline_created';
  } else {
    eventType = 'trustline_modified';
  }

  return {
    event_type: eventType,
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    issuer: limitAmount.issuer,
    currency: limitAmount.currency,
    limit: limitAmount.value,
    quality_in: tx.QualityIn as number | undefined,
    quality_out: tx.QualityOut as number | undefined,
  } as TrustlineEvent;
}

function parseOfferCreate(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  const takerGets = parseAmount(tx.TakerGets);
  const takerPays = parseAmount(tx.TakerPays);

  return {
    event_type: 'dex_order_created',
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    taker_gets: takerGets,
    taker_pays: takerPays,
    sequence: tx.Sequence as number,
  } as DEXEvent;
}

function parseOfferCancel(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  return {
    event_type: 'dex_order_cancelled',
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    offer_sequence: tx.OfferSequence as number,
    taker_gets: { currency: 'XRP', value: '0' },
    taker_pays: { currency: 'XRP', value: '0' },
  } as DEXEvent;
}

function parseEscrowCreate(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  return {
    event_type: 'escrow_created',
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    destination: tx.Destination as string,
    amount_drops: tx.Amount as string,
    condition: tx.Condition as string | undefined,
    cancel_after: tx.CancelAfter as number | undefined,
    finish_after: tx.FinishAfter as number | undefined,
  } as EscrowEvent;
}

function parseEscrowFinish(tx: Record<string, unknown>, meta: Record<string, unknown>): XRNotifyEvent | null {
  const result = meta.TransactionResult as string;
  if (result !== 'tesSUCCESS') return null;

  // Get amount from affected nodes
  let amount = '0';
  const affectedNodes = meta.AffectedNodes as Array<Record<string, unknown>> || [];
  for (const node of affectedNodes) {
    const deleted = node.DeletedNode as Record<string, unknown> | undefined;
    if (deleted && deleted.LedgerEntryType === 'Escrow') {
      const finalFields = deleted.FinalFields as Record<string, unknown> | undefined;
      if (finalFields?.Amount) {
        amount = finalFields.Amount as string;
      }
    }
  }

  return {
    event_type: 'escrow_finished',
    ledger_index: tx.ledger_index as number,
    tx_hash: tx.hash as string,
    timestamp: rippleTimeToISO(tx.date as number),
    validated: true,
    account: tx.Account as string,
    destination: tx.Destination as string,
    amount_drops: amount,
  } as EscrowEvent;
}

// ============================================
// Main Parser Function
// ============================================

export function parseXRPLEvent(transaction: Record<string, unknown>): XRNotifyEvent | null {
  try {
    const tx = transaction.tx || transaction;
    const meta = transaction.meta || tx.meta || {};
    const txType = tx.TransactionType as string;

    let event: XRNotifyEvent | null = null;

    switch (txType) {
      case 'Payment':
        event = parsePayment(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'NFTokenMint':
        event = parseNFTokenMint(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'NFTokenBurn':
        event = parseNFTokenBurn(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'TrustSet':
        event = parseTrustSet(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'OfferCreate':
        event = parseOfferCreate(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'OfferCancel':
        event = parseOfferCancel(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'EscrowCreate':
        event = parseEscrowCreate(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      case 'EscrowFinish':
        event = parseEscrowFinish(tx as Record<string, unknown>, meta as Record<string, unknown>);
        break;
      default:
        log.debug('Unsupported transaction type', { txType });
        return null;
    }

    if (event) {
      xrplEventsPublished.inc({ event_type: event.event_type });
      log.debug('Event parsed', { event_type: event.event_type, tx_hash: event.tx_hash });
    }

    return event;
  } catch (error) {
    log.error('Failed to parse XRPL event', {
      error: (error as Error).message,
      transaction: JSON.stringify(transaction).substring(0, 500),
    });
    return null;
  }
}

// Export all event addresses affected by an event
export function getAffectedAddresses(event: XRNotifyEvent): string[] {
  const addresses = new Set<string>();

  if ('from' in event && event.from) addresses.add(event.from);
  if ('to' in event && event.to) addresses.add(event.to);
  if ('account' in event && event.account) addresses.add(event.account);
  if ('destination' in event && event.destination) addresses.add(event.destination);
  if ('issuer' in event && event.issuer) addresses.add(event.issuer);

  return Array.from(addresses);
}
