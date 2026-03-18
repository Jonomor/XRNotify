// =============================================================================
// XRNotify XRPL Listener - NFT Parser
// =============================================================================
// Parses XRPL NFToken transactions into normalized events
// =============================================================================

import type { EventType } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NFTokenMintTransaction {
  TransactionType: 'NFTokenMint';
  Account: string;
  NFTokenTaxon: number;
  Issuer?: string;
  TransferFee?: number;
  URI?: string;
  Flags?: number;
}

export interface NFTokenBurnTransaction {
  TransactionType: 'NFTokenBurn';
  Account: string;
  NFTokenID: string;
  Owner?: string;
}

export interface NFTokenCreateOfferTransaction {
  TransactionType: 'NFTokenCreateOffer';
  Account: string;
  NFTokenID: string;
  Amount: string | { currency: string; issuer: string; value: string };
  Owner?: string;
  Expiration?: number;
  Destination?: string;
  Flags?: number;
}

export interface NFTokenAcceptOfferTransaction {
  TransactionType: 'NFTokenAcceptOffer';
  Account: string;
  NFTokenSellOffer?: string;
  NFTokenBuyOffer?: string;
  NFTokenBrokerFee?: string | { currency: string; issuer: string; value: string };
}

export interface NFTokenCancelOfferTransaction {
  TransactionType: 'NFTokenCancelOffer';
  Account: string;
  NFTokenOffers: string[];
}

export type NFTokenTransaction =
  | NFTokenMintTransaction
  | NFTokenBurnTransaction
  | NFTokenCreateOfferTransaction
  | NFTokenAcceptOfferTransaction
  | NFTokenCancelOfferTransaction;

export interface NFTokenMeta {
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

export interface ParsedNftEvent {
  eventType: EventType;
  payload: Record<string, unknown>;
  subIndex?: number;
}

// -----------------------------------------------------------------------------
// NFToken Flags
// -----------------------------------------------------------------------------

export const NFTokenMintFlags = {
  /** Token may be burned by issuer */
  BURNABLE: 0x00000001,
  /** Only issuer may transfer (unless tfTransferable set) */
  ONLY_XRP: 0x00000002,
  /** Issuer wants transfer fee */
  TRANSFER_FEE: 0x00000004,
  /** Token is transferable */
  TRANSFERABLE: 0x00000008,
} as const;

export const NFTokenCreateOfferFlags = {
  /** This is a sell offer */
  SELL_NFTOKEN: 0x00000001,
} as const;

// -----------------------------------------------------------------------------
// NFTokenID Parsing
// -----------------------------------------------------------------------------

/**
 * Parse NFTokenID to extract components
 * Format: 16 bits flags | 16 bits transfer fee | 32 bits taxon | 160 bits issuer | 32 bits sequence
 */
export function parseNFTokenID(nftokenId: string): {
  flags: number;
  transferFee: number;
  taxon: number;
  issuer: string;
  sequence: number;
} | null {
  if (!nftokenId || nftokenId.length !== 64) {
    return null;
  }

  try {
    // NFTokenID is 256 bits (64 hex chars)
    const flags = parseInt(nftokenId.slice(0, 4), 16);
    const transferFee = parseInt(nftokenId.slice(4, 8), 16);
    const taxon = parseInt(nftokenId.slice(8, 16), 16);
    const issuer = nftokenId.slice(16, 56); // 40 hex chars = 160 bits
    const sequence = parseInt(nftokenId.slice(56, 64), 16);

    return {
      flags,
      transferFee,
      taxon,
      issuer: `r${issuer}`, // Simplified - real conversion needs base58
      sequence,
    };
  } catch {
    return null;
  }
}

/**
 * Check if NFToken is transferable
 */
export function isTransferable(flags: number): boolean {
  return (flags & NFTokenMintFlags.TRANSFERABLE) !== 0;
}

/**
 * Check if NFToken is burnable by issuer
 */
export function isBurnable(flags: number): boolean {
  return (flags & NFTokenMintFlags.BURNABLE) !== 0;
}

/**
 * Calculate transfer fee percentage
 */
export function getTransferFeePercent(transferFee: number): number {
  // Transfer fee is in 1/100,000 units (0-50,000 = 0-50%)
  return transferFee / 1000;
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse NFToken transactions into normalized events
 */
export function parseNft(
  tx: NFTokenTransaction,
  meta?: NFTokenMeta
): ParsedNftEvent[] {
  switch (tx.TransactionType) {
    case 'NFTokenMint':
      return parseNFTokenMint(tx, meta);
    case 'NFTokenBurn':
      return parseNFTokenBurn(tx);
    case 'NFTokenCreateOffer':
      return parseNFTokenCreateOffer(tx);
    case 'NFTokenAcceptOffer':
      return parseNFTokenAcceptOffer(tx, meta);
    case 'NFTokenCancelOffer':
      return parseNFTokenCancelOffer(tx);
    default:
      return [];
  }
}

// -----------------------------------------------------------------------------
// Individual Parsers
// -----------------------------------------------------------------------------

function parseNFTokenMint(
  tx: NFTokenMintTransaction,
  meta?: NFTokenMeta
): ParsedNftEvent[] {
  // Extract minted NFTokenID from meta
  const nftokenId = extractMintedNFTokenID(meta);

  const payload: Record<string, unknown> = {
    account: tx.Account,
    nftoken_id: nftokenId,
    taxon: tx.NFTokenTaxon,
    issuer: tx.Issuer ?? tx.Account,
    transfer_fee: tx.TransferFee,
    flags: tx.Flags,
    transferable: tx.Flags ? isTransferable(tx.Flags) : true,
    burnable: tx.Flags ? isBurnable(tx.Flags) : false,
  };

  // Decode URI if present
  if (tx.URI) {
    payload.uri = tx.URI;
    payload.uri_decoded = decodeURI(tx.URI);
  }

  return [{
    eventType: 'nft.minted',
    payload,
  }];
}

function parseNFTokenBurn(tx: NFTokenBurnTransaction): ParsedNftEvent[] {
  return [{
    eventType: 'nft.burned',
    payload: {
      account: tx.Account,
      nftoken_id: tx.NFTokenID,
      owner: tx.Owner ?? tx.Account,
    },
  }];
}

function parseNFTokenCreateOffer(tx: NFTokenCreateOfferTransaction): ParsedNftEvent[] {
  const isSellOffer = tx.Flags
    ? (tx.Flags & NFTokenCreateOfferFlags.SELL_NFTOKEN) !== 0
    : false;

  const amount = typeof tx.Amount === 'string'
    ? { value: tx.Amount, currency: 'XRP', issuer: undefined }
    : { value: tx.Amount.value, currency: tx.Amount.currency, issuer: tx.Amount.issuer };

  return [{
    eventType: 'nft.offer_created',
    payload: {
      account: tx.Account,
      nftoken_id: tx.NFTokenID,
      offer_type: isSellOffer ? 'sell' : 'buy',
      amount: amount.value,
      currency: amount.currency,
      issuer: amount.issuer,
      owner: tx.Owner,
      destination: tx.Destination,
      expiration: tx.Expiration,
    },
  }];
}

function parseNFTokenAcceptOffer(
  tx: NFTokenAcceptOfferTransaction,
  meta?: NFTokenMeta
): ParsedNftEvent[] {
  const events: ParsedNftEvent[] = [];

  // Determine sale details from meta
  const saleDetails = extractSaleDetails(meta);

  // Main acceptance event
  events.push({
    eventType: 'nft.offer_accepted',
    payload: {
      account: tx.Account,
      sell_offer: tx.NFTokenSellOffer,
      buy_offer: tx.NFTokenBuyOffer,
      broker_fee: tx.NFTokenBrokerFee,
      is_brokered: !!tx.NFTokenBrokerFee,
      ...saleDetails,
    },
  });

  // Also emit transfer event
  events.push({
    eventType: 'nft.transfer',
    payload: {
      account: tx.Account,
      nftoken_id: saleDetails?.nftoken_id,
      from: saleDetails?.seller,
      to: saleDetails?.buyer,
      price: saleDetails?.price,
      currency: saleDetails?.currency,
    },
    subIndex: 1,
  });

  return events;
}

function parseNFTokenCancelOffer(tx: NFTokenCancelOfferTransaction): ParsedNftEvent[] {
  return [{
    eventType: 'nft.offer_cancelled',
    payload: {
      account: tx.Account,
      offer_ids: tx.NFTokenOffers,
      offer_count: tx.NFTokenOffers.length,
    },
  }];
}

// -----------------------------------------------------------------------------
// Meta Extraction Helpers
// -----------------------------------------------------------------------------

function extractMintedNFTokenID(meta?: NFTokenMeta): string | undefined {
  if (!meta?.AffectedNodes) return undefined;

  for (const node of meta.AffectedNodes) {
    // Check ModifiedNode for NFTokenPage
    if ('ModifiedNode' in node) {
      const mn = node.ModifiedNode;
      if (mn.LedgerEntryType === 'NFTokenPage') {
        // Compare FinalFields vs PreviousFields to find new token
        const finalTokens = (mn.FinalFields?.NFTokens as Array<{ NFToken?: { NFTokenID?: string } }>) ?? [];
        const prevTokens = (mn.PreviousFields?.NFTokens as Array<{ NFToken?: { NFTokenID?: string } }>) ?? [];

        // Find token in final that's not in previous
        const prevIds = new Set(prevTokens.map(t => t.NFToken?.NFTokenID));
        for (const token of finalTokens) {
          const id = token.NFToken?.NFTokenID;
          if (id && !prevIds.has(id)) {
            return id;
          }
        }
      }
    }

    // Check CreatedNode for new NFTokenPage
    if ('CreatedNode' in node) {
      const cn = node.CreatedNode;
      if (cn.LedgerEntryType === 'NFTokenPage') {
        const tokens = (cn.NewFields?.NFTokens as Array<{ NFToken?: { NFTokenID?: string } }>) ?? [];
        if (tokens.length > 0) {
          return tokens[0]?.NFToken?.NFTokenID;
        }
      }
    }
  }

  return undefined;
}

function extractSaleDetails(meta?: NFTokenMeta): {
  nftoken_id?: string;
  seller?: string;
  buyer?: string;
  price?: string;
  currency?: string;
} | undefined {
  if (!meta?.AffectedNodes) return undefined;

  let nftokenId: string | undefined;
  let seller: string | undefined;
  let buyer: string | undefined;
  let price: string | undefined;
  let currency: string | undefined;

  for (const node of meta.AffectedNodes) {
    // Look for deleted NFTokenOffer to get sale details
    if ('DeletedNode' in node) {
      const dn = node.DeletedNode;
      if (dn.LedgerEntryType === 'NFTokenOffer') {
        const fields = dn.FinalFields as Record<string, unknown> | undefined;
        if (fields) {
          nftokenId = fields.NFTokenID as string | undefined;
          seller = fields.Owner as string | undefined;

          const amount = fields.Amount;
          if (typeof amount === 'string') {
            price = amount;
            currency = 'XRP';
          } else if (amount && typeof amount === 'object') {
            const amtObj = amount as { value?: string; currency?: string };
            price = amtObj.value;
            currency = amtObj.currency;
          }
        }
      }
    }

    // Look for NFTokenPage changes to find buyer
    if ('ModifiedNode' in node) {
      const mn = node.ModifiedNode;
      if (mn.LedgerEntryType === 'NFTokenPage' && mn.FinalFields) {
        // The account whose page gained the token is the buyer
        // This is complex to determine from the page structure
      }
    }
  }

  return { nftoken_id: nftokenId, seller, buyer, price, currency };
}

// -----------------------------------------------------------------------------
// URI Helpers
// -----------------------------------------------------------------------------

function decodeURI(uri: string): string | null {
  try {
    // URI is hex-encoded
    const bytes = Buffer.from(uri, 'hex');
    return bytes.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Check if URI is an IPFS reference
 */
export function isIpfsUri(uri: string): boolean {
  const decoded = decodeURI(uri);
  if (!decoded) return false;
  return decoded.startsWith('ipfs://') || decoded.startsWith('Qm');
}

/**
 * Extract IPFS CID from URI
 */
export function extractIpfsCid(uri: string): string | null {
  const decoded = decodeURI(uri);
  if (!decoded) return null;

  if (decoded.startsWith('ipfs://')) {
    return decoded.slice(7);
  }
  if (decoded.startsWith('Qm') && decoded.length >= 46) {
    return decoded;
  }
  return null;
}
