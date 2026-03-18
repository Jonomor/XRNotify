/**
 * @fileoverview XRNotify NFT Transaction Parser
 * Parses XRPL NFToken transactions into normalized events.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/parsers/nft
 */

import { createModuleLogger } from '../../../core/logger.js';
import {
  type RawTransaction,
  type ParseResult,
  type AffectedNode,
  normalizeAmount,
  extractAccounts,
  decodeCurrency,
} from '../normalize.js';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('parser-nft');

/**
 * NFT token details
 */
export interface NFTokenDetails {
  tokenId: string;
  issuer: string;
  taxon: number;
  transferFee: number;
  flags: number;
  serial: number;
  uri: string | null;
}

/**
 * NFT offer details
 */
export interface NFTokenOfferDetails {
  offerId: string;
  tokenId: string;
  owner: string;
  amount: {
    value: string;
    currency: string;
    issuer: string | null;
  } | null;
  destination: string | null;
  expiration: number | null;
  isSellOffer: boolean;
}

/**
 * NFT trade details (for accepted offers)
 */
export interface NFTokenTradeDetails {
  tokenId: string;
  seller: string;
  buyer: string;
  amount: {
    value: string;
    currency: string;
    issuer: string | null;
  } | null;
  sellOfferId: string | null;
  buyOfferId: string | null;
  brokerFee: {
    value: string;
    currency: string;
    issuer: string | null;
  } | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * NFTokenMint flags
 */
const NFTokenMintFlags = {
  tfBurnable: 0x0001,
  tfOnlyXRP: 0x0002,
  tfTrustLine: 0x0004,
  tfTransferable: 0x0008,
} as const;

/**
 * NFTokenCreateOffer flags
 */
const NFTokenCreateOfferFlags = {
  tfSellNFToken: 0x0001,
} as const;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Decode hex URI to string
 */
function decodeUri(hexUri: string | undefined): string | null {
  if (!hexUri) {
    return null;
  }
  try {
    return Buffer.from(hexUri, 'hex').toString('utf8');
  } catch {
    return hexUri; // Return as-is if decoding fails
  }
}

/**
 * Parse NFTokenID to extract components
 * 
 * NFTokenID structure (256 bits / 64 hex chars):
 * - Flags: 16 bits
 * - Transfer fee: 16 bits
 * - Issuer: 160 bits
 * - Taxon: 32 bits (scrambled)
 * - Serial: 32 bits
 */
export function parseNFTokenId(tokenId: string): NFTokenDetails | null {
  if (!tokenId || tokenId.length !== 64) {
    return null;
  }

  try {
    const flags = parseInt(tokenId.substring(0, 4), 16);
    const transferFee = parseInt(tokenId.substring(4, 8), 16);
    const issuer = 'r' + tokenId.substring(8, 48); // Simplified - actual conversion is complex
    const taxonScrambled = parseInt(tokenId.substring(48, 56), 16);
    const serial = parseInt(tokenId.substring(56, 64), 16);

    // Unscramble taxon (XOR with serial bits)
    const taxon = taxonScrambled ^ serial;

    return {
      tokenId,
      issuer,
      taxon,
      transferFee: transferFee / 10000, // Convert to percentage
      flags,
      serial,
      uri: null, // URI not stored in token ID
    };
  } catch {
    return null;
  }
}

/**
 * Extract NFToken ID from metadata
 */
function extractNFTokenId(tx: RawTransaction): string | null {
  // Check direct field
  if (tx.NFTokenID) {
    return tx.NFTokenID;
  }

  // Check metadata
  if (tx.meta?.nftoken_id) {
    return tx.meta.nftoken_id;
  }

  // Check affected nodes for minted token
  if (tx.meta?.AffectedNodes) {
    for (const node of tx.meta.AffectedNodes) {
      if (node.ModifiedNode?.LedgerEntryType === 'NFTokenPage') {
        const finalFields = node.ModifiedNode.FinalFields as Record<string, unknown> | undefined;
        const previousFields = node.ModifiedNode.PreviousFields as Record<string, unknown> | undefined;

        if (finalFields?.NFTokens && previousFields?.NFTokens) {
          const finalTokens = finalFields.NFTokens as Array<{ NFToken: { NFTokenID: string } }>;
          const prevTokens = previousFields.NFTokens as Array<{ NFToken: { NFTokenID: string } }>;

          // Find the new token (in final but not in previous)
          for (const ft of finalTokens) {
            const exists = prevTokens.some(
              (pt) => pt.NFToken.NFTokenID === ft.NFToken.NFTokenID
            );
            if (!exists) {
              return ft.NFToken.NFTokenID;
            }
          }
        }
      }

      // Check created page
      if (node.CreatedNode?.LedgerEntryType === 'NFTokenPage') {
        const newFields = node.CreatedNode.NewFields as Record<string, unknown> | undefined;
        if (newFields?.NFTokens) {
          const tokens = newFields.NFTokens as Array<{ NFToken: { NFTokenID: string } }>;
          if (tokens.length > 0) {
            return tokens[0]!.NFToken.NFTokenID;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Extract offer ID from metadata
 */
function extractOfferId(tx: RawTransaction): string | null {
  if (tx.meta?.offer_id) {
    return tx.meta.offer_id;
  }

  if (tx.meta?.AffectedNodes) {
    for (const node of tx.meta.AffectedNodes) {
      if (node.CreatedNode?.LedgerEntryType === 'NFTokenOffer') {
        return node.CreatedNode.LedgerIndex;
      }
    }
  }

  return null;
}

/**
 * Extract offer details from affected nodes
 */
function extractOfferFromNodes(
  nodes: AffectedNode[],
  offerId: string
): NFTokenOfferDetails | null {
  for (const node of nodes) {
    const created = node.CreatedNode;
    const deleted = node.DeletedNode;

    const entry = created ?? deleted;
    if (!entry || entry.LedgerEntryType !== 'NFTokenOffer') {
      continue;
    }

    if (entry.LedgerIndex !== offerId) {
      continue;
    }

    const fields = (created?.NewFields ?? deleted?.FinalFields) as Record<string, unknown> | undefined;
    if (!fields) {
      continue;
    }

    const amount = fields.Amount;
    let normalizedAmount = null;

    if (amount) {
      if (typeof amount === 'string') {
        const drops = BigInt(amount);
        normalizedAmount = {
          value: (Number(drops) / 1_000_000).toFixed(6),
          currency: 'XRP',
          issuer: null,
        };
      } else {
        const issued = amount as { currency: string; issuer: string; value: string };
        normalizedAmount = {
          value: issued.value,
          currency: decodeCurrency(issued.currency),
          issuer: issued.issuer,
        };
      }
    }

    return {
      offerId,
      tokenId: fields.NFTokenID as string,
      owner: fields.Owner as string,
      amount: normalizedAmount,
      destination: (fields.Destination as string) ?? null,
      expiration: (fields.Expiration as number) ?? null,
      isSellOffer: !!(fields.Flags as number ?? 0 & NFTokenCreateOfferFlags.tfSellNFToken),
    };
  }

  return null;
}

/**
 * Extract trade details from NFTokenAcceptOffer
 */
function extractTradeDetails(tx: RawTransaction): NFTokenTradeDetails | null {
  if (!tx.meta?.AffectedNodes) {
    return null;
  }

  const tokenId = extractNFTokenId(tx);
  if (!tokenId) {
    return null;
  }

  let seller: string | null = null;
  let buyer: string | null = null;
  let amount: NFTokenTradeDetails['amount'] = null;
  let sellOfferId = tx.NFTokenSellOffer ?? null;
  let buyOfferId = tx.NFTokenBuyOffer ?? null;

  // Find deleted offers to extract trade details
  for (const node of tx.meta.AffectedNodes) {
    if (node.DeletedNode?.LedgerEntryType === 'NFTokenOffer') {
      const fields = node.DeletedNode.FinalFields as Record<string, unknown>;
      const flags = fields.Flags as number ?? 0;
      const isSellOffer = !!(flags & NFTokenCreateOfferFlags.tfSellNFToken);

      if (isSellOffer) {
        seller = fields.Owner as string;
        sellOfferId = node.DeletedNode.LedgerIndex;
      } else {
        buyer = fields.Owner as string;
        buyOfferId = node.DeletedNode.LedgerIndex;

        // Get amount from buy offer
        const offerAmount = fields.Amount;
        if (offerAmount) {
          if (typeof offerAmount === 'string') {
            amount = {
              value: (Number(BigInt(offerAmount)) / 1_000_000).toFixed(6),
              currency: 'XRP',
              issuer: null,
            };
          } else {
            const issued = offerAmount as { currency: string; issuer: string; value: string };
            amount = {
              value: issued.value,
              currency: decodeCurrency(issued.currency),
              issuer: issued.issuer,
            };
          }
        }
      }
    }
  }

  // If only one offer, determine roles
  if (!seller && !buyer) {
    // Check who initiated
    const initiator = tx.Account;

    if (sellOfferId && !buyOfferId) {
      // Accepting a sell offer - initiator is buyer
      buyer = initiator;
    } else if (buyOfferId && !sellOfferId) {
      // Accepting a buy offer - initiator is seller
      seller = initiator;
    }
  }

  // Fill missing roles
  if (!seller) {
    seller = tx.Account;
  }
  if (!buyer) {
    buyer = tx.Account;
  }

  return {
    tokenId,
    seller,
    buyer,
    amount,
    sellOfferId,
    buyOfferId,
    brokerFee: null, // TODO: Extract broker fee if present
  };
}

/**
 * Get mint flags description
 */
export function getMintFlags(flags: number): {
  burnable: boolean;
  onlyXRP: boolean;
  trustLine: boolean;
  transferable: boolean;
} {
  return {
    burnable: !!(flags & NFTokenMintFlags.tfBurnable),
    onlyXRP: !!(flags & NFTokenMintFlags.tfOnlyXRP),
    trustLine: !!(flags & NFTokenMintFlags.tfTrustLine),
    transferable: !!(flags & NFTokenMintFlags.tfTransferable),
  };
}

// =============================================================================
// Parsers
// =============================================================================

/**
 * Parse NFTokenMint transaction
 */
export function parseNFTokenMint(tx: RawTransaction): ParseResult {
  const tokenId = extractNFTokenId(tx);
  const flags = tx.Flags ?? 0;
  const mintFlags = getMintFlags(flags);

  const payload: Record<string, unknown> = {
    minter: tx.Account,
    token_id: tokenId,
    taxon: tx.NFTokenTaxon ?? 0,
    uri: decodeUri(tx.URI),
    flags: flags,
    burnable: mintFlags.burnable,
    only_xrp: mintFlags.onlyXRP,
    trust_line: mintFlags.trustLine,
    transferable: mintFlags.transferable,
    transfer_fee: tx.TransferFee ? tx.TransferFee / 10000 : 0, // Convert to percentage
    issuer: tx.Issuer ?? tx.Account,
  };

  logger.debug(
    { txHash: tx.hash, tokenId, minter: tx.Account },
    'NFTokenMint parsed'
  );

  return {
    eventType: 'nft.minted',
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse NFTokenBurn transaction
 */
export function parseNFTokenBurn(tx: RawTransaction): ParseResult {
  const payload: Record<string, unknown> = {
    owner: tx.Account,
    token_id: tx.NFTokenID,
    burner: tx.Account,
  };

  // Extract token details if available
  const tokenDetails = parseNFTokenId(tx.NFTokenID!);
  if (tokenDetails) {
    payload.issuer = tokenDetails.issuer;
    payload.taxon = tokenDetails.taxon;
    payload.serial = tokenDetails.serial;
  }

  logger.debug(
    { txHash: tx.hash, tokenId: tx.NFTokenID, burner: tx.Account },
    'NFTokenBurn parsed'
  );

  return {
    eventType: 'nft.burned',
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse NFTokenCreateOffer transaction
 */
export function parseNFTokenCreateOffer(tx: RawTransaction): ParseResult {
  const flags = tx.Flags ?? 0;
  const isSellOffer = !!(flags & NFTokenCreateOfferFlags.tfSellNFToken);
  const amount = normalizeAmount(tx.Amount);
  const offerId = extractOfferId(tx);

  const payload: Record<string, unknown> = {
    owner: tx.Account,
    token_id: tx.NFTokenID,
    offer_id: offerId,
    amount: amount,
    is_sell_offer: isSellOffer,
    destination: tx.Destination ?? null,
    expiration: tx.Expiration ?? null,
    flags: flags,
  };

  // Add offer type description
  payload.offer_type = isSellOffer ? 'sell' : 'buy';

  logger.debug(
    {
      txHash: tx.hash,
      tokenId: tx.NFTokenID,
      offerId,
      offerType: payload.offer_type,
    },
    'NFTokenCreateOffer parsed'
  );

  return {
    eventType: 'nft.offer_created',
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse NFTokenAcceptOffer transaction
 */
export function parseNFTokenAcceptOffer(tx: RawTransaction): ParseResult {
  const tokenId = extractNFTokenId(tx);
  const tradeDetails = extractTradeDetails(tx);

  const payload: Record<string, unknown> = {
    account: tx.Account,
    token_id: tokenId,
    sell_offer: tx.NFTokenSellOffer ?? null,
    buy_offer: tx.NFTokenBuyOffer ?? null,
  };

  // Add trade details if available
  if (tradeDetails) {
    payload.seller = tradeDetails.seller;
    payload.buyer = tradeDetails.buyer;
    payload.amount = tradeDetails.amount;
    payload.trade_type = tx.NFTokenSellOffer ? 'accept_sell' : 'accept_buy';
  }

  // Determine if this is a brokered trade
  if (tx.NFTokenSellOffer && tx.NFTokenBuyOffer) {
    payload.is_brokered = true;
    payload.broker = tx.Account;
    payload.broker_fee = normalizeAmount(tx.NFTokenBrokerFee as string | undefined);
  } else {
    payload.is_brokered = false;
  }

  logger.debug(
    {
      txHash: tx.hash,
      tokenId,
      sellOffer: tx.NFTokenSellOffer,
      buyOffer: tx.NFTokenBuyOffer,
      isBrokered: payload.is_brokered,
    },
    'NFTokenAcceptOffer parsed'
  );

  return {
    eventType: 'nft.offer_accepted',
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse NFTokenCancelOffer transaction
 */
export function parseNFTokenCancelOffer(tx: RawTransaction): ParseResult {
  const offerIds = tx.NFTokenOffers ?? [];

  // Extract details of cancelled offers
  const cancelledOffers: Array<{
    offer_id: string;
    token_id: string | null;
    amount: unknown;
    is_sell_offer: boolean | null;
  }> = [];

  if (tx.meta?.AffectedNodes) {
    for (const offerId of offerIds) {
      const offerDetails = extractOfferFromNodes(tx.meta.AffectedNodes, offerId);
      if (offerDetails) {
        cancelledOffers.push({
          offer_id: offerDetails.offerId,
          token_id: offerDetails.tokenId,
          amount: offerDetails.amount,
          is_sell_offer: offerDetails.isSellOffer,
        });
      } else {
        cancelledOffers.push({
          offer_id: offerId,
          token_id: null,
          amount: null,
          is_sell_offer: null,
        });
      }
    }
  }

  const payload: Record<string, unknown> = {
    account: tx.Account,
    offer_ids: offerIds,
    offers_cancelled: cancelledOffers.length,
    cancelled_offers: cancelledOffers,
  };

  logger.debug(
    { txHash: tx.hash, offerIds, cancelledCount: cancelledOffers.length },
    'NFTokenCancelOffer parsed'
  );

  return {
    eventType: 'nft.offer_cancelled',
    accounts: extractAccounts(tx),
    payload,
  };
}

/**
 * Parse any NFT transaction
 */
export function parseNFTTransaction(tx: RawTransaction): ParseResult | null {
  switch (tx.TransactionType) {
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
    default:
      return null;
  }
}

/**
 * Check if transaction is NFT-related
 */
export function isNFTTransaction(tx: RawTransaction): boolean {
  return tx.TransactionType.startsWith('NFToken');
}

/**
 * Get NFT event type from transaction type
 */
export function getNFTEventType(txType: string): EventType | null {
  const mapping: Record<string, EventType> = {
    NFTokenMint: 'nft.minted',
    NFTokenBurn: 'nft.burned',
    NFTokenCreateOffer: 'nft.offer_created',
    NFTokenAcceptOffer: 'nft.offer_accepted',
    NFTokenCancelOffer: 'nft.offer_cancelled',
  };
  return mapping[txType] ?? null;
}

// =============================================================================
// Export
// =============================================================================

export default {
  parseNFTokenMint,
  parseNFTokenBurn,
  parseNFTokenCreateOffer,
  parseNFTokenAcceptOffer,
  parseNFTokenCancelOffer,
  parseNFTTransaction,
  parseNFTokenId,
  isNFTTransaction,
  getNFTEventType,
  getMintFlags,
};
