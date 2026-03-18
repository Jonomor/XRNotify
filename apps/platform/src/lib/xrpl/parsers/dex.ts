// =============================================================================
// XRNotify Platform - DEX Transaction Parser
// =============================================================================
// Parses XRPL DEX (OfferCreate/OfferCancel) transactions into normalized events
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

interface ParsedAmount {
  value: string;
  currency: string;
  issuer?: string;
}

interface OfferFill {
  taker_got: ParsedAmount;
  taker_paid: ParsedAmount;
  offer_owner: string;
  offer_sequence: number;
  is_partial: boolean;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// OfferCreate flags
const OFFER_FLAGS = {
  tfPassive: 0x00010000,
  tfImmediateOrCancel: 0x00020000,
  tfFillOrKill: 0x00040000,
  tfSell: 0x00080000,
};

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function dropsToXrp(drops: string): string {
  const dropsNum = BigInt(drops);
  const xrp = Number(dropsNum) / 1_000_000;
  return xrp.toString();
}

function parseAmount(amount: string | AmountObject | undefined): ParsedAmount | null {
  if (!amount) return null;
  
  if (typeof amount === 'string') {
    return {
      value: dropsToXrp(amount),
      currency: 'XRP',
    };
  }
  
  return {
    value: amount.value,
    currency: amount.currency,
    issuer: amount.issuer,
  };
}

function extractOfferFlags(flags: number | undefined): {
  is_passive: boolean;
  is_immediate_or_cancel: boolean;
  is_fill_or_kill: boolean;
  is_sell: boolean;
} {
  const f = flags ?? 0;
  return {
    is_passive: !!(f & OFFER_FLAGS.tfPassive),
    is_immediate_or_cancel: !!(f & OFFER_FLAGS.tfImmediateOrCancel),
    is_fill_or_kill: !!(f & OFFER_FLAGS.tfFillOrKill),
    is_sell: !!(f & OFFER_FLAGS.tfSell),
  };
}

function calculateExchangeRate(
  takerGets: ParsedAmount | null,
  takerPays: ParsedAmount | null
): number | null {
  if (!takerGets || !takerPays) return null;
  
  const gets = parseFloat(takerGets.value);
  const pays = parseFloat(takerPays.value);
  
  if (gets === 0) return null;
  
  return pays / gets;
}

function formatTradePair(
  takerGets: ParsedAmount | null,
  takerPays: ParsedAmount | null
): string | null {
  if (!takerGets || !takerPays) return null;
  
  const base = takerGets.currency === 'XRP' 
    ? 'XRP' 
    : `${takerGets.currency}.${takerGets.issuer?.slice(0, 8)}`;
    
  const quote = takerPays.currency === 'XRP' 
    ? 'XRP' 
    : `${takerPays.currency}.${takerPays.issuer?.slice(0, 8)}`;
  
  return `${base}/${quote}`;
}

/**
 * Extract offer fills from AffectedNodes
 * Returns details about each offer that was consumed
 */
function extractOfferFills(tx: RawTransaction): OfferFill[] {
  const fills: OfferFill[] = [];
  
  for (const node of tx.meta.AffectedNodes) {
    // Look for modified or deleted Offer nodes (consumed offers)
    const modified = node.ModifiedNode;
    const deleted = node.DeletedNode;
    
    if (modified?.LedgerEntryType === 'Offer') {
      // Partially filled offer
      const finalFields = modified.FinalFields as Record<string, unknown> | undefined;
      const prevFields = modified.PreviousFields as Record<string, unknown> | undefined;
      
      if (finalFields && prevFields) {
        const fill = extractFillFromOfferChange(
          finalFields,
          prevFields,
          modified.LedgerIndex,
          true
        );
        if (fill) fills.push(fill);
      }
    }
    
    if (deleted?.LedgerEntryType === 'Offer') {
      // Fully consumed offer
      const finalFields = deleted.FinalFields as Record<string, unknown> | undefined;
      const prevFields = deleted.PreviousFields as Record<string, unknown> | undefined;
      
      if (finalFields) {
        const fill = extractFillFromOfferChange(
          finalFields,
          prevFields ?? finalFields,
          deleted.LedgerIndex,
          false
        );
        if (fill) fills.push(fill);
      }
    }
  }
  
  return fills;
}

function extractFillFromOfferChange(
  finalFields: Record<string, unknown>,
  prevFields: Record<string, unknown>,
  ledgerIndex: string,
  isPartial: boolean
): OfferFill | null {
  const owner = finalFields.Account as string;
  const sequence = finalFields.Sequence as number;
  
  // For deleted offers, the "fill" is the full previous amount
  // For modified offers, the "fill" is the difference
  
  let takerGotValue: ParsedAmount | null;
  let takerPaidValue: ParsedAmount | null;
  
  if (isPartial) {
    // Calculate difference between previous and final
    const prevGets = parseAmount(prevFields.TakerGets as string | AmountObject);
    const finalGets = parseAmount(finalFields.TakerGets as string | AmountObject);
    const prevPays = parseAmount(prevFields.TakerPays as string | AmountObject);
    const finalPays = parseAmount(finalFields.TakerPays as string | AmountObject);
    
    if (!prevGets || !finalGets || !prevPays || !finalPays) return null;
    
    takerGotValue = {
      value: (parseFloat(prevGets.value) - parseFloat(finalGets.value)).toString(),
      currency: prevGets.currency,
      issuer: prevGets.issuer,
    };
    
    takerPaidValue = {
      value: (parseFloat(prevPays.value) - parseFloat(finalPays.value)).toString(),
      currency: prevPays.currency,
      issuer: prevPays.issuer,
    };
  } else {
    // For fully consumed, use the previous values (what was available)
    const prevGets = prevFields.TakerGets as string | AmountObject | undefined;
    const prevPays = prevFields.TakerPays as string | AmountObject | undefined;
    
    // If no previous fields, use final fields (first touch)
    takerGotValue = parseAmount(prevGets ?? finalFields.TakerGets as string | AmountObject);
    takerPaidValue = parseAmount(prevPays ?? finalFields.TakerPays as string | AmountObject);
  }
  
  if (!takerGotValue || !takerPaidValue) return null;
  
  return {
    taker_got: takerGotValue,
    taker_paid: takerPaidValue,
    offer_owner: owner,
    offer_sequence: sequence,
    is_partial: isPartial,
  };
}

/**
 * Check if the offer was placed on the book (not immediately consumed)
 */
function wasOfferPlacedOnBook(tx: RawTransaction): boolean {
  for (const node of tx.meta.AffectedNodes) {
    if (node.CreatedNode?.LedgerEntryType === 'Offer') {
      return true;
    }
  }
  return false;
}

/**
 * Get the created offer details if offer was placed on book
 */
function getCreatedOfferDetails(tx: RawTransaction): {
  offer_id: string;
  sequence: number;
  taker_gets: ParsedAmount | null;
  taker_pays: ParsedAmount | null;
} | null {
  for (const node of tx.meta.AffectedNodes) {
    if (node.CreatedNode?.LedgerEntryType === 'Offer') {
      const fields = node.CreatedNode.NewFields as Record<string, unknown> | undefined;
      if (!fields) continue;
      
      return {
        offer_id: node.CreatedNode.LedgerIndex,
        sequence: fields.Sequence as number,
        taker_gets: parseAmount(fields.TakerGets as string | AmountObject),
        taker_pays: parseAmount(fields.TakerPays as string | AmountObject),
      };
    }
  }
  return null;
}

/**
 * Calculate total filled amounts from all fills
 */
function calculateTotalFilled(fills: OfferFill[]): {
  total_got: Record<string, number>;
  total_paid: Record<string, number>;
} {
  const totalGot: Record<string, number> = {};
  const totalPaid: Record<string, number> = {};
  
  for (const fill of fills) {
    const gotKey = fill.taker_got.issuer 
      ? `${fill.taker_got.currency}:${fill.taker_got.issuer}`
      : fill.taker_got.currency;
    const paidKey = fill.taker_paid.issuer
      ? `${fill.taker_paid.currency}:${fill.taker_paid.issuer}`
      : fill.taker_paid.currency;
    
    totalGot[gotKey] = (totalGot[gotKey] ?? 0) + parseFloat(fill.taker_got.value);
    totalPaid[paidKey] = (totalPaid[paidKey] ?? 0) + parseFloat(fill.taker_paid.value);
  }
  
  return { total_got: totalGot, total_paid: totalPaid };
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse a DEX transaction into normalized events
 */
export function parseDexTransaction(tx: RawTransaction): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  
  switch (tx.TransactionType) {
    case 'OfferCreate': {
      const takerGets = parseAmount(tx.TakerGets);
      const takerPays = parseAmount(tx.TakerPays);
      const flags = extractOfferFlags(tx.Flags);
      const fills = extractOfferFills(tx);
      const wasPlaced = wasOfferPlacedOnBook(tx);
      const createdOffer = getCreatedOfferDetails(tx);
      
      // Determine what happened
      const wasFullyConsumed = fills.length > 0 && !wasPlaced;
      const wasPartiallyFilled = fills.length > 0 && wasPlaced;
      const wasNotFilled = fills.length === 0 && wasPlaced;
      
      // If there were fills, emit fill events
      if (fills.length > 0) {
        // Single fill event with aggregated data
        const totals = calculateTotalFilled(fills);
        
        const fillEventType: EventType = wasFullyConsumed 
          ? 'dex.offer_filled' 
          : 'dex.offer_partial';
        
        events.push({
          event_type: fillEventType,
          payload: {
            account: tx.Account,
            taker_gets: takerGets,
            taker_pays: takerPays,
            fills_count: fills.length,
            fills: fills.map(f => ({
              offer_owner: f.offer_owner,
              offer_sequence: f.offer_sequence,
              got: f.taker_got,
              paid: f.taker_paid,
              is_partial: f.is_partial,
            })),
            exchange_rate: calculateExchangeRate(takerGets, takerPays),
            trade_pair: formatTradePair(takerGets, takerPays),
            ...flags,
          },
        });
      }
      
      // If offer was placed on book, emit created event
      if (wasPlaced && createdOffer) {
        events.push({
          event_type: 'dex.offer_created',
          payload: {
            account: tx.Account,
            offer_id: createdOffer.offer_id,
            offer_sequence: tx.Sequence,
            taker_gets: createdOffer.taker_gets,
            taker_pays: createdOffer.taker_pays,
            expiration: tx.Expiration,
            exchange_rate: calculateExchangeRate(createdOffer.taker_gets, createdOffer.taker_pays),
            trade_pair: formatTradePair(createdOffer.taker_gets, createdOffer.taker_pays),
            // Original amounts (before any partial fill)
            original_taker_gets: takerGets,
            original_taker_pays: takerPays,
            was_partially_filled: wasPartiallyFilled,
            ...flags,
          },
          sub_index: fills.length > 0 ? 1 : undefined,
        });
      }
      
      // Handle IOC/FOK that didn't fill
      if (fills.length === 0 && (flags.is_immediate_or_cancel || flags.is_fill_or_kill)) {
        // These offers don't go on the book if not filled
        events.push({
          event_type: 'dex.offer_cancelled',
          payload: {
            account: tx.Account,
            offer_sequence: tx.Sequence,
            reason: flags.is_fill_or_kill ? 'fill_or_kill_not_met' : 'immediate_or_cancel_unfilled',
            taker_gets: takerGets,
            taker_pays: takerPays,
          },
        });
      }
      
      break;
    }
    
    case 'OfferCancel': {
      // Find the cancelled offer details from deleted nodes
      let cancelledOffer: {
        offer_id: string;
        taker_gets: ParsedAmount | null;
        taker_pays: ParsedAmount | null;
      } | null = null;
      
      for (const node of tx.meta.AffectedNodes) {
        if (node.DeletedNode?.LedgerEntryType === 'Offer') {
          const fields = node.DeletedNode.FinalFields as Record<string, unknown> | undefined;
          if (fields) {
            cancelledOffer = {
              offer_id: node.DeletedNode.LedgerIndex,
              taker_gets: parseAmount(fields.TakerGets as string | AmountObject),
              taker_pays: parseAmount(fields.TakerPays as string | AmountObject),
            };
            break;
          }
        }
      }
      
      events.push({
        event_type: 'dex.offer_cancelled',
        payload: {
          account: tx.Account,
          offer_sequence: tx.OfferSequence,
          offer_id: cancelledOffer?.offer_id,
          taker_gets: cancelledOffer?.taker_gets,
          taker_pays: cancelledOffer?.taker_pays,
          trade_pair: formatTradePair(cancelledOffer?.taker_gets ?? null, cancelledOffer?.taker_pays ?? null),
          reason: 'user_cancelled',
        },
      });
      
      break;
    }
  }
  
  return events;
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  extractOfferFlags,
  extractOfferFills,
  calculateExchangeRate,
  formatTradePair,
  wasOfferPlacedOnBook,
};
