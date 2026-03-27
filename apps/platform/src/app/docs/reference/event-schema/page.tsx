import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Event Schema — XRNotify Docs',
  description:
    'Canonical structure, TypeScript interface, and JSON Schema for every event delivered by XRNotify.',
};

export default function EventSchemaPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">
              Docs
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#reference" className="text-zinc-500 hover:text-zinc-300 no-underline">Reference</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Event Schema</span>
          </div>
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-white transition-colors text-sm no-underline"
          >
            Dashboard →
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 mb-4">
            Reference
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">Event Schema</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Every event delivered by XRNotify follows a canonical top-level structure. The
            event-type-specific data lives inside the <code className="text-emerald-400">payload</code> field.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            Regardless of whether the event is a payment, NFT mint, DEX trade, or any other
            activity, the outer envelope is identical. This makes it straightforward to write
            a single parsing layer and then branch on{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">event_type</code> to reach type-specific payload handling.
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Events are delivered as HTTP POST requests with a{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">Content-Type: application/json</code> header and a signed body.
            Always verify the <code className="text-emerald-400 bg-zinc-800 px-1 rounded">X-XRNotify-Signature</code> header before trusting the payload.
          </p>
        </section>

        {/* TypeScript interface */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">TypeScript interface</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`interface XRNotifyEvent<T = Record<string, unknown>> {
  /** Unique event identifier in format xrpl:<ledger>:<txhash>:<type>[:<idx>] */
  event_id: string;

  /** Event type string (e.g. "payment.xrp", "nft.minted") */
  event_type: EventType;

  /** XRPL ledger index this event occurred in */
  ledger_index: number;

  /** ISO 8601 timestamp of ledger close */
  timestamp: string;

  /** Network: "mainnet" | "testnet" | "devnet" */
  network: string;

  /** The webhook that triggered this delivery */
  webhook_id: string;

  /** Event-type-specific payload */
  payload: T;
}`}
            </pre>
          </div>
        </section>

        {/* Field descriptions */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Field descriptions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Field</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['event_id', 'string', 'Globally unique, deterministic ID. Format: xrpl:<ledger>:<txhash>:<type>[:<idx>]'],
                  ['event_type', 'string', 'One of the 23 supported event types (see EventType union below)'],
                  ['ledger_index', 'number', 'XRPL ledger sequence number in which the transaction was validated'],
                  ['timestamp', 'string', 'ISO 8601 datetime, always UTC, matching the ledger close time'],
                  ['network', 'string', 'Always "mainnet" for production. "testnet" or "devnet" for test webhooks'],
                  ['webhook_id', 'string', 'wh_ prefixed ID of the webhook that triggered this delivery'],
                  ['payload', 'object', 'Event-type-specific fields. Schema varies by event_type'],
                ].map(([field, type, desc]) => (
                  <tr key={field}>
                    <td className="py-2.5 pr-6">
                      <code className="text-emerald-400 text-xs">{field}</code>
                    </td>
                    <td className="py-2.5 pr-6">
                      <code className="text-zinc-400 text-xs">{type}</code>
                    </td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* event_id format */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">
            The <code className="text-emerald-400">event_id</code> format
          </h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Event IDs are deterministically generated from on-chain data, so the same ledger
            event always produces the same <code className="text-emerald-400 bg-zinc-800 px-1 rounded">event_id</code>. This makes them safe to use as
            idempotency keys in your processing layer.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`# Pattern:
xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]

# Examples:
xrpl:84512701:A1B2C3D4E5F6...1234:payment.xrp
xrpl:84512705:F6E5D4C3B2A1...5678:nft.offer_accepted
xrpl:84512710:123456789ABC...ABCD:dex.offer_partial:0
xrpl:84512710:123456789ABC...ABCD:dex.offer_partial:1`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The optional <code className="text-emerald-400 bg-zinc-800 px-1 rounded">:sub_index</code> suffix appears when a single transaction generates
            multiple events of the same type (e.g., a single DEX trade filling multiple
            offers). Each resulting event gets a unique numeric index.
          </p>
        </section>

        {/* EventType union */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">
            <code className="text-emerald-400">EventType</code> union (all 23 values)
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`type EventType =
  // Payments
  | 'payment.xrp'
  | 'payment.issued'

  // NFTs
  | 'nft.minted'
  | 'nft.burned'
  | 'nft.offer_created'
  | 'nft.offer_accepted'
  | 'nft.offer_cancelled'

  // DEX
  | 'dex.offer_created'
  | 'dex.offer_cancelled'
  | 'dex.offer_filled'
  | 'dex.offer_partial'

  // Trustlines
  | 'trustline.created'
  | 'trustline.modified'
  | 'trustline.deleted'

  // Accounts
  | 'account.created'
  | 'account.deleted'
  | 'account.settings_changed'

  // Escrows
  | 'escrow.created'
  | 'escrow.finished'
  | 'escrow.cancelled'

  // Checks
  | 'check.created'
  | 'check.cashed'
  | 'check.cancelled';`}
            </pre>
          </div>
        </section>

        {/* Sample event */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Sample event (payment.xrp)</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`{
  "event_id": "xrpl:84512701:A1B2C3D4E5F67890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678:payment.xrp",
  "event_type": "payment.xrp",
  "ledger_index": 84512701,
  "timestamp": "2024-01-15T14:23:07Z",
  "network": "mainnet",
  "webhook_id": "wh_abc123def456",
  "payload": {
    "sender": "rN7n3473SaZBCG4dFL75SqSGPpvNRRBXtK",
    "receiver": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "amount": "25000000",
    "destination_tag": 1042,
    "tx_hash": "A1B2C3D4E5F67890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678"
  }
}`}
            </pre>
          </div>
        </section>

        {/* JSON Schema */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">JSON Schema (top-level envelope)</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Use this schema to validate inbound webhook bodies with any JSON Schema v2020-12
            compatible validator (e.g., <code className="text-emerald-400 bg-zinc-800 px-1 rounded">ajv</code> in Node.js).
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://www.xrnotify.io/schemas/event.json",
  "type": "object",
  "required": [
    "event_id",
    "event_type",
    "ledger_index",
    "timestamp",
    "network",
    "webhook_id",
    "payload"
  ],
  "properties": {
    "event_id": {
      "type": "string",
      "pattern": "^xrpl:\\\\d+:[A-F0-9]+:[a-z.]+(?::\\\\d+)?$"
    },
    "event_type": {
      "type": "string"
    },
    "ledger_index": {
      "type": "integer",
      "minimum": 1
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "network": {
      "type": "string",
      "enum": ["mainnet", "testnet", "devnet"]
    },
    "webhook_id": {
      "type": "string",
      "pattern": "^wh_"
    },
    "payload": {
      "type": "object"
    }
  },
  "additionalProperties": false
}`}
            </pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            Payload schemas for each event type — including all field names, types, and
            optional fields — are documented in the{' '}
            <Link href="/docs/events" className="text-emerald-400 hover:text-emerald-300">
              Event Types
            </Link>{' '}
            section.
          </div>
        </section>

        {/* Delivery headers */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Delivery HTTP headers</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Every webhook POST includes the following headers alongside the event body:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Header</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['X-XRNotify-Signature', 'HMAC-SHA256 signature of the raw request body. Format: sha256=<hex>'],
                  ['X-XRNotify-Delivery-Id', 'Unique delivery attempt ID (dlv_ prefixed). Use for idempotency.'],
                  ['X-XRNotify-Event-Id', 'The event_id from the body, repeated as a header for quick access'],
                  ['X-XRNotify-Event-Type', 'The event_type from the body, repeated as a header'],
                  ['X-XRNotify-Timestamp', 'Unix timestamp of when this delivery was dispatched'],
                  ['Content-Type', 'Always application/json'],
                ].map(([header, desc]) => (
                  <tr key={header}>
                    <td className="py-2.5 pr-6">
                      <code className="text-emerald-400 text-xs whitespace-nowrap">{header}</code>
                    </td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/events', label: 'Event Types', desc: 'Per-type payload schemas for all 23 event types' },
              { href: '/docs/verify-signatures', label: 'Verifying Signatures', desc: 'How to validate X-XRNotify-Signature' },
              { href: '/docs/reference/error-codes', label: 'Error Codes', desc: 'API error format and code reference' },
              { href: '/docs/guides/payment-notifications', label: 'Payment Notifications Guide', desc: 'End-to-end payment webhook tutorial' },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors no-underline"
              >
                <div className="text-sm font-medium text-white mb-1">{label}</div>
                <div className="text-xs text-zinc-500">{desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
