import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trustline Events - XRNotify Docs',
  description: 'Reference for XRNotify trustline event types: trustline.created, trustline.modified, trustline.deleted. Full payload schemas and examples for XRPL trust line events.',
};

export default function TrustlineEventsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500 hover:text-zinc-300">Event Types</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Trustline Events</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Event Types
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Trustline Events</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Trust lines are the authorization mechanism on the XRPL that links an account to a token issuer. An account must hold an open trust line before it can receive or hold any issued token. XRNotify tracks trust line creation, modification, and removal across the entire ledger.
          </p>
        </div>

        {/* Event index */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-12">
          {['trustline.created', 'trustline.modified', 'trustline.deleted'].map((e) => (
            <span key={e} className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 text-center">{e}</span>
          ))}
        </div>

        {/* trustline.created */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">trustline.created</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">TrustSet (new)</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">TrustSet</code> transaction creates a brand new trust line with a non-zero limit. This signals that an account has opted in to holding a specific issued token from a specific issuer.
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
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address that created the trust line</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">issuer</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account address of the token issuer being trusted</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">currency</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Currency code: 3-letter ASCII or 40-character hex</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">limit</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Maximum token amount the account is willing to hold (decimal string)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">balance</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Current token balance (typically &quot;0&quot; on creation)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">no_ripple</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if rippling (token routing) is disabled on this trust line</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">freeze</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if the issuer has frozen this trust line</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">authorized</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">True if the issuer has authorized this trust line (required for tokens with RequireAuth enabled)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the trust line was created</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">tx_hash</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Transaction hash of the TrustSet transaction</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89570000:C5D6E7F8A9B0:trustline.created",
  "event_type": "trustline.created",
  "ledger_index": 89570000,
  "timestamp": "2024-01-15T16:00:00Z",
  "network": "mainnet",
  "payload": {
    "account": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    "currency": "USD",
    "limit": "10000",
    "balance": "0",
    "no_ripple": true,
    "freeze": false,
    "authorized": false,
    "ledger_index": 89570000,
    "tx_hash": "C5D6E7F8A9B0C5D6E7F8A9B0C5D6E7F8A9B0C5D6E7F8A9B0C5D6E7F8A9B0C5D6"
  }
}`}</pre>
          </div>
        </section>

        {/* trustline.modified */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">trustline.modified</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">TrustSet (update)</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">TrustSet</code> transaction changes an existing trust line, for example, updating the limit amount, toggling the NoRipple flag, or when an issuer freezes or unfreezes the line. The payload includes both the new values and the previous values so you can see exactly what changed.
          </p>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Freeze note:</span> When <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">freeze: true</code> appears in this event, the issuer has frozen this trust line. The account cannot send tokens until the issuer unfreezes it, though they can still receive tokens.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Payload schema</h3>
          <p className="text-zinc-400 text-sm mb-4">All fields from <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">trustline.created</code> are present, plus the following &quot;previous&quot; fields showing what changed:</p>
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
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">previous_limit</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Trust line limit before this transaction</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">previous_no_ripple</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">NoRipple flag value before this transaction</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">previous_freeze</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">boolean</td>
                  <td className="py-2.5 text-zinc-300">Freeze flag value before this transaction</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Example payload</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89572000:D6E7F8A9B0C1:trustline.modified",
  "event_type": "trustline.modified",
  "ledger_index": 89572000,
  "timestamp": "2024-01-15T16:30:00Z",
  "network": "mainnet",
  "payload": {
    "account": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    "currency": "USD",
    "limit": "50000",
    "balance": "250.00",
    "no_ripple": true,
    "freeze": false,
    "authorized": false,
    "previous_limit": "10000",
    "previous_no_ripple": true,
    "previous_freeze": false,
    "ledger_index": 89572000,
    "tx_hash": "D6E7F8A9B0C1D6E7F8A9B0C1D6E7F8A9B0C1D6E7F8A9B0C1D6E7F8A9B0C1D6E7"
  }
}`}</pre>
          </div>
        </section>

        {/* trustline.deleted */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">trustline.deleted</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">TrustSet (remove)</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6">
            Fires when a trust line is removed from the ledger. This happens when an account submits a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">TrustSet</code> with a limit of 0 and the balance is also 0, or when the balance reaches 0 and the ledger automatically removes the trust line object to reclaim the reserve.
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
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Account that held the trust line</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">issuer</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Issuer address the trust line was with</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">currency</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Currency code of the removed trust line</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">final_balance</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">string</td>
                  <td className="py-2.5 text-zinc-300">Token balance at the time of deletion (should be &quot;0&quot;)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">ledger_index</td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">number</td>
                  <td className="py-2.5 text-zinc-300">Ledger in which the trust line was deleted</td>
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
