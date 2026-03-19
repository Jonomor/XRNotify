// =============================================================================
// XRNotify Platform - NFT Transaction Parser
// =============================================================================
// Parses XRPL NFToken transactions into normalized events
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

interface NftOffer {
  offer_id: string;
  owner: string;
  nftoken_id: string;
  amount: ParsedAmount | null;
  destination?: string;
  expiration?: number;
  is_sell_offer: boolean;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// NFTokenMint flags
const NFTOKEN_MINT_FLAGS = {
  tfBurnable: 0x00000001,
  tfOnlyXRP: 0x00000002,
  tfTrustLine: 0x00000004,
  tfTransferable: 0x00000008,
};

// NFTokenCreateOffer flags
const NFTOKEN_OFFER_FLAGS = {
  tfSellNFToken: 0x00000001,
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

function extractNftokenId(tx: RawTransaction): string | null {
  // First check the meta for the canonical nftoken_id
  if (tx.meta.nftoken_id) {
    return tx.meta.nftoken_id;
  }
  
  // For NFTokenMint, extract from AffectedNodes
  if (tx.TransactionType === 'NFTokenMint') {
    return extractMintedTokenId(tx);
  }
  
  // For other transactions, use NFTokenID field
  return tx.NFTokenID ?? null;
}

function extractMintedTokenId(tx: RawTransaction): string | null {
  // Look for created or modified NFTokenPage
  for (const node of tx.meta.AffectedNodes) {
    const change = node.CreatedNode ?? node.ModifiedNode;
    if (!change || change.LedgerEntryType !== 'NFTokenPage') continue;
    
    const fields = change.NewFields ?? change.FinalFields;
    if (!fields) continue;
    
    const nftokens = fields['NFTokens'] as Array<{ NFToken: { NFTokenID: string } }> | undefined;
    if (!nftokens || !Array.isArray(nftokens)) continue;

    // For modified pages, we need to find the new token
    if (node.ModifiedNode) {
      const prevFields = change.PreviousFields as Record<string, unknown> | undefined;
      const prevTokens = prevFields?.['NFTokens'] as Array<{ NFToken: { NFTokenID: string } }> | undefined;
      const prevIds = new Set(prevTokens?.map(t => t.NFToken.NFTokenID) ?? []);

      for (const token of nftokens) {
        if (!prevIds.has(token.NFToken.NFTokenID)) {
          return token.NFToken.NFTokenID;
        }
      }
    } else {
      // For newly created pages, return the first token (usually only one)
      if (nftokens.length > 0) {
        return nftokens[0]!.NFToken.NFTokenID;
      }
    }
  }
  
  return null;
}

function extractMintFlags(flags: number | undefined): {
  is_burnable: boolean;
  is_only_xrp: boolean;
  is_trustline: boolean;
  is_transferable: boolean;
} {
  const f = flags ?? 0;
  return {
    is_burnable: !!(f & NFTOKEN_MINT_FLAGS.tfBurnable),
    is_only_xrp: !!(f & NFTOKEN_MINT_FLAGS.tfOnlyXRP),
    is_trustline: !!(f & NFTOKEN_MINT_FLAGS.tfTrustLine),
    is_transferable: !!(f & NFTOKEN_MINT_FLAGS.tfTransferable),
  };
}

function isSellOffer(flags: number | undefined): boolean {
  return !!(flags && (flags & NFTOKEN_OFFER_FLAGS.tfSellNFToken));
}

function extractOfferDetails(tx: RawTransaction): NftOffer | null {
  const nftokenId = tx.NFTokenID;
  if (!nftokenId) return null;
  
  // Get offer ID from meta
  let offerId = tx.meta.offer_id;
  
  // If not in meta, look for created NFTokenOffer node
  if (!offerId) {
    for (const node of tx.meta.AffectedNodes) {
      if (node.CreatedNode?.LedgerEntryType === 'NFTokenOffer') {
        offerId = node.CreatedNode.LedgerIndex;
        break;
      }
    }
  }
  
  if (!offerId) return null;
  
  return {
    offer_id: offerId,
    owner: tx.Account,
    nftoken_id: nftokenId,
    amount: parseAmount(tx.Amount),
    destination: tx.Destination,
    expiration: tx['Expiration'] as number | undefined,
    is_sell_offer: isSellOffer(tx.Flags),
  };
}

function extractAcceptedOfferDetails(tx: RawTransaction): {
  sell_offer?: NftOffer;
  buy_offer?: NftOffer;
  nftoken_id: string | null;
  seller: string | null;
  buyer: string | null;
  broker?: string;
  price: ParsedAmount | null;
} {
  const result: ReturnType<typeof extractAcceptedOfferDetails> = {
    nftoken_id: null,
    seller: null,
    buyer: null,
    price: null,
  };
  
  // Look for deleted NFTokenOffer nodes to get offer details
  for (const node of tx.meta.AffectedNodes) {
    if (node.DeletedNode?.LedgerEntryType !== 'NFTokenOffer') continue;
    
    const fields = node.DeletedNode.FinalFields as Record<string, unknown> | undefined;
    if (!fields) continue;
    
    const offer: NftOffer = {
      offer_id: node.DeletedNode.LedgerIndex,
      owner: fields['Owner'] as string,
      nftoken_id: fields['NFTokenID'] as string,
      amount: parseAmount(fields['Amount'] as string | AmountObject),
      destination: fields['Destination'] as string | undefined,
      is_sell_offer: !!((fields['Flags'] as number) & NFTOKEN_OFFER_FLAGS.tfSellNFToken),
    };
    
    if (offer.is_sell_offer) {
      result.sell_offer = offer;
      result.seller = offer.owner;
      result.nftoken_id = offer.nftoken_id;
      result.price = offer.amount;
    } else {
      result.buy_offer = offer;
      result.buyer = offer.owner;
      if (!result.nftoken_id) result.nftoken_id = offer.nftoken_id;
      if (!result.price) result.price = offer.amount;
    }
  }
  
  // Determine buyer/seller based on transaction account and offers
  if (tx.NFTokenSellOffer && !tx.NFTokenBuyOffer) {
    // Buyer is accepting a sell offer
    result.buyer = tx.Account;
  } else if (tx.NFTokenBuyOffer && !tx.NFTokenSellOffer) {
    // Seller is accepting a buy offer
    result.seller = tx.Account;
  } else if (tx.NFTokenSellOffer && tx.NFTokenBuyOffer) {
    // Brokered transaction
    result.broker = tx.Account;
  }
  
  return result;
}

function extractCancelledOfferIds(tx: RawTransaction): string[] {
  const offerIds: string[] = [];
  
  // From NFTokenOffers array in transaction
  const offers = tx.NFTokenOffers as string[] | undefined;
  if (offers && Array.isArray(offers)) {
    offerIds.push(...offers);
  }
  
  // Also check deleted nodes
  for (const node of tx.meta.AffectedNodes) {
    if (node.DeletedNode?.LedgerEntryType === 'NFTokenOffer') {
      offerIds.push(node.DeletedNode.LedgerIndex);
    }
  }
  
  return [...new Set(offerIds)];
}

function extractUri(tx: RawTransaction): string | undefined {
  const uri = tx['URI'] as string | undefined;
  if (!uri) return undefined;
  
  try {
    return Buffer.from(uri, 'hex').toString('utf8');
  } catch {
    return uri;
  }
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse an NFToken transaction into normalized events
 */
export function parseNftTransaction(tx: RawTransaction): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  
  switch (tx.TransactionType) {
    case 'NFTokenMint': {
      const nftokenId = extractNftokenId(tx);
      const flags = extractMintFlags(tx.Flags);
      
      events.push({
        event_type: 'nft.minted',
        payload: {
          nftoken_id: nftokenId,
          issuer: tx.Account,
          uri: extractUri(tx),
          taxon: tx['NFTokenTaxon'],
          transfer_fee: tx['TransferFee'], // In basis points (1/10000)
          ...flags,
        },
      });
      break;
    }
    
    case 'NFTokenBurn': {
      const nftokenId = extractNftokenId(tx);
      
      events.push({
        event_type: 'nft.burned',
        payload: {
          nftoken_id: nftokenId,
          burner: tx.Account,
          owner: tx['Owner'] ?? tx.Account,
        },
      });
      break;
    }
    
    case 'NFTokenCreateOffer': {
      const offer = extractOfferDetails(tx);
      
      events.push({
        event_type: 'nft.offer_created',
        payload: {
          offer_id: offer?.offer_id,
          nftoken_id: offer?.nftoken_id,
          owner: tx.Account,
          amount: offer?.amount,
          destination: offer?.destination,
          expiration: offer?.expiration,
          is_sell_offer: offer?.is_sell_offer ?? false,
        },
      });
      break;
    }
    
    case 'NFTokenAcceptOffer': {
      const details = extractAcceptedOfferDetails(tx);
      
      // Main sale event
      events.push({
        event_type: 'nft.offer_accepted',
        payload: {
          nftoken_id: details.nftoken_id,
          seller: details.seller,
          buyer: details.buyer,
          price: details.price,
          broker: details.broker,
          sell_offer_id: tx.NFTokenSellOffer,
          buy_offer_id: tx.NFTokenBuyOffer,
          broker_fee: parseAmount(tx['NFTokenBrokerFee'] as string | AmountObject | undefined),
        },
      });
      
      // Also emit transfer event
      if (details.seller && details.buyer && details.nftoken_id) {
        events.push({
          event_type: 'nft.transfer',
          payload: {
            nftoken_id: details.nftoken_id,
            from: details.seller,
            to: details.buyer,
            price: details.price,
            is_sale: true,
          },
          sub_index: 1,
        });
      }
      break;
    }
    
    case 'NFTokenCancelOffer': {
      const cancelledIds = extractCancelledOfferIds(tx);
      
      // Emit event for each cancelled offer
      cancelledIds.forEach((offerId, index) => {
        events.push({
          event_type: 'nft.offer_cancelled',
          payload: {
            offer_id: offerId,
            account: tx.Account,
          },
          sub_index: index > 0 ? index : undefined,
        });
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
  extractNftokenId,
  extractMintFlags,
  extractOfferDetails,
  extractAcceptedOfferDetails,
  isSellOffer,
};
