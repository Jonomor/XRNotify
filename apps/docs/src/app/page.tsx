import Link from "next/link";
import type { Metadata } from "next";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "XRNotify — XRPL Webhook & Event Notification Platform",
  description:
    "Real-time XRPL event webhooks for developers. Payments, NFTs, DEX activity, trustlines — delivered to your endpoint with HMAC signatures, retries, and full audit logs.",
  openGraph: {
    title: "XRNotify — XRPL Webhooks for Developers",
    description:
      "Subscribe to XRPL events and receive reliable webhook deliveries with signatures, retries, and replay.",
    url: "https://xrnotify.dev",
    siteName: "XRNotify",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Code Snippets                                                      */
/* ------------------------------------------------------------------ */

const CURL_CREATE = `curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/xrpl",
    "event_types": ["payment", "nft.mint"],
    "description": "Production listener"
  }'`;

const VERIFY_SIG = `import crypto from "node:crypto";

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(\`sha256=\${expected}\`),
    Buffer.from(signature)
  );
}

// In your webhook handler:
app.post("/webhooks/xrpl", (req, res) => {
  const sig = req.headers["x-xrnotify-signature"];
  if (!verifySignature(req.rawBody, sig, WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }
  // Process event...
  res.status(200).send("OK");
});`;

const EVENT_PAYLOAD = `{
  "event_id": "xrpl:92845631:A1B2C3...D4E5:payment",
  "ledger_index": 92845631,
  "tx_hash": "A1B2C3D4E5F6...",
  "event_type": "payment",
  "timestamp": "2026-02-26T14:30:00.000Z",
  "account_context": ["rSourceAddr...", "rDestAddr..."],
  "payload": {
    "source": "rSourceAddr...",
    "destination": "rDestAddr...",
    "amount": { "currency": "XRP", "value": "100.000000" },
    "destination_tag": 12345
  }
}`;

/* ------------------------------------------------------------------ */
/*  Feature Card                                                       */
/* ------------------------------------------------------------------ */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 transition hover:border-gray-700">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Code Block                                                         */
/* ------------------------------------------------------------------ */

function CodeBlock({
  code,
  language,
  title,
}: {
  code: string;
  language: string;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800">
      {title && (
        <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-gray-700" />
            <span className="h-3 w-3 rounded-full bg-gray-700" />
            <span className="h-3 w-3 rounded-full bg-gray-700" />
          </div>
          <span className="text-xs font-medium text-gray-500">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto bg-gray-950 p-4 text-sm leading-relaxed">
        <code className={`language-${language} text-gray-300`}>{code}</code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step                                                               */
/* ------------------------------------------------------------------ */

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex shrink-0 flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
          {number}
        </div>
        <div className="mt-2 h-full w-px bg-gray-800" />
      </div>
      <div className="pb-10">
        <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocsLanding() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-white shadow-md shadow-cyan-500/20">
              XR
            </div>
            <span className="text-base font-bold tracking-tight">XRNotify</span>
            <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">Docs</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/docs/" className="text-sm text-gray-400 transition hover:text-white">
              Documentation
            </Link>
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.xrnotify.io"}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
            >
              Dashboard
            </a>
          </nav>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">Real-time XRPL Events</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              XRPL webhooks for{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                developers
              </span>
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-gray-400">
              Subscribe to payments, NFT events, DEX activity, and more. XRNotify delivers
              signed webhook payloads to your endpoints with automatic retries, dead-letter
              handling, and full delivery audit logs.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/docs/"
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500"
              >
                Read the Docs
              </Link>
              <a
                href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.xrnotify.io"}
                className="rounded-lg border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                Get Started Free
              </a>
            </div>
          </div>
        </div>

        {/* Background glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
      </section>

      {/* ---- Features ---- */}
      <section className="border-t border-gray-800/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Built for reliability</h2>
            <p className="text-gray-400">Everything you need to integrate XRPL events into your application.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
              title="Real-Time Streaming"
              description="Subscribe to XRPL ledger events as they happen. Payments, NFT mints, DEX orders, trustline changes — all normalized into a stable schema."
            />
            <Feature
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
              title="HMAC Signed Payloads"
              description="Every delivery includes an X-XRNotify-Signature header. Verify authenticity with your webhook secret using HMAC-SHA256."
            />
            <Feature
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" /></svg>}
              title="Automatic Retries"
              description="Failed deliveries are retried with exponential backoff and jitter. Exhausted retries move to a dead-letter queue for manual inspection."
            />
            <Feature
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
              title="Event Replay"
              description="Missed an event? Replay any past event to your endpoints on demand. Backfill after downtime without data loss."
            />
            <Feature
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>}
              title="Delivery Analytics"
              description="Full audit trail for every delivery attempt. Response codes, latency, error messages, and retry history — all searchable."
            />
            <Feature
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>}
              title="Scoped API Keys"
              description="Create multiple API keys with granular scopes. Rotate keys without downtime. Keys are hashed at rest — never stored in plaintext."
            />
          </div>
        </div>
      </section>

      {/* ---- Quick Start ---- */}
      <section className="border-t border-gray-800/60 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Quick Start</h2>
            <p className="text-gray-400">Start receiving XRPL events in three steps.</p>
          </div>

          <Step number={1} title="Create a webhook endpoint">
            <p className="mb-4 text-sm text-gray-400">
              Register your HTTPS endpoint and choose which event types to receive.
            </p>
            <CodeBlock code={CURL_CREATE} language="bash" title="Terminal" />
          </Step>

          <Step number={2} title="Verify webhook signatures">
            <p className="mb-4 text-sm text-gray-400">
              Every delivery includes an HMAC-SHA256 signature. Verify it to ensure
              the payload is authentic and hasn&apos;t been tampered with.
            </p>
            <CodeBlock code={VERIFY_SIG} language="javascript" title="verify.js" />
          </Step>

          <Step number={3} title="Process events">
            <p className="mb-4 text-sm text-gray-400">
              All events follow a stable, normalized schema. Here&apos;s what a payment
              event looks like:
            </p>
            <CodeBlock code={EVENT_PAYLOAD} language="json" title="Event Payload" />
          </Step>
        </div>
      </section>

      {/* ---- Supported Events ---- */}
      <section className="border-t border-gray-800/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Supported Event Types</h2>
            <p className="text-gray-400">All major XRPL transaction types, normalized and ready.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { type: "payment", desc: "XRP and issued currency payments" },
              { type: "trustset", desc: "Trustline creation and modification" },
              { type: "nft.mint", desc: "NFToken minting events" },
              { type: "nft.burn", desc: "NFToken burn events" },
              { type: "nft.accept_offer", desc: "NFT offer acceptance (buy/sell)" },
              { type: "offer.create", desc: "DEX order placement" },
              { type: "offer.cancel", desc: "DEX order cancellation" },
              { type: "account.set", desc: "Account settings changes" },
              { type: "account.delete", desc: "Account deletion events" },
            ].map((e) => (
              <div
                key={e.type}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3 transition hover:border-gray-700"
              >
                <code className="rounded bg-cyan-500/10 px-2 py-0.5 font-mono text-xs text-cyan-400">
                  {e.type}
                </code>
                <span className="text-sm text-gray-400">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="border-t border-gray-800/60 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">Ready to build?</h2>
          <p className="mb-8 text-gray-400">
            Create your free account and start receiving XRPL webhooks in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.xrnotify.io"}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500"
            >
              Get Started Free
            </a>
            <Link
              href="/docs/"
              className="rounded-lg border border-gray-700 px-8 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-gray-800/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-[8px] font-black text-white">
              XR
            </div>
            <span className="text-sm font-semibold text-gray-400">XRNotify</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/docs/" className="transition hover:text-gray-300">Docs</Link>
            <a href="https://xrnotify.io" className="transition hover:text-gray-300">Website</a>
            <a href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.xrnotify.io"} className="transition hover:text-gray-300">Dashboard</a>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} XRNotify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
