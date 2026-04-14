import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DEX Events - XRNotify Docs',
  description: 'Reference for XRNotify DEX event types: dex.offer_created, dex.offer_cancelled, dex.offer_filled, dex.offer_partial. Full payload schemas and examples for XRPL decentralized exchange events.',
};

export default function DexEventsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500 hover:text-zinc-300">Event Types</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">DEX Events</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Event Types
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">DEX Events</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            XRNotify monitors the XRPL decentralized exchange (DEX), a native on-ledger order book that lets any account trade any two assets without a centralized intermediary. Offers are limit orders; when two compatible offers cross, a trade executes automatically as part of ledger consensus.
          </p>
        </div>

        {/* Event index */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-12">
          {['dex.offer_created', 'dex.offer_cancelled', 'dex.offer_filled', 'dex.offer_partial'].map((e) => (
            <span key={e} className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 text-center">{e}</span>
          ))}
        </div>

        {/* Amount object note */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-10">
          <p className="text-emerald-300 text-sm">
            <span className="font-semibold">Amount format:</span> All amount fields in DEX events are either a <span className="font-mono text-emerald-200">string</span> representing drops of XRP (e.g. <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">&quot;1000000&quot;</code>), or an object <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">&#123; currency, value, issuer &#125;</code> for issued tokens. Never a number.
          </p>
        </div>

        {/* dex.offer_created */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">dex.offer_created</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">OfferCreate</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">OfferCreate</code> transaction places a new limit order on the DEX. The offer remains open on the order book until it is fully filled, cancelled, or expires. If the offer partially crosses on creation, a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">dex.offer_partial</code> event is also emitted.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-48">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">offer_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Offer sequence number (account sequence at time of creation)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address that placed the offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taker_pays</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Amount the offer creator will pay when the offer is consumed (what the taker receives)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taker_gets</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Amount the offer creator will receive when the offer is consumed (what the taker pays)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">expiration</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | null</td>
                  <td className="py-2.5 text-zinc-300">ISO 8601 expiry timestamp, or null for no expiry</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">flags</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Raw transaction flags bitmask</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">is_passive</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if this is a passive offer that will not consume crossing offers at creation</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">is_fill_or_kill</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if the offer must be fully filled immediately or cancelled entirely</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">is_immediate_or_cancel</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if the offer fills what it can immediately then cancels any remainder</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the offer was placed</td>
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
  "event_id": "xrpl:89560000:A1B2C3D4E5F6:dex.offer_created",
  "event_type": "dex.offer_created",
  "ledger_index": 89560000,
  "timestamp": "2024-01-15T14:00:00Z",
  "network": "mainnet",
  "payload": {
    "offer_id": 87654321,
    "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "taker_pays": {
      "currency": "USD",
      "value": "100.00",
      "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"
    },
    "taker_gets": "50000000",
    "expiration": null,
    "flags": 0,
    "is_passive": false,
    "is_fill_or_kill": false,
    "is_immediate_or_cancel": false,
    "ledger_index": 89560000,
    "tx_hash": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2"
  }
}`}</pre>
          </div>
        </section>

        {/* dex.offer_cancelled */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">dex.offer_cancelled</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">OfferCancel / auto-expired</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an offer is removed from the order book, either explicitly via an <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">OfferCancel</code> transaction, or automatically when an expiry time passes and the ledger removes the offer during the next close.
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
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Sequence number of the cancelled offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Owner of the cancelled offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which cancellation occurred</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash (the OfferCancel tx, or the tx that triggered auto-removal)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* dex.offer_filled */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">dex.offer_filled</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">Trade - fully consumed</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an offer on the order book is completely consumed by a crossing trade. The offer no longer exists on the ledger after this event. Both the offer creator and the taker receive these events when account filters match.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-48">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">offer_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Sequence number of the fully-filled offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account that originally placed the offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taker_pays_actual</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Exact amount paid by the taker in this fill</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taker_gets_actual</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Exact amount received by the taker in this fill</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">fill_amount</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Total traded amount (equivalent to taker_gets_actual for a complete fill)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the fill was validated</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash of the crossing trade</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89561500:B3C4D5E6F7A8:dex.offer_filled",
  "event_type": "dex.offer_filled",
  "ledger_index": 89561500,
  "timestamp": "2024-01-15T14:30:00Z",
  "network": "mainnet",
  "payload": {
    "offer_id": 87654321,
    "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "taker_pays_actual": {
      "currency": "USD",
      "value": "100.00",
      "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"
    },
    "taker_gets_actual": "50000000",
    "fill_amount": "50000000",
    "ledger_index": 89561500,
    "tx_hash": "B3C4D5E6F7A8B3C4D5E6F7A8B3C4D5E6F7A8B3C4D5E6F7A8B3C4D5E6F7A8B3C4"
  }
}`}</pre>
          </div>
        </section>

        {/* dex.offer_partial */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">dex.offer_partial</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">Trade - partially consumed</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when an offer is partially filled by a crossing trade but remains on the order book with a reduced amount. The offer continues to exist and will fire additional <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">dex.offer_partial</code> or <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">dex.offer_filled</code> events as more trades cross it.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-48">Field</th>
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-36">Type</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">offer_id</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Sequence number of the partially-filled offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account that placed the offer</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taker_pays_actual</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Amount paid by the taker in this partial fill</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">taker_gets_actual</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Amount received by the taker in this partial fill</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">remaining</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string | object</td>
                  <td className="py-2.5 text-zinc-300">Amount still unfilled, representing what remains on the order book</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">fill_percent</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Percentage filled in this event (0–100), as a float</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the partial fill occurred</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash of the crossing trade</td>
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
            <Link href="/docs/events/trustlines" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Trustline Events</p>
              <p className="text-zinc-500 text-sm">Trust line creation, modification, and deletion</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
