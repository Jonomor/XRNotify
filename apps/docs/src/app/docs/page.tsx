import Link from "next/link";
import type { Metadata } from "next";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Documentation — XRNotify",
  description:
    "Complete API reference and integration guide for XRNotify XRPL webhook platform.",
};

/* ------------------------------------------------------------------ */
/*  Sidebar nav structure                                              */
/* ------------------------------------------------------------------ */

interface NavSection {
  title: string;
  items: { id: string; label: string }[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "authentication", label: "Authentication" },
      { id: "quickstart", label: "Quick Start" },
    ],
  },
  {
    title: "Webhooks",
    items: [
      { id: "create-webhook", label: "Create Webhook" },
      { id: "list-webhooks", label: "List Webhooks" },
      { id: "update-webhook", label: "Update Webhook" },
      { id: "delete-webhook", label: "Delete Webhook" },
      { id: "webhook-signing", label: "Signature Verification" },
    ],
  },
  {
    title: "Events",
    items: [
      { id: "event-schema", label: "Event Schema" },
      { id: "event-types", label: "Event Types" },
      { id: "event-replay", label: "Event Replay" },
    ],
  },
  {
    title: "Deliveries",
    items: [
      { id: "delivery-logs", label: "Delivery Logs" },
      { id: "retry-delivery", label: "Retry Delivery" },
      { id: "delivery-statuses", label: "Delivery Statuses" },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "api-keys", label: "API Key Management" },
      { id: "rate-limits", label: "Rate Limits" },
      { id: "error-codes", label: "Error Codes" },
      { id: "idempotency", label: "Idempotency" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable components                                                */
/* ------------------------------------------------------------------ */

function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-cyan-400">
      {children}
    </code>
  );
}

function Endpoint({
  method,
  path,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
}) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-400",
    POST: "bg-blue-500/15 text-blue-400",
    PATCH: "bg-amber-500/15 text-amber-400",
    DELETE: "bg-red-500/15 text-red-400",
  };
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5">
      <span className={`rounded px-2 py-0.5 text-xs font-bold ${colors[method]}`}>
        {method}
      </span>
      <code className="font-mono text-sm text-gray-300">{path}</code>
    </div>
  );
}

function CodeBlock({
  code,
  title,
}: {
  code: string;
  title?: string;
}) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-800">
      {title && (
        <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-700" />
          </div>
          <span className="text-xs text-gray-500">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto bg-gray-950 p-4 text-[13px] leading-relaxed">
        <code className="text-gray-300">{code}</code>
      </pre>
    </div>
  );
}

function ParamTable({
  params,
}: {
  params: { name: string; type: string; required: boolean; desc: string }[];
}) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/60 text-left">
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Parameter</th>
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Required</th>
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {params.map((p) => (
            <tr key={p.name}>
              <td className="px-4 py-2.5 font-mono text-xs text-cyan-400">{p.name}</td>
              <td className="px-4 py-2.5 text-xs text-gray-400">{p.type}</td>
              <td className="px-4 py-2.5 text-xs">
                {p.required ? (
                  <span className="text-amber-400">Required</span>
                ) : (
                  <span className="text-gray-600">Optional</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-400">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    danger: "border-red-500/30 bg-red-500/5 text-red-300",
  };
  const icons = {
    info: "ℹ",
    warning: "⚠",
    danger: "✕",
  };
  return (
    <div className={`my-4 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-4 mt-14 scroll-mt-20 border-b border-gray-800 pb-3 text-2xl font-bold text-white first:mt-0">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 text-lg font-semibold text-white">{children}</h3>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE = "https://api.xrnotify.io";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-[10px] font-black text-white">
                XR
              </div>
              <span className="text-sm font-bold text-white">XRNotify</span>
            </Link>
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">Docs</span>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.xrnotify.io"}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500"
          >
            Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* ---- Sidebar ---- */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-gray-800 py-6 pl-4 pr-3 lg:block">
          <nav className="space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-md px-2.5 py-1.5 text-sm text-gray-400 transition hover:bg-gray-800/60 hover:text-white"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* ---- Content ---- */}
        <main className="min-w-0 flex-1 px-4 py-10 sm:px-8 lg:px-12">
          <div className="max-w-3xl">

            {/* ============================================================ */}
            {/*  GETTING STARTED                                             */}
            {/* ============================================================ */}

            <SectionHeading id="overview">Overview</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              XRNotify is a real-time XRPL event notification platform. It monitors the XRP Ledger,
              normalizes transaction events into a stable schema, and delivers them to your HTTPS
              endpoints as signed webhook payloads.
            </p>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Base URL for all API requests:
            </p>
            <CodeBlock code={API_BASE} title="Base URL" />

            <SectionHeading id="authentication">Authentication</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              All API requests require an API key passed via the <Code>X-XRNotify-Key</Code> header.
              Keys are created in the dashboard and can be scoped to specific permissions.
            </p>
            <CodeBlock
              code={`curl ${API_BASE}/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_abc123def456..."`}
              title="Authentication header"
            />
            <Callout type="info">
              API keys are hashed at rest using SHA-256. The full key is shown only once at creation — store it securely.
            </Callout>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              The dashboard UI also supports JWT session authentication via <Code>Authorization: Bearer &lt;token&gt;</Code>
              obtained from the login endpoint.
            </p>

            <SectionHeading id="quickstart">Quick Start</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              1. <strong className="text-white">Create an account</strong> at the dashboard and generate an API key.<br />
              2. <strong className="text-white">Register a webhook</strong> endpoint with your desired event types.<br />
              3. <strong className="text-white">Verify signatures</strong> on incoming payloads using your webhook secret.<br />
              4. <strong className="text-white">Process events</strong> and return a 2xx response within 30 seconds.
            </p>

            {/* ============================================================ */}
            {/*  WEBHOOKS                                                    */}
            {/* ============================================================ */}

            <SectionHeading id="create-webhook">Create Webhook</SectionHeading>
            <Endpoint method="POST" path="/v1/webhooks" />
            <ParamTable
              params={[
                { name: "url", type: "string", required: true, desc: "HTTPS endpoint URL to receive events" },
                { name: "event_types", type: "string[]", required: true, desc: "Array of event types to subscribe to" },
                { name: "description", type: "string", required: false, desc: "Human-readable label for this webhook" },
                { name: "active", type: "boolean", required: false, desc: "Enable/disable delivery (default: true)" },
                { name: "metadata", type: "object", required: false, desc: "Key-value pairs included in each delivery" },
              ]}
            />
            <CodeBlock
              code={`curl -X POST ${API_BASE}/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/xrpl",
    "event_types": ["payment", "nft.mint", "offer.create"],
    "description": "Production listener"
  }'`}
              title="Request"
            />
            <CodeBlock
              code={`{
  "id": "wh_a1b2c3d4e5f6",
  "url": "https://yourapp.com/webhooks/xrpl",
  "description": "Production listener",
  "event_types": ["payment", "nft.mint", "offer.create"],
  "active": true,
  "secret_last4": "f6g7",
  "created_at": "2026-02-26T10:00:00.000Z",
  "updated_at": "2026-02-26T10:00:00.000Z",
  "metadata": {}
}`}
              title="Response (201)"
            />
            <Callout type="warning">
              The webhook signing secret is returned only in the creation response. Store it securely — it cannot be retrieved later.
            </Callout>

            <SectionHeading id="list-webhooks">List Webhooks</SectionHeading>
            <Endpoint method="GET" path="/v1/webhooks" />
            <ParamTable
              params={[
                { name: "page", type: "integer", required: false, desc: "Page number (default: 1)" },
                { name: "per_page", type: "integer", required: false, desc: "Results per page (default: 50, max: 100)" },
              ]}
            />

            <SectionHeading id="update-webhook">Update Webhook</SectionHeading>
            <Endpoint method="PATCH" path="/v1/webhooks/:id" />
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Partial update — only include the fields you want to change.
              The signing secret cannot be changed; delete and recreate the webhook to rotate it.
            </p>
            <ParamTable
              params={[
                { name: "url", type: "string", required: false, desc: "Updated endpoint URL" },
                { name: "event_types", type: "string[]", required: false, desc: "Updated event type subscriptions" },
                { name: "description", type: "string", required: false, desc: "Updated description" },
                { name: "active", type: "boolean", required: false, desc: "Enable or pause deliveries" },
                { name: "metadata", type: "object", required: false, desc: "Updated metadata (replaces existing)" },
              ]}
            />

            <SectionHeading id="delete-webhook">Delete Webhook</SectionHeading>
            <Endpoint method="DELETE" path="/v1/webhooks/:id" />
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Permanently deletes the webhook and stops all future deliveries.
              Existing delivery logs are retained per the data retention policy.
            </p>

            <SectionHeading id="webhook-signing">Signature Verification</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Every webhook delivery includes an <Code>X-XRNotify-Signature</Code> header
              containing an HMAC-SHA256 hex digest of the raw request body, prefixed with <Code>sha256=</Code>.
            </p>
            <CodeBlock
              code={`X-XRNotify-Signature: sha256=a1b2c3d4e5f6...`}
              title="Signature header format"
            />
            <SubHeading>Verification example (Node.js)</SubHeading>
            <CodeBlock
              code={`import crypto from "node:crypto";

function verify(rawBody, signatureHeader, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from("sha256=" + expected),
    Buffer.from(signatureHeader)
  );
}`}
              title="verify.js"
            />
            <SubHeading>Verification example (Python)</SubHeading>
            <CodeBlock
              code={`import hmac, hashlib

def verify(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)`}
              title="verify.py"
            />
            <Callout type="danger">
              Always use constant-time comparison (timingSafeEqual / compare_digest) to prevent timing attacks.
            </Callout>

            {/* ============================================================ */}
            {/*  EVENTS                                                      */}
            {/* ============================================================ */}

            <SectionHeading id="event-schema">Event Schema</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              All events conform to a stable, normalized schema regardless of the underlying XRPL transaction type.
            </p>
            <ParamTable
              params={[
                { name: "event_id", type: "string", required: true, desc: "Deterministic ID: xrpl:<ledger>:<tx_hash>:<type>[:<sub_index>]" },
                { name: "ledger_index", type: "integer", required: true, desc: "Ledger sequence number" },
                { name: "tx_hash", type: "string", required: true, desc: "Transaction hash" },
                { name: "event_type", type: "string", required: true, desc: "Normalized event type" },
                { name: "timestamp", type: "string", required: true, desc: "ISO 8601 UTC timestamp" },
                { name: "account_context", type: "string[]", required: true, desc: "Primary account(s) involved" },
                { name: "payload", type: "object", required: true, desc: "Event-specific normalized fields" },
                { name: "raw", type: "object", required: false, desc: "Raw XRPL transaction (gated by plan)" },
              ]}
            />

            <SectionHeading id="event-types">Event Types</SectionHeading>
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">XRPL Transaction</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {[
                    ["payment", "Payment", "XRP and issued currency transfers"],
                    ["trustset", "TrustSet", "Trustline creation, modification, deletion"],
                    ["nft.mint", "NFTokenMint", "NFToken minting"],
                    ["nft.burn", "NFTokenBurn", "NFToken burning"],
                    ["nft.accept_offer", "NFTokenAcceptOffer", "NFT trade execution (buy/sell)"],
                    ["offer.create", "OfferCreate", "DEX order placement"],
                    ["offer.cancel", "OfferCancel", "DEX order cancellation"],
                    ["account.set", "AccountSet", "Account property changes"],
                    ["account.delete", "AccountDelete", "Account deletion"],
                  ].map(([type, tx, desc]) => (
                    <tr key={type}>
                      <td className="px-4 py-2.5 font-mono text-xs text-cyan-400">{type}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{tx}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SectionHeading id="event-replay">Event Replay</SectionHeading>
            <Endpoint method="POST" path="/v1/events/replay" />
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Re-deliver a past event to one or all of your active webhook endpoints.
              Useful for recovery after downtime or testing new endpoints.
            </p>
            <ParamTable
              params={[
                { name: "event_id", type: "string", required: true, desc: "The event_id to replay" },
                { name: "webhook_id", type: "string", required: false, desc: "Target specific webhook (omit for all)" },
              ]}
            />

            {/* ============================================================ */}
            {/*  DELIVERIES                                                  */}
            {/* ============================================================ */}

            <SectionHeading id="delivery-logs">Delivery Logs</SectionHeading>
            <Endpoint method="GET" path="/v1/deliveries" />
            <ParamTable
              params={[
                { name: "page", type: "integer", required: false, desc: "Page number" },
                { name: "per_page", type: "integer", required: false, desc: "Results per page (max 100)" },
                { name: "webhook_id", type: "string", required: false, desc: "Filter by webhook" },
                { name: "status", type: "string", required: false, desc: "Filter: success, failed, retrying, pending, dead_letter" },
                { name: "event_type", type: "string", required: false, desc: "Filter by event type" },
              ]}
            />

            <SectionHeading id="retry-delivery">Retry Delivery</SectionHeading>
            <Endpoint method="POST" path="/v1/deliveries/:id/retry" />
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Manually re-queue a failed or dead-letter delivery for immediate retry.
            </p>

            <SectionHeading id="delivery-statuses">Delivery Statuses</SectionHeading>
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {[
                    ["pending", "Queued for delivery, not yet attempted"],
                    ["success", "Endpoint returned 2xx within timeout"],
                    ["retrying", "Last attempt failed; scheduled for retry with backoff"],
                    ["failed", "All retry attempts exhausted"],
                    ["dead_letter", "Moved to dead-letter queue for manual inspection"],
                  ].map(([status, desc]) => (
                    <tr key={status}>
                      <td className="px-4 py-2.5 font-mono text-xs text-cyan-400">{status}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ============================================================ */}
            {/*  REFERENCE                                                   */}
            {/* ============================================================ */}

            <SectionHeading id="api-keys">API Key Management</SectionHeading>
            <Endpoint method="POST" path="/v1/api-keys" />
            <Endpoint method="GET" path="/v1/api-keys" />
            <Endpoint method="DELETE" path="/v1/api-keys/:id" />
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Create scoped API keys with optional expiration. Available scopes:
            </p>
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Scope</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Grants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {[
                    ["webhooks:read", "List and get webhook details"],
                    ["webhooks:write", "Create, update, delete webhooks"],
                    ["deliveries:read", "List delivery logs"],
                    ["deliveries:write", "Retry deliveries"],
                    ["events:read", "List and get events, replay events"],
                    ["metrics:read", "Read metrics summary"],
                  ].map(([scope, grants]) => (
                    <tr key={scope}>
                      <td className="px-4 py-2.5 font-mono text-xs text-cyan-400">{scope}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{grants}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SectionHeading id="rate-limits">Rate Limits</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              API requests are rate-limited per API key using a token bucket algorithm.
              Rate limit status is returned in response headers:
            </p>
            <CodeBlock
              code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1709042400`}
              title="Rate limit headers"
            />
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Requests / min</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Webhooks</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {[
                    ["Starter", "60", "5", "7 days"],
                    ["Pro", "300", "25", "30 days"],
                    ["Enterprise", "1,000+", "Unlimited", "Custom"],
                  ].map(([plan, rpm, wh, ret]) => (
                    <tr key={plan}>
                      <td className="px-4 py-2.5 text-xs font-medium text-white">{plan}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{rpm}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{wh}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{ret}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Callout type="info">
              If you receive a 429 response, wait until the X-RateLimit-Reset timestamp before retrying.
            </Callout>

            <SectionHeading id="error-codes">Error Codes</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              All error responses follow a consistent JSON structure:
            </p>
            <CodeBlock
              code={`{
  "error": "validation_error",
  "message": "url is required",
  "status": 400
}`}
              title="Error response"
            />
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/60 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">HTTP</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {[
                    ["400", "validation_error", "Invalid request body or parameters"],
                    ["401", "unauthorized", "Missing or invalid API key / JWT"],
                    ["403", "forbidden", "Insufficient scope for this operation"],
                    ["404", "not_found", "Resource does not exist"],
                    ["409", "conflict", "Resource already exists (idempotency)"],
                    ["429", "rate_limited", "Too many requests — back off and retry"],
                    ["500", "internal_error", "Unexpected server error"],
                  ].map(([http, code, desc]) => (
                    <tr key={code}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-300">{http}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-cyan-400">{code}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SectionHeading id="idempotency">Idempotency</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Webhook deliveries are idempotent on the pair <Code>(webhook_id, event_id)</Code>.
              If the same event is replayed to the same webhook, the delivery ID remains stable
              and no duplicate payload is sent if the prior delivery was successful.
            </p>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              Your endpoint should also handle duplicate deliveries gracefully — for example by
              checking the <Code>event_id</Code> against a local record of processed events.
            </p>

            {/* ---- Footer ---- */}
            <div className="mt-16 border-t border-gray-800 pt-8 text-center">
              <p className="text-sm text-gray-500">
                Need help?{" "}
                <a href="mailto:support@xrnotify.io" className="text-cyan-400 transition hover:text-cyan-300">
                  support@xrnotify.io
                </a>
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
