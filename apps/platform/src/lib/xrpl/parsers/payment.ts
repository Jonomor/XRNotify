// =============================================================================
// XRNotify Platform - Payment Transaction Parser
// =============================================================================
// Parses XRPL Payment transactions into normalized events
// =============================================================================

import type { EventType } from '@xrnotify/shared';
import type { 
  RawTransaction, 
  AmountObject, 
  TransactionMeta,
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

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Ripple epoch offset
const RIPPLE_EPOCH_OFFSET = 946684800;

// Payment flags
const PAYMENT_FLAGS = {
  tfNoDirectRipple: 0x00010000,
  tfPartialPayment: 0x00020000,
  tfLimitQuality: 0x00040000,
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

function isXrpAmount(amount: string | AmountObject | undefined): boolean {
  return typeof amount === 'string';
}

function getDeliveredAmount(tx: RawTransaction): ParsedAmount | null {
  // delivered_amount is the canonical way to know what was actually received
  const meta = tx.meta;
  
  if (meta.delivered_amount) {
    return parseAmount(meta.delivered_amount);
  }
  
  // Fallback for older transactions without delivered_amount
  // Only reliable for non-partial payments
  if (tx.Flags && (tx.Flags & PAYMENT_FLAGS.tfPartialPayment)) {
    // Partial payment without delivered_amount - check AffectedNodes
    return findDeliveredAmountFromNodes(tx);
  }
  
  return parseAmount(tx.Amount);
}

function findDeliveredAmountFromNodes(tx: RawTransaction): ParsedAmount | null {
  // For partial payments, look at the actual balance changes
  for (const node of tx.meta.AffectedNodes) {
    const modified = node.ModifiedNode;
    if (!modified) continue;
    
    if (modified.LedgerEntryType === 'AccountRoot') {
      const finalFields = modified.FinalFields as Record<string, unknown> | undefined;
      const prevFields = modified.PreviousFields as Record<string, unknown> | undefined;
      
      if (finalFields?.['Account'] === tx.Destination && prevFields?.['Balance'] && finalFields?.['Balance']) {
        const prevBalance = BigInt(prevFields['Balance'] as string);
        const finalBalance = BigInt(finalFields['Balance'] as string);
        const delivered = finalBalance - prevBalance;
        
        if (delivered > 0) {
          return {
            value: dropsToXrp(delivered.toString()),
            currency: 'XRP',
          };
        }
      }
    }
    
    // For issued currencies, check RippleState nodes
    if (modified.LedgerEntryType === 'RippleState') {
      const finalFields = modified.FinalFields as Record<string, unknown> | undefined;
      const prevFields = modified.PreviousFields as Record<string, unknown> | undefined;
      
      if (finalFields && prevFields && finalFields['Balance'] && prevFields['Balance']) {
        const prevBalance = prevFields['Balance'] as AmountObject;
        const finalBalance = finalFields['Balance'] as AmountObject;
        
        // Calculate difference
        const diff = parseFloat(finalBalance.value) - parseFloat(prevBalance.value);
        if (Math.abs(diff) > 0) {
          return {
            value: Math.abs(diff).toString(),
            currency: finalBalance.currency,
            issuer: finalBalance.issuer,
          };
        }
      }
    }
  }
  
  return null;
}

function isPartialPayment(tx: RawTransaction): boolean {
  return !!(tx.Flags && (tx.Flags & PAYMENT_FLAGS.tfPartialPayment));
}

function extractPathDetails(tx: RawTransaction): {
  has_paths: boolean;
  path_count: number;
} {
  const paths = tx['Paths'] as unknown[][] | undefined;
  return {
    has_paths: !!(paths && paths.length > 0),
    path_count: paths?.length ?? 0,
  };
}

function extractInvoiceId(tx: RawTransaction): string | undefined {
  return tx['InvoiceID'] as string | undefined;
}

function extractMemos(tx: RawTransaction): Array<{
  type?: string;
  data?: string;
}> {
  const memos = tx['Memos'] as Array<{ Memo: { MemoType?: string; MemoData?: string } }> | undefined;
  
  if (!memos || !Array.isArray(memos)) {
    return [];
  }
  
  return memos.map(m => ({
    type: m.Memo?.MemoType ? Buffer.from(m.Memo.MemoType, 'hex').toString('utf8') : undefined,
    data: m.Memo?.MemoData ? Buffer.from(m.Memo.MemoData, 'hex').toString('utf8') : undefined,
  })).filter(m => m.type || m.data);
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse a Payment transaction into normalized events
 */
export function parsePaymentTransaction(tx: RawTransaction): ParsedEvent[] {
  if (tx.TransactionType !== 'Payment') {
    return [];
  }
  
  const sentAmount = parseAmount(tx.Amount);
  const deliveredAmount = getDeliveredAmount(tx);
  const sendMax = parseAmount(tx['SendMax'] as string | AmountObject | undefined);
  
  if (!sentAmount || !deliveredAmount) {
    return [];
  }
  
  // Determine event type based on currency
  const isXrpPayment = isXrpAmount(tx.Amount);
  const eventType: EventType = isXrpPayment ? 'payment.xrp' : 'payment.issued';
  
  // Build payload
  const payload: Record<string, unknown> = {
    // Accounts
    sender: tx.Account,
    receiver: tx.Destination,
    
    // Amounts
    amount: sentAmount,
    delivered_amount: deliveredAmount,
    
    // Payment details
    destination_tag: tx['DestinationTag'],
    source_tag: tx['SourceTag'],
    
    // Flags
    is_partial_payment: isPartialPayment(tx),
    
    // Paths (for cross-currency)
    ...extractPathDetails(tx),
  };
  
  // Add SendMax for cross-currency payments
  if (sendMax) {
    payload['send_max'] = sendMax;
  }

  // Add invoice ID if present
  const invoiceId = extractInvoiceId(tx);
  if (invoiceId) {
    payload['invoice_id'] = invoiceId;
  }

  // Add memos if present
  const memos = extractMemos(tx);
  if (memos.length > 0) {
    payload['memos'] = memos;
  }

  // Check for currency conversion
  if (!isXrpPayment && sendMax) {
    payload['is_cross_currency'] = sendMax.currency !== sentAmount.currency;
  }

  // Add delivered vs sent comparison for partial payments
  if (isPartialPayment(tx)) {
    const sentValue = parseFloat(sentAmount.value);
    const deliveredValue = parseFloat(deliveredAmount.value);

    if (sentValue > 0) {
      payload['delivery_ratio'] = deliveredValue / sentValue;
    }
  }
  
  return [{
    event_type: eventType,
    payload,
  }];
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  parseAmount,
  dropsToXrp,
  getDeliveredAmount,
  isPartialPayment,
  extractMemos,
};
