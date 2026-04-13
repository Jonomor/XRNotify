import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NFT Events - XRNotify Docs',
  description: 'Reference for XRNotify NFT event types: nft.minted, nft.burned, nft.offer_created, nft.offer_accepted, nft.offer_cancelled. Full payload schemas and examples.',
};

export default function NftEventsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500 hover:text-zinc-300">Event Types</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">NFT Events</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Event Types
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">NFT Events</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            XRNotify tracks the full lifecycle of Non-Fungible Tokens on the XRPL. Five event types cover every stage, from minting to burning, and the entire offer marketplace. Use <code className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-base">nft.*</code> to subscribe to all of them with a single wildcard.
          </p>
        </div>

        {/* Event index */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-12">
          {['nft.minted', 'nft.burned', 'nft.offer_created', 'nft.offer_accepted', 'nft.offer_cancelled'].map((e) => (
            <span key={e} className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 text-center">{e}</span>
          ))}
        </div>

        {/* nft.minted */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">nft.minted</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">NFTokenMint</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">NFTokenMint</code> transaction is validated. This includes mints by the token owner as well as authorized mints where an issuer delegates minting to another account.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-44">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">nft_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Unique 64-character hex identifier for this NFT on the ledger</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">issuer</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address of the NFT issuer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">owner</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Current owner of the NFT (may differ from issuer on authorized mints)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">uri</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | null</td>
                  <td className="py-2.5 text-zinc-300">Hex-encoded metadata URI as stored on-chain</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">uri_decoded</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | null</td>
                  <td className="py-2.5 text-zinc-300">Human-readable decoded URI (e.g. <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">ipfs://...</code>), null if not set</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">flags</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Bitmask of NFToken flags (transferable, burnable, etc.)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taxon</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Collection identifier chosen by the issuer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">transfer_fee</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Royalty fee in basis points (0–50000, i.e. 0%–50%)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">sequence</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Sequence number embedded in the NFT ID</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the mint was validated</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash of the mint transaction</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89550100:D1E2F3A4B5C6:nft.minted",
  "event_type": "nft.minted",
  "ledger_index": 89550100,
  "timestamp": "2024-01-15T11:00:00Z",
  "network": "mainnet",
  "payload": {
    "nft_id": "000813882AF7E9CF50D5B231EF2C804F1EB3E26EA2D18AB4000000000000001E",
    "issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "uri": "697066733A2F2F516D61626364656667",
    "uri_decoded": "ipfs://Qmabcdefghijklmnopqrstuvwxyz1234",
    "flags": 8,
    "taxon": 1000,
    "transfer_fee": 500,
    "sequence": 30,
    "ledger_index": 89550100,
    "tx_hash": "D1E2F3A4B5C6D1E2F3A4B5C6D1E2F3A4B5C6D1E2F3A4B5C6D1E2F3A4B5C6D1E2"
  }
}`}</pre>
          </div>
        </section>

        {/* nft.burned */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">nft.burned</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">NFTokenBurn</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">NFTokenBurn</code> transaction permanently destroys an NFT. After burning, the NFT ID is invalid and cannot be reused.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-44">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">nft_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">NFT identifier that was burned</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">owner</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address that held and burned the NFT</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the burn was validated</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash of the burn transaction</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* nft.offer_created */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">nft.offer_created</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">NFTokenCreateOffer</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">NFTokenCreateOffer</code> transaction creates either a sell offer (owner offering to sell) or a buy offer (buyer offering to purchase). Both types generate the same event.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-44">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">offer_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Unique ledger object ID for this offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">nft_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">NFT this offer is for</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">owner</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address that created the offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">destination</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | null</td>
                  <td className="py-2.5 text-zinc-300">If set, only this account can accept the offer (private offer)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">amount</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Price: a drops string for XRP, or <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">&#123;currency, value, issuer&#125;</code> for issued tokens</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">is_sell_offer</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if the offer owner is selling; false if they are buying</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">expiration</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | null</td>
                  <td className="py-2.5 text-zinc-300">ISO 8601 timestamp after which the offer expires, or null for no expiry</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the offer was created</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* nft.offer_accepted */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">nft.offer_accepted</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">NFTokenAcceptOffer</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">NFTokenAcceptOffer</code> transaction completes a sale. This is the definitive &quot;NFT sold&quot; event: ownership has transferred and payment has settled.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-44">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">offer_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">ID of the offer that was accepted</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">nft_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">NFT that changed hands</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">buyer</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address of the new NFT owner</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">seller</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address of the previous NFT owner</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">price</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Sale price: drops string for XRP or <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">&#123;currency, value, issuer&#125;</code> for tokens</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">broker</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | null</td>
                  <td className="py-2.5 text-zinc-300">Broker account address if a third-party facilitated the sale, otherwise null</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the acceptance was validated</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89552000:F4A3B2C1D0E9:nft.offer_accepted",
  "event_type": "nft.offer_accepted",
  "ledger_index": 89552000,
  "timestamp": "2024-01-15T12:15:30Z",
  "network": "mainnet",
  "payload": {
    "offer_id": "B2C3D4E5F6A7B2C3D4E5F6A7B2C3D4E5F6A7B2C3D4E5F6A7B2C3D4E5F6A7B2C3",
    "nft_id": "000813882AF7E9CF50D5B231EF2C804F1EB3E26EA2D18AB4000000000000001E",
    "buyer": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "seller": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "price": "50000000",
    "broker": null,
    "ledger_index": 89552000,
    "tx_hash": "F4A3B2C1D0E9F4A3B2C1D0E9F4A3B2C1D0E9F4A3B2C1D0E9F4A3B2C1D0E9F4A3"
  }
}`}</pre>
          </div>
        </section>

        {/* nft.offer_cancelled */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">nft.offer_cancelled</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">NFTokenCancelOffer</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when one or more NFT offers are cancelled via <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">NFTokenCancelOffer</code>. A single transaction can cancel multiple offers at once, so the <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">offer_id</code> field is an array to accommodate this.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-44">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">offer_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string[]</td>
                  <td className="py-2.5 text-zinc-300">Array of cancelled offer IDs (may contain one or more entries)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">nft_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">NFT the cancelled offer(s) were for</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account that submitted the cancellation</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the cancellation was validated</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related event types</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/events" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">All Event Types</p>
              <p className="text-zinc-500 text-sm">Browse every event XRNotify can deliver</p>
            </Link>
            <Link href="/docs/events/payments" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Payment Events</p>
              <p className="text-zinc-500 text-sm">XRP and issued token payment events</p>
            </Link>
            <Link href="/docs/events/dex" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">DEX Events</p>
              <p className="text-zinc-500 text-sm">Offer creation, fills, and cancellations</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
