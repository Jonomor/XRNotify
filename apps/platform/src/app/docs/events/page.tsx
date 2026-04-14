import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'All Event Types - XRNotify Docs',
  description: 'Complete reference of all XRPL event types supported by XRNotify. Payments, NFTs, DEX, trustlines, accounts, escrow, and checks.',
};

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Event Types</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Event Types
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">All Event Types</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            XRNotify supports 24 event types across 8 categories. Subscribe to individual events, use wildcards to match entire categories, or combine multiple specific events in a single webhook.
          </p>
        </div>

        {/* Event reference table */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold text-white mb-6">Event reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left text-zinc-400 font-medium py-3 pr-4 w-52">Event Type</th>
                  <th className="text-left text-zinc-400 font-medium py-3 pr-4 w-28">Category</th>
                  <th className="text-left text-zinc-400 font-medium py-3 pr-4">Description</th>
                  <th className="text-left text-zinc-400 font-medium py-3">Triggered by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {/* Payments */}
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/payments" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">payment.xrp</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Payments</span></td>
                  <td className="py-3 pr-4 text-zinc-300">XRP transferred between accounts</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">Payment tx</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/payments" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">payment.issued</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Payments</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Issued token transferred between accounts</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">Payment tx</td>
                </tr>
                {/* NFTs */}
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/nft" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">nft.minted</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">NFTs</span></td>
                  <td className="py-3 pr-4 text-zinc-300">New NFT created on the ledger</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">NFTokenMint</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/nft" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">nft.burned</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">NFTs</span></td>
                  <td className="py-3 pr-4 text-zinc-300">NFT permanently destroyed</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">NFTokenBurn</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/nft" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">nft.offer_created</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">NFTs</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Buy or sell offer created for an NFT</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">NFTokenCreateOffer</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/nft" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">nft.offer_accepted</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">NFTs</span></td>
                  <td className="py-3 pr-4 text-zinc-300">NFT sale completed, ownership transferred</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">NFTokenAcceptOffer</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/nft" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">nft.offer_cancelled</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">NFTs</span></td>
                  <td className="py-3 pr-4 text-zinc-300">One or more NFT offers cancelled</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">NFTokenCancelOffer</td>
                </tr>
                {/* DEX */}
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/dex" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">dex.offer_created</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">DEX</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Limit order placed on the DEX order book</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">OfferCreate</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/dex" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">dex.offer_cancelled</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">DEX</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Limit order cancelled or auto-expired</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">OfferCancel</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/dex" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">dex.offer_filled</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">DEX</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Order fully executed, 100% filled</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">Trade</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/dex" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">dex.offer_partial</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">DEX</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Order partially executed, remainder stays open</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">Trade</td>
                </tr>
                {/* Trustlines */}
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/trustlines" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">trustline.created</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Trustlines</span></td>
                  <td className="py-3 pr-4 text-zinc-300">New trust line established with non-zero limit</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">TrustSet</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/trustlines" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">trustline.modified</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Trustlines</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Trust line limit or flags changed</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">TrustSet</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    <Link href="/docs/events/trustlines" className="font-mono text-emerald-400 hover:text-emerald-300 text-xs no-underline">trustline.deleted</Link>
                  </td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Trustlines</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Trust line removed from the ledger</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">TrustSet</td>
                </tr>
                {/* Accounts */}
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">account.created</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Accounts</span></td>
                  <td className="py-3 pr-4 text-zinc-300">New XRPL account funded for the first time</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">Payment</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">account.deleted</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Accounts</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Account permanently deleted from the ledger</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">AccountDelete</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">account.settings_changed</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Accounts</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Account domain, flags, or settings updated</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">AccountSet</td>
                </tr>
                {/* Escrow */}
                <tr>
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">escrow.created</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Escrow</span></td>
                  <td className="py-3 pr-4 text-zinc-300">XRP locked in a time or condition escrow</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">EscrowCreate</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">escrow.finished</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Escrow</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Escrowed XRP released to the recipient</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">EscrowFinish</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">escrow.cancelled</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Escrow</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Escrowed XRP returned to the sender</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">EscrowCancel</td>
                </tr>
                {/* Checks */}
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">check.created</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Checks</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Deferred payment check created</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">CheckCreate</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">check.cashed</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Checks</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Check redeemed and payment settled</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">CheckCash</td>
                </tr>
                <tr className="bg-zinc-900/20">
                  <td className="py-3 pr-4 font-mono text-zinc-400 text-xs">check.cancelled</td>
                  <td className="py-3 pr-4"><span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">Checks</span></td>
                  <td className="py-3 pr-4 text-zinc-300">Check cancelled before being cashed</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">CheckCancel</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-zinc-500 text-xs mt-3">Events without dedicated doc pages are available via the API. Payload schemas follow the same conventions.</p>
        </section>

        {/* Wildcard subscriptions */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold text-white mb-4">Wildcard subscriptions</h2>
          <p className="text-zinc-400 mb-6 leading-relaxed">
            Use a wildcard suffix to subscribe to all events in a category with a single string. Wildcards can be mixed with explicit event types in the same webhook.
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-400 font-medium py-2 pr-4 w-44">Wildcard</th>
                  <th className="text-left text-zinc-400 font-medium py-2">Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">payment.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">payment.xrp, payment.issued</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">nft.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">nft.minted, nft.burned, nft.offer_created, nft.offer_accepted, nft.offer_cancelled</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">dex.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">dex.offer_created, dex.offer_cancelled, dex.offer_filled, dex.offer_partial</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">trustline.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">trustline.created, trustline.modified, trustline.deleted</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">account.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">account.created, account.deleted, account.settings_changed</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">escrow.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">escrow.created, escrow.finished, escrow.cancelled</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono text-emerald-400 text-xs">check.*</td>
                  <td className="py-2.5 text-zinc-300 text-xs font-mono">check.created, check.cashed, check.cancelled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Event filtering */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold text-white mb-4">Event filtering</h2>
          <p className="text-zinc-400 mb-6 leading-relaxed">
            You can combine multiple event types and wildcards in a single webhook, and optionally narrow delivery to specific XRPL accounts using <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">account_filters</code>.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`POST /v1/webhooks
{
  "url": "https://yourapp.com/webhooks/xrpl",
  "event_types": [
    "payment.xrp",
    "nft.*",
    "dex.offer_filled"
  ],
  "account_filters": [
    "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN"
  ]
}`}</pre>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-emerald-300 text-sm">
                <span className="font-semibold">account_filters:</span> When set, only events involving at least one of the listed accounts are delivered. Omit the field entirely to receive events for all accounts on the XRPL.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 text-sm">
                <span className="text-white font-semibold">event_types:</span> Accepts any mix of explicit event strings and wildcard patterns. An event is delivered if it matches any entry in the list.
              </p>
            </div>
          </div>
        </section>

        {/* Deep dive links */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Detailed event references</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/docs/events/payments" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Payment Events</p>
              <p className="text-zinc-500 text-sm">payment.xrp and payment.issued schemas, examples</p>
            </Link>
            <Link href="/docs/events/nft" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">NFT Events</p>
              <p className="text-zinc-500 text-sm">All 5 NFT event schemas and examples</p>
            </Link>
            <Link href="/docs/events/dex" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">DEX Events</p>
              <p className="text-zinc-500 text-sm">Offer lifecycle and trade event schemas</p>
            </Link>
            <Link href="/docs/events/trustlines" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Trustline Events</p>
              <p className="text-zinc-500 text-sm">Trust line creation, modification, deletion</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
