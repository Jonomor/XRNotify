/**
 * @fileoverview XRNotify XRPL Event Normalizer
 * Transforms raw XRPL transactions into canonical event schema.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/normalize
 */

import { createModuleLogger } from '../../core/logger.js';
import { uuid, nowISO } from '@xrnotify/shared';
import type { XrplEvent, EventType } from '@xrnotify/shared';
import type { XrplNetwork } from './client.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('xrpl-normalize');

/**
 * Raw XRPL transaction
 */
export interface RawTransaction {
  hash: string;
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | IssuedCurrencyAmount;
  Fee?: string;
  Sequence?: number;
  Flags?: number;
  SourceTag?: number;
  DestinationTag?: number;
  Memos?: Array<{
    Memo: {
      MemoType?: string;
      MemoData?: string;
      MemoFormat?: string;
    };
  }>;
  // TrustSet specific
  LimitAmount?: IssuedCurrencyAmount;
  QualityIn?: number;
  QualityOut?: number;
  // NFT specific
  NFTokenID?: string;
  NFTokenTaxon?: number;
  URI?: string;
  NFTokenOffers?: string[];
  NFTokenSellOffer?: string;
  NFTokenBuyOffer?: string;
  // DEX specific
  TakerGets?: string | IssuedCurrencyAmount;
  TakerPays?: string | IssuedCurrencyAmount;
  OfferSequence?: number;
  Expiration?: number;
  // Escrow specific
  FinishAfter?: number;
  CancelAfter?: number;
  Condition?: string;
  Fulfillment?: string;
  Owner?: string;
  // Check specific
  SendMax?: string | IssuedCurrencyAmount;
  DeliverMin?: string | IssuedCurrencyAmount;
  CheckID?: string;
  // AccountSet specific
  SetFlag?: number;
  ClearFlag?: number;
  Domain?: string;
  EmailHash?: string;
  MessageKey?: string;
  TransferRate?: number;
  TickSize?: number;
  // Meta
  meta?: TransactionMeta;
  validated?: boolean;
  ledger_index?: number;
  date?: number;
  [key: string]: unknown;
}

/**
 * Issued currency amount
 */
export interface IssuedCurrencyAmount {
  currency: string;
  issuer: string;
  value: string;
}

/**
 * Transaction metadata
 */
export interface TransactionMeta {
  TransactionResult: string;
  TransactionIndex: number;
  delivered_amount?: string | IssuedCurrencyAmount;
  AffectedNodes?: AffectedNode[];
  // NFT specific
  nftoken_id?: string;
  nftoken_ids?: string[];
  offer_id?: string;
}

/**
 * Affected node in metadata
 */
export interface AffectedNode {
  CreatedNode?: {
    LedgerEntryType: string;
    LedgerIndex: string;
    NewFields: Record<string, unknown>;
  };
  ModifiedNode?: {
    LedgerEntryType: string;
    LedgerIndex: string;
    FinalFields?: Record<string, unknown>;
    PreviousFields?: Record<string, unknown>;
  };
  DeletedNode?: {
    LedgerEntryType: string;
    LedgerIndex: string;
    FinalFields?: Record<string, unknown>;
  };
}

/**
 * Ledger context for normalization
 */
export interface LedgerContext {
  ledgerIndex: number;
  ledgerHash: string;
  ledgerCloseTime: number; // Ripple epoch seconds
  network: XrplNetwork;
}

/**
 * Normalized amount
 */
export interface NormalizedAmount {
  value: string;
  currency: string;
  issuer: string | null;
  valueDrops: string | null; // For XRP, the drops value
}

/**
 * Parser result
 */
export interface ParseResult {
  eventType: EventType;
  accounts: string[];
  payload: Record<string, unknown>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Ripple epoch offset (seconds from Unix epoch to Ripple epoch)
 */
const RIPPLE_EPOCH_OFFSET = 946684800;

/**
 * Drops per XRP
 */
const DROPS_PER_XRP = 1_000_000;

/**
 * Transaction type to event type mapping
 */
const TX_TYPE_MAP: Record<string, EventType | null> = {
  Payment: null, // Determined by amount type
  TrustSet: null, // Determined by trust line state
  NFTokenMint: 'nft.minted',
  NFTokenBurn: 'nft.burned',
  NFTokenCreateOffer: 'nft.offer_created',
  NFTokenAcceptOffer: 'nft.offer_accepted',
  NFTokenCancelOffer: 'nft.offer_cancelled',
  OfferCreate: 'dex.offer_created',
  OfferCancel: 'dex.offer_cancelled',
  AccountSet: 'account.settings_changed',
  AccountDelete: 'account.deleted',
  EscrowCreate: 'escrow.created',
  EscrowFinish: 'escrow.finished',
  EscrowCancel: 'escrow.cancelled',
  CheckCreate: 'check.created',
  CheckCash: 'check.cashed',
  CheckCancel: 'check.cancelled',
};

// =============================================================================
// Amount Helpers
// =============================================================================

/**
 * Check if amount is XRP (string) or issued currency (object)
 */
export function isXrpAmount(amount: string | IssuedCurrencyAmount | undefined): amount is string {
  return typeof amount === 'string';
}

/**
 * Normalize amount to standard format
 */
export function normalizeAmount(
  amount: string | IssuedCurrencyAmount | undefined
): NormalizedAmount | null {
  if (amount === undefined) {
    return null;
  }

  if (isXrpAmount(amount)) {
    const drops = BigInt(amount);
    const xrp = Number(drops) / DROPS_PER_XRP;
    return {
      value: xrp.toFixed(6),
      currency: 'XRP',
      issuer: null,
      valueDrops: amount,
    };
  }

  return {
    value: amount.value,
    currency: decodeCurrency(amount.currency),
    issuer: amount.issuer,
    valueDrops: null,
  };
}

/**
 * Decode currency code (handle hex-encoded currencies)
 */
export function decodeCurrency(currency: string): string {
  if (currency.length === 3) {
    return currency;
  }

  // Hex-encoded currency (40 hex chars)
  if (currency.length === 40) {
    try {
      // Remove trailing zeros and decode
      const hex = currency.replace(/0+$/, '');
      if (hex.length === 0) {
        return currency;
      }
      const bytes = Buffer.from(hex, 'hex');
      const decoded = bytes.toString('utf8').replace(/\0/g, '');
      return decoded || currency;
    } catch {
      return currency;
    }
  }

  return currency;
}

/**
 * Convert Ripple epoch to ISO timestamp
 */
export function rippleTimeToISO(rippleTime: number): string {
  const unixTime = rippleTime + RIPPLE_EPOCH_OFFSET;
  return new Date(unixTime * 1000).toISOString();
}

/**
 * Get current Ripple epoch time
 */
export function getCurrentRippleTime(): number {
  return Math.floor(Date.now() / 1000) - RIPPLE_EPOCH_OFFSET;
}

// =============================================================================
// Event ID Generation
// =============================================================================

/**
 * Generate deterministic event ID
 *
 * Format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
 */
export function generateEventId(
  ledgerIndex: number,
  txHash: string,
  eventType: EventType,
  subIndex?: number
): string {
  const base = `xrpl:${ledgerIndex}:${txHash}:${eventType}`;
  return subIndex !== undefined ? `${base}:${subIndex}` : base;
}

/**
 * Generate unique event ID with UUID fallback
 */
export function generateUniqueEventId(): string {
  return `evt_${uuid()}`;
}

// =============================================================================
// Account Extraction
// =============================================================================

/**
 * Extract all accounts involved in transaction
 */
export function extractAccounts(tx: RawTransaction): string[] {
  const accounts = new Set<string>();

  // Primary account
  accounts.add(tx.Account);

  // Destination
  if (tx.Destination) {
    accounts.add(tx.Destination);
  }

  // Owner (for escrow/check operations)
  if (tx.Owner) {
    accounts.add(tx.Owner);
  }

  // Issuer from amounts
  if (tx.Amount && !isXrpAmount(tx.Amount)) {
    accounts.add(tx.Amount.issuer);
  }
  if (tx.LimitAmount?.issuer) {
    accounts.add(tx.LimitAmount.issuer);
  }
  if (tx.TakerGets && !isXrpAmount(tx.TakerGets)) {
    accounts.add(tx.TakerGets.issuer);
  }
  if (tx.TakerPays && !isXrpAmount(tx.TakerPays)) {
    accounts.add(tx.TakerPays.issuer);
  }

  // Extract from affected nodes
  if (tx.meta?.AffectedNodes) {
    for (const node of tx.meta.AffectedNodes) {
      const fields =
        node.CreatedNode?.NewFields ??
        node.ModifiedNode?.FinalFields ??
        node.DeletedNode?.FinalFields;

      if (fields) {
        if (typeof fields.Account === 'string') {
          accounts.add(fields.Account);
        }
        if (typeof fields.Destination === 'string') {
          accounts.add(fields.Destination);
        }
        if (typeof fields.Owner === 'string') {
          accounts.add(fields.Owner);
        }
      }
    }
  }

  return [...accounts];
}

// =============================================================================
// Transaction Parsing
// =============================================================================

/**
 * Check if transaction was successful
 */
export function isSuccessful(tx: RawTransaction): boolean {
  const result = tx.meta?.TransactionResult ?? '';
  return result.startsWith('tes');
}

/**
 * Parse Payment transaction
 */
function parsePayment(tx: RawTransaction): ParseResult {
  const amount = normalizeAmount(tx.Amount);
  const deliveredAmount = normalizeAmount(tx.meta?.delivered_amount);

  const isXrp = isXrpAmount(tx.Amount);
  const eventType: EventType = isXrp ? 'payment.xrp' : 'payment.issued';

  const payload: Record<string, unknown> = {
    source: tx.Account,
    destination: tx.Destination,
    amount: amount,
    delivered_amount: deliveredAmount,
    source_tag: tx.SourceTag ?? null,
    destination_tag: tx.DestinationTag ?? null,
    fee: normalizeAmount(tx.Fee),
  };

  // Add memos if present
  if (tx.Memos && tx.Memos.length > 0) {
    payload.memos = tx.Memos.map((m) => ({
      type: m.Memo.MemoType
        ? Buffer.from(m.Memo.MemoType, 'hex').toString('utf8')
        : null,
      data: m.Memo.MemoData
        ? Buffer.from(m.Memo.MemoData, 'hex').toString('utf8')
        : null,
      format: m.Memo.MemoFormat
        ? Buffer.from(m.Memo.MemoFormat, 'hex').toString('utf8')
        : null,
    }));
  }

  return {
    eventType,
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse TrustSet transaction
 */
function parseTrustSet(tx: RawTransaction): ParseResult {
  const limitAmount = tx.LimitAmount;

  if (!limitAmount) {
    return {
      eventType: 'trustline.modified',
      accounts: extractAccounts(tx),
      payload: {
        account: tx.Account,
        result_code: tx.meta?.TransactionResult,
      },
    };
  }

  // Determine event type based on limit value and affected nodes
  let eventType: EventType = 'trustline.modified';

  if (parseFloat(limitAmount.value) === 0) {
    eventType = 'trustline.removed';
  } else if (tx.meta?.AffectedNodes) {
    const isNew = tx.meta.AffectedNodes.some(
      (node) =>
        node.CreatedNode?.LedgerEntryType === 'RippleState'
    );
    if (isNew) {
      eventType = 'trustline.created';
    }
  }

  const payload: Record<string, unknown> = {
    account: tx.Account,
    issuer: limitAmount.issuer,
    currency: decodeCurrency(limitAmount.currency),
    limit: limitAmount.value,
    quality_in: tx.QualityIn ?? null,
    quality_out: tx.QualityOut ?? null,
    no_ripple: (tx.Flags ?? 0) & 0x00020000 ? true : false,
    freeze: (tx.Flags ?? 0) & 0x00100000 ? true : false,
  };

  return {
    eventType,
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse NFTokenMint transaction
 */
function parseNFTokenMint(tx: RawTransaction): ParseResult {
  const tokenId = tx.meta?.nftoken_id ?? tx.NFTokenID;

  return {
    eventType: 'nft.minted',
    accounts: extractAccounts(tx),
    payload: {
      minter: tx.Account,
      token_id: tokenId,
      taxon: tx.NFTokenTaxon,
      uri: tx.URI ? Buffer.from(tx.URI, 'hex').toString('utf8') : null,
      flags: tx.Flags ?? 0,
      transfer_fee: (tx.Flags ?? 0) & 0x0001 ? tx.TransferRate : null,
    },
  };
}

/**
 * Parse NFTokenBurn transaction
 */
function parseNFTokenBurn(tx: RawTransaction): ParseResult {
  return {
    eventType: 'nft.burned',
    accounts: extractAccounts(tx),
    payload: {
      owner: tx.Account,
      token_id: tx.NFTokenID,
    },
  };
}

/**
 * Parse NFTokenCreateOffer transaction
 */
function parseNFTokenCreateOffer(tx: RawTransaction): ParseResult {
  const amount = normalizeAmount(tx.Amount);
  const isSellOffer = (tx.Flags ?? 0) & 0x0001;

  return {
    eventType: 'nft.offer_created',
    accounts: extractAccounts(tx),
    payload: {
      owner: tx.Account,
      token_id: tx.NFTokenID,
      offer_id: tx.meta?.offer_id,
      amount: amount,
      destination: tx.Destination ?? null,
      is_sell_offer: !!isSellOffer,
      expiration: tx.Expiration ? rippleTimeToISO(tx.Expiration) : null,
    },
  };
}

/**
 * Parse NFTokenAcceptOffer transaction
 */
function parseNFTokenAcceptOffer(tx: RawTransaction): ParseResult {
  return {
    eventType: 'nft.offer_accepted',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      sell_offer: tx.NFTokenSellOffer ?? null,
      buy_offer: tx.NFTokenBuyOffer ?? null,
      token_id: tx.meta?.nftoken_id,
    },
  };
}

/**
 * Parse NFTokenCancelOffer transaction
 */
function parseNFTokenCancelOffer(tx: RawTransaction): ParseResult {
  return {
    eventType: 'nft.offer_cancelled',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      token_offers: tx.NFTokenOffers ?? [],
    },
  };
}

/**
 * Parse OfferCreate transaction
 */
function parseOfferCreate(tx: RawTransaction): ParseResult {
  const takerGets = normalizeAmount(tx.TakerGets);
  const takerPays = normalizeAmount(tx.TakerPays);

  // Check if offer was filled
  let eventType: EventType = 'dex.offer_created';
  let fillPercentage = 0;

  if (tx.meta?.AffectedNodes) {
    // Look for deleted offers (filled)
    const deletedOffers = tx.meta.AffectedNodes.filter(
      (node) => node.DeletedNode?.LedgerEntryType === 'Offer'
    );

    const createdOffer = tx.meta.AffectedNodes.find(
      (node) => node.CreatedNode?.LedgerEntryType === 'Offer'
    );

    if (deletedOffers.length > 0 && !createdOffer) {
      // Fully filled
      eventType = 'dex.offer_filled';
      fillPercentage = 100;
    } else if (deletedOffers.length > 0 && createdOffer) {
      // Partially filled
      eventType = 'dex.offer_partially_filled';

      // Calculate fill percentage from remaining amount
      const remainingGets = createdOffer.CreatedNode?.NewFields?.TakerGets;
      if (remainingGets && takerGets) {
        const originalValue = parseFloat(takerGets.value);
        const remainingValue = isXrpAmount(remainingGets as string | IssuedCurrencyAmount)
          ? Number(remainingGets) / DROPS_PER_XRP
          : parseFloat((remainingGets as IssuedCurrencyAmount).value);
        fillPercentage = ((originalValue - remainingValue) / originalValue) * 100;
      }
    }
  }

  return {
    eventType,
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      taker_gets: takerGets,
      taker_pays: takerPays,
      offer_sequence: tx.Sequence,
      expiration: tx.Expiration ? rippleTimeToISO(tx.Expiration) : null,
      flags: tx.Flags ?? 0,
      immediate_or_cancel: (tx.Flags ?? 0) & 0x00020000 ? true : false,
      fill_or_kill: (tx.Flags ?? 0) & 0x00010000 ? true : false,
      sell: (tx.Flags ?? 0) & 0x00080000 ? true : false,
      fill_percentage: fillPercentage,
    },
  };
}

/**
 * Parse OfferCancel transaction
 */
function parseOfferCancel(tx: RawTransaction): ParseResult {
  return {
    eventType: 'dex.offer_cancelled',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      offer_sequence: tx.OfferSequence,
    },
  };
}

/**
 * Parse AccountSet transaction
 */
function parseAccountSet(tx: RawTransaction): ParseResult {
  return {
    eventType: 'account.settings_changed',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      set_flag: tx.SetFlag ?? null,
      clear_flag: tx.ClearFlag ?? null,
      domain: tx.Domain ? Buffer.from(tx.Domain, 'hex').toString('utf8') : null,
      email_hash: tx.EmailHash ?? null,
      message_key: tx.MessageKey ?? null,
      transfer_rate: tx.TransferRate ?? null,
      tick_size: tx.TickSize ?? null,
    },
  };
}

/**
 * Parse AccountDelete transaction
 */
function parseAccountDelete(tx: RawTransaction): ParseResult {
  return {
    eventType: 'account.deleted',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      destination: tx.Destination,
      destination_tag: tx.DestinationTag ?? null,
    },
  };
}

/**
 * Parse EscrowCreate transaction
 */
function parseEscrowCreate(tx: RawTransaction): ParseResult {
  return {
    eventType: 'escrow.created',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      destination: tx.Destination,
      amount: normalizeAmount(tx.Amount),
      finish_after: tx.FinishAfter ? rippleTimeToISO(tx.FinishAfter) : null,
      cancel_after: tx.CancelAfter ? rippleTimeToISO(tx.CancelAfter) : null,
      condition: tx.Condition ?? null,
      destination_tag: tx.DestinationTag ?? null,
      source_tag: tx.SourceTag ?? null,
    },
  };
}

/**
 * Parse EscrowFinish transaction
 */
function parseEscrowFinish(tx: RawTransaction): ParseResult {
  return {
    eventType: 'escrow.finished',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      owner: tx.Owner,
      offer_sequence: tx.OfferSequence,
      fulfillment: tx.Fulfillment ?? null,
      condition: tx.Condition ?? null,
    },
  };
}

/**
 * Parse EscrowCancel transaction
 */
function parseEscrowCancel(tx: RawTransaction): ParseResult {
  return {
    eventType: 'escrow.cancelled',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      owner: tx.Owner,
      offer_sequence: tx.OfferSequence,
    },
  };
}

/**
 * Parse CheckCreate transaction
 */
function parseCheckCreate(tx: RawTransaction): ParseResult {
  return {
    eventType: 'check.created',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      destination: tx.Destination,
      send_max: normalizeAmount(tx.SendMax),
      expiration: tx.Expiration ? rippleTimeToISO(tx.Expiration) : null,
      destination_tag: tx.DestinationTag ?? null,
      source_tag: tx.SourceTag ?? null,
    },
  };
}

/**
 * Parse CheckCash transaction
 */
function parseCheckCash(tx: RawTransaction): ParseResult {
  return {
    eventType: 'check.cashed',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      check_id: tx.CheckID,
      amount: normalizeAmount(tx.Amount),
      deliver_min: normalizeAmount(tx.DeliverMin),
    },
  };
}

/**
 * Parse CheckCancel transaction
 */
function parseCheckCancel(tx: RawTransaction): ParseResult {
  return {
    eventType: 'check.cancelled',
    accounts: extractAccounts(tx),
    payload: {
      account: tx.Account,
      check_id: tx.CheckID,
    },
  };
}

// =============================================================================
// Main Normalizer
// =============================================================================

/**
 * Parse raw transaction into parse result
 */
export function parseTransaction(tx: RawTransaction): ParseResult | null {
  switch (tx.TransactionType) {
    case 'Payment':
      return parsePayment(tx);
    case 'TrustSet':
      return parseTrustSet(tx);
    case 'NFTokenMint':
      return parseNFTokenMint(tx);
    case 'NFTokenBurn':
      return parseNFTokenBurn(tx);
    case 'NFTokenCreateOffer':
      return parseNFTokenCreateOffer(tx);
    case 'NFTokenAcceptOffer':
      return parseNFTokenAcceptOffer(tx);
    case 'NFTokenCancelOffer':
      return parseNFTokenCancelOffer(tx);
    case 'OfferCreate':
      return parseOfferCreate(tx);
    case 'OfferCancel':
      return parseOfferCancel(tx);
    case 'AccountSet':
      return parseAccountSet(tx);
    case 'AccountDelete':
      return parseAccountDelete(tx);
    case 'EscrowCreate':
      return parseEscrowCreate(tx);
    case 'EscrowFinish':
      return parseEscrowFinish(tx);
    case 'EscrowCancel':
      return parseEscrowCancel(tx);
    case 'CheckCreate':
      return parseCheckCreate(tx);
    case 'CheckCash':
      return parseCheckCash(tx);
    case 'CheckCancel':
      return parseCheckCancel(tx);
    default:
      // Unknown transaction type
      logger.debug({ txType: tx.TransactionType }, 'Unknown transaction type');
      return null;
  }
}

/**
 * Normalize raw transaction to XrplEvent
 */
export function normalizeTransaction(
  tx: RawTransaction,
  context: LedgerContext
): XrplEvent | null {
  // Only process successful transactions
  if (!isSuccessful(tx)) {
    return null;
  }

  // Parse transaction
  const result = parseTransaction(tx);
  if (!result) {
    return null;
  }

  // Build canonical event
  const event: XrplEvent = {
    id: generateEventId(context.ledgerIndex, tx.hash, result.eventType),
    event_type: result.eventType,
    ledger_index: context.ledgerIndex,
    tx_hash: tx.hash,
    network: context.network,
    timestamp: rippleTimeToISO(context.ledgerCloseTime),
    account_context: result.accounts,
    payload: result.payload,
    result_code: tx.meta?.TransactionResult,
  };

  return event;
}

/**
 * Normalize multiple transactions from a ledger
 */
export function normalizeLedger(
  transactions: RawTransaction[],
  context: LedgerContext
): XrplEvent[] {
  const events: XrplEvent[] = [];

  for (const tx of transactions) {
    const event = normalizeTransaction(tx, context);
    if (event) {
      events.push(event);
    }
  }

  logger.debug(
    { ledgerIndex: context.ledgerIndex, txCount: transactions.length, eventCount: events.length },
    'Ledger normalized'
  );

  return events;
}

// =============================================================================
// Export
// =============================================================================

export default {
  normalizeTransaction,
  normalizeLedger,
  parseTransaction,
  generateEventId,
  generateUniqueEventId,
  extractAccounts,
  normalizeAmount,
  decodeCurrency,
  rippleTimeToISO,
  isSuccessful,
  isXrpAmount,
};
