import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Events API - XRNotify Docs',
  description: 'Query the XRNotify event log — browse normalized XRPL transactions, filter by account or event type, and understand the event ID format.',
};

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${colors[method] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      {method}
    </span>
  );
}

export default function EventsApiPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#api" className="text-zinc-500 hover:text-zinc-300 no-underline">API Reference</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Events</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            API Reference
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Events API</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Events are normalized representations of XRPL ledger transactions. Use the Events API to browse the event log, query by account or event type, and retrieve full event payloads.
          </p>
        </div>

        {/* Events vs Deliveries */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Events vs Deliveries</h2>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            It's important to understand the distinction between events and deliveries — these are two separate but related concepts:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <p className="text-white font-medium">Event</p>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                One normalized XRPL transaction. Created once per ledger occurrence. Has a stable, unique ID. Immutable after creation.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                <p className="text-white font-medium">Delivery</p>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                One attempt to send an event to a webhook endpoint. One event can have multiple deliveries — one per matching webhook, with retries creating additional delivery records.
              </p>
            </div>
          </div>
          <p className="text-zinc-400 text-sm">
            Example: A payment to an address monitored by three webhooks generates one event and three deliveries.
          </p>
        </section>

        {/* Event ID format */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Event ID format</h2>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            Event IDs are deterministic and derived from the ledger data. This means you can predict the ID for any XRPL transaction you know about:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <code className="font-mono text-emerald-400 text-sm">xrpl:&lt;ledger_index&gt;:&lt;tx_hash&gt;:&lt;event_type&gt;[:&lt;sub_index&gt;]</code>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <code className="font-mono text-zinc-300 text-sm bg-zinc-900 border border-zinc-800 rounded px-3 py-2 block flex-1">xrpl:89547832:A4B2F1E3:payment.xrp</code>
              <span className="text-zinc-500 text-sm shrink-0">Simple payment event</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="font-mono text-zinc-300 text-sm bg-zinc-900 border border-zinc-800 rounded px-3 py-2 block flex-1">xrpl:89547832:A4B2F1E3:nft.minted:0</code>
              <span className="text-zinc-500 text-sm shrink-0">First NFT in a batch mint</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="font-mono text-zinc-300 text-sm bg-zinc-900 border border-zinc-800 rounded px-3 py-2 block flex-1">xrpl:89547832:A4B2F1E3:nft.minted:4</code>
              <span className="text-zinc-500 text-sm shrink-0">Fifth NFT in the same batch</span>
            </div>
          </div>
          <p className="text-zinc-400 text-sm">
            The <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">sub_index</code> is only present when a single transaction produces multiple events of the same type (e.g., a batch NFT mint).
          </p>
        </section>

        {/* GET /v1/events */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/events</code>
          </div>
          <p className="text-zinc-400 mb-6">List events from the XRNotify event log. Results are ordered by ledger index, newest first.</p>

          <h3 className="text-base font-semibold text-white mb-3">Query parameters</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Parameter</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { param: 'event_type', type: 'string', desc: 'Filter by event type (e.g. payment.xrp, nft.minted)' },
                  { param: 'account', type: 'string', desc: 'Filter to a specific XRPL account (r-address)' },
                  { param: 'since', type: 'ISO timestamp', desc: 'Return events after this timestamp' },
                  { param: 'until', type: 'ISO timestamp', desc: 'Return events before this timestamp' },
                  { param: 'ledger_min', type: 'integer', desc: 'Return events from this ledger index or higher' },
                  { param: 'ledger_max', type: 'integer', desc: 'Return events up to this ledger index' },
                  { param: 'limit', type: 'integer', desc: 'Results per page. Default 20, max 100' },
                  { param: 'cursor', type: 'string', desc: 'Pagination cursor from previous response' },
                ].map(({ param, type, desc }) => (
                  <tr key={param}>
                    <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">{param}</code></td>
                    <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">{type}</code></td>
                    <td className="py-2.5 text-zinc-300 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl "https://api.xrnotify.io/v1/events?event_type=payment.xrp&account=rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe&limit=5" \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "data": [
    {
      "event_id": "xrpl:89547832:A4B2F1E3:payment.xrp",
      "event_type": "payment.xrp",
      "ledger_index": 89547832,
      "timestamp": "2024-01-15T10:23:45Z",
      "network": "mainnet"
    }
  ],
  "has_more": true,
  "next_cursor": "cur_abc..."
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* GET /v1/events/:event_id */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/events/<span className="text-zinc-400">:event_id</span></code>
          </div>
          <p className="text-zinc-400 mb-6">Retrieve the full event object for a single event, including all payload fields for that event type.</p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89547832:A4B2F1E3:payment.xrp",
  "event_type": "payment.xrp",
  "ledger_index": 89547832,
  "timestamp": "2024-01-15T10:23:45Z",
  "network": "mainnet",
  "payload": {
    "sender": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "receiver": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "amount": "1000000",
    "fee": "12",
    "delivered_amount": "1000000",
    "destination_tag": 12345,
    "tx_hash": "A4B2F1E3C9D4...",
    "tx_type": "Payment"
  }
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Event types reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Supported event types</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Event type</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { type: 'payment.xrp', desc: 'XRP was transferred between two accounts' },
                  { type: 'payment.issued', desc: 'An issued currency (IOU) was transferred' },
                  { type: 'nft.minted', desc: 'A new NFT was minted (NFTokenMint transaction)' },
                  { type: 'nft.burned', desc: 'An NFT was burned (NFTokenBurn transaction)' },
                  { type: 'nft.sold', desc: 'An NFT changed ownership via an accepted offer' },
                  { type: 'offer.created', desc: 'A DEX offer was placed' },
                  { type: 'offer.consumed', desc: 'A DEX offer was fully or partially filled' },
                  { type: 'trust_line.created', desc: 'A new trust line was established' },
                  { type: 'trust_line.modified', desc: 'A trust line limit or flags were changed' },
                  { type: 'account.activated', desc: 'An account received its funding reserve' },
                ].map(({ type, desc }) => (
                  <tr key={type}>
                    <td className="py-2.5 pr-6"><code className="font-mono text-emerald-400 text-xs">{type}</code></td>
                    <td className="py-2.5 text-zinc-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Retention */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Event retention by plan</h2>
          <p className="text-zinc-400 mb-4 text-sm">Events older than the retention window for your plan are deleted and cannot be queried or replayed.</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Plan</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Event retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { plan: 'Free', retention: '3 days' },
                  { plan: 'Starter', retention: '7 days' },
                  { plan: 'Pro', retention: '30 days' },
                  { plan: 'Enterprise', retention: '90 days' },
                ].map(({ plan, retention }) => (
                  <tr key={plan}>
                    <td className="py-2.5 pr-6 text-white font-medium">{plan}</td>
                    <td className="py-2.5 text-zinc-300 font-mono">{retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Missed events?</span> Use the <Link href="/docs/api/replay" className="text-emerald-200 hover:text-white underline">Replay API</Link> to re-deliver past events to your webhook. Replay is available as long as the event is within your plan's retention window.
            </p>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API</p>
              <p className="text-zinc-500 text-sm">Subscribe to event types</p>
            </Link>
            <Link href="/docs/api/deliveries" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Deliveries API</p>
              <p className="text-zinc-500 text-sm">Track per-endpoint delivery status</p>
            </Link>
            <Link href="/docs/api/replay" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Replay API</p>
              <p className="text-zinc-500 text-sm">Re-deliver past events in bulk</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
