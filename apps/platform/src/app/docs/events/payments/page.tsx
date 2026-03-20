import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment Events - XRNotify Docs',
  description: 'Reference for XRNotify payment.xrp and payment.issued event types. Full payload schemas and examples for XRPL payment transactions.',
};

export default function PaymentEventsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500 hover:text-zinc-300">Event Types</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Payment Events</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Event Types
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Payment Events</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            XRNotify emits two payment event types from the XRPL. <code className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-base">payment.xrp</code> fires for native XRP drop transfers between accounts. <code className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-base">payment.issued</code> fires for transfers of issued tokens — also known as IOUs — such as USDC, SOLO, or any other token on the XRPL.
          </p>
        </div>

        {/* payment.xrp */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">payment.xrp</h2>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">Native XRP</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires on any <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">Payment</code> transaction that moves XRP between two accounts. This includes direct sends and cross-currency payments where the delivered asset is XRP.
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
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">sender</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Source account address (r-address)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">receiver</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Destination account address (r-address)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">amount</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Amount in drops (1 XRP = 1,000,000 drops)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">amount_xrp</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Amount in XRP, human-readable decimal string</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">fee</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction fee paid in drops</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">delivered_amount</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Actual delivered amount in drops — may differ from <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">amount</code> if a partial payment flag was set</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">destination_tag</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number | null</td>
                  <td className="py-2.5 text-zinc-300">Destination tag if present on the transaction, otherwise null</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">source_tag</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number | null</td>
                  <td className="py-2.5 text-zinc-300">Source tag if set by the sender, otherwise null</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash — unique identifier for this transaction on the ledger</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger sequence number in which this transaction was validated</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">sequence</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Sender account sequence number for this transaction</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89547832:A4B2F1E3C5D6:payment.xrp",
  "event_type": "payment.xrp",
  "ledger_index": 89547832,
  "timestamp": "2024-01-15T10:23:45Z",
  "network": "mainnet",
  "payload": {
    "sender": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "receiver": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "amount": "1000000",
    "amount_xrp": "1.000000",
    "fee": "12",
    "delivered_amount": "1000000",
    "destination_tag": 12345,
    "source_tag": null,
    "tx_hash": "A4B2F1E3C5D6A4B2F1E3C5D6A4B2F1E3C5D6A4B2F1E3C5D6A4B2F1E3C5D6A4B2",
    "ledger_index": 89547832,
    "sequence": 12345678
  }
}`}</pre>
          </div>
        </section>

        {/* payment.issued */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">payment.issued</h2>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">Issued Tokens</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires on <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">Payment</code> transactions that move issued tokens — also called IOUs. This includes stablecoins (USDC, RLUSD), DEX tokens (SOLO, CSC), and any token issued by a gateway or project on the XRPL.
          </p>

          <h3 className="text-lg font-semibold text-white mb-3">Additional fields</h3>
          <p className="text-zinc-400 text-sm mb-4">
            All fields from <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">payment.xrp</code> are present, plus the following token-specific fields:
          </p>
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
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">currency</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Currency code — 3-letter ASCII (e.g. <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">USD</code>, <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">BTC</code>) or 40-character hex for non-standard currencies</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">issuer</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address of the token issuer (r-address)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">value</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Token amount as a decimal string (e.g. <code className="font-mono text-zinc-400 bg-zinc-800 px-1 rounded text-xs">&quot;100.50&quot;</code>). Precision up to 15 significant digits.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-6">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89547900:C8E1A2B3D4F5:payment.issued",
  "event_type": "payment.issued",
  "ledger_index": 89547900,
  "timestamp": "2024-01-15T10:31:12Z",
  "network": "mainnet",
  "payload": {
    "sender": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "receiver": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "currency": "USD",
    "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    "value": "100.50",
    "amount": "100.50",
    "amount_xrp": null,
    "fee": "12",
    "delivered_amount": "100.50",
    "destination_tag": null,
    "source_tag": null,
    "tx_hash": "C8E1A2B3D4F5C8E1A2B3D4F5C8E1A2B3D4F5C8E1A2B3D4F5C8E1A2B3D4F5C8E1",
    "ledger_index": 89547900,
    "sequence": 12345690
  }
}`}</pre>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Tip:</span> To track a specific token, add an <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">account_filters</code> array to your webhook subscription targeting the issuer address. This lets you monitor all transfers of that token across the entire ledger.
            </p>
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
            <Link href="/docs/events/nft" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">NFT Events</p>
              <p className="text-zinc-500 text-sm">Mint, burn, and offer lifecycle events</p>
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
