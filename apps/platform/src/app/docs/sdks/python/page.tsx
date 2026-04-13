import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Python SDK - XRNotify Docs',
  description: 'XRNotify Python SDK reference. Installation, webhook management, signature verification, and Pydantic type models.',
};

export default function PythonSdkPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#sdks" className="text-zinc-500 hover:text-zinc-300 no-underline">SDKs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Python</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            SDKs &amp; Libraries
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Python SDK</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            The official XRNotify Python SDK provides a synchronous and async-compatible interface for managing webhooks, querying deliveries, and verifying signatures. Full Pydantic models are included for type-safe event handling.
          </p>
        </div>

        {/* Requirements */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Installation</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`pip install xrnotify`}</pre>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className="text-zinc-400 text-xs mb-1">Python</p>
              <p className="text-white font-mono text-sm">3.8+</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className="text-zinc-400 text-xs mb-1">HTTP</p>
              <p className="text-white font-mono text-sm">httpx</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className="text-zinc-400 text-xs mb-1">Types</p>
              <p className="text-white font-mono text-sm">pydantic</p>
            </div>
          </div>
        </section>

        {/* Initialization */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Initialization</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Import and instantiate the client with your API key from an environment variable.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import os
from xrnotify import XRNotify

client = XRNotify(api_key=os.environ["XRNOTIFY_API_KEY"])

# Optional: use the test environment
# client = XRNotify(
#     api_key=os.environ["XRNOTIFY_TEST_KEY"],
#     environment="test"
# )`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Test environment:</span> Pass <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">environment=&quot;test&quot;</code> to use test API keys. Synthetic events will be delivered without consuming real XRPL data.
            </p>
          </div>
        </section>

        {/* Creating a webhook */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Creating a webhook</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Register a webhook endpoint. The <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">secret</code> attribute is only present on the creation response.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`webhook = client.webhooks.create(
    url="https://yourapp.com/webhooks/xrpl",
    event_types=["payment.xrp", "nft.minted"],
    account_filters=["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"],
    description="Payment processor"
)

print(webhook.id)      # wh_abc123
print(webhook.secret)  # Only available on creation - store immediately`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Important:</span> The <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">secret</code> field is returned once at creation. It cannot be retrieved again. Store it in your secrets manager immediately.
            </p>
          </div>
        </section>

        {/* Listing and updating */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Listing and updating webhooks</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            List all webhooks in your account and update existing ones. Only the keyword arguments you pass are changed.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`# List webhooks
result = client.webhooks.list(limit=10)
for wh in result.data:
    print(wh.id, wh.url, wh.is_active)

# Paginate
if result.has_more:
    next_page = client.webhooks.list(
        limit=10,
        starting_after=result.data[-1].id
    )

# Pause a webhook
client.webhooks.update("wh_abc123", is_active=False)

# Update subscribed event types
client.webhooks.update("wh_abc123", event_types=["payment.*", "nft.*"])

# Delete a webhook
client.webhooks.delete("wh_abc123")`}</pre>
          </div>
        </section>

        {/* Listing deliveries */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Listing deliveries</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Query delivery history filtered by webhook, status, and time range. Pass a timezone-aware <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">datetime</code> for the <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">since</code> parameter.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`from datetime import datetime, timezone

result = client.deliveries.list(
    webhook_id="wh_abc123",
    status="failed",
    since=datetime(2024, 1, 1, tzinfo=timezone.utc)
)

for delivery in result.data:
    print(
        delivery.id,
        delivery.event_type,
        delivery.status_code,
        delivery.last_error
    )`}</pre>
          </div>
        </section>

        {/* Signature verification */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Verifying signatures</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Use <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">verify_signature</code> from the SDK to validate incoming webhook requests. The function uses <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">hmac.compare_digest</code> internally for constant-time comparison.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import os
from flask import Flask, request
from xrnotify import verify_signature

app = Flask(__name__)

@app.route("/webhooks/xrpl", methods=["POST"])
def handle_webhook():
    # Verify before parsing - use request.data (raw bytes)
    if not verify_signature(
        payload=request.data,
        signature=request.headers.get("X-XRNotify-Signature", ""),
        secret=os.environ["WEBHOOK_SECRET"]
    ):
        return "Unauthorized", 401

    event = request.get_json(force=True)
    handle_event(event)
    return "OK", 200


def handle_event(event: dict) -> None:
    event_type = event.get("event_type")
    if event_type == "payment.xrp":
        payload = event["payload"]
        print(f"XRP payment: {payload['amount_xrp']} XRP")
    elif event_type == "nft.minted":
        payload = event["payload"]
        print(f"NFT minted: {payload['nft_id']}")`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Raw body required:</span> Pass <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">request.data</code> (bytes), not <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">request.get_json()</code>. The signature is computed over the raw bytes before any JSON parsing.
            </p>
          </div>
        </section>

        {/* Type hints */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Pydantic models</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            The SDK ships Pydantic v2 models for every event type. Use them for validation, serialization, and IDE autocompletion.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`from xrnotify.models import (
    WebhookEvent,
    PaymentXrpPayload,
    PaymentIssuedPayload,
    NftMintedPayload,
    DexOfferFilledPayload,
)


def handle_event(data: dict) -> None:
    event = WebhookEvent(**data)

    if event.event_type == "payment.xrp":
        payload = PaymentXrpPayload(**event.payload)
        print(f"Received {payload.amount_xrp} XRP")
        print(f"From: {payload.sender} → {payload.receiver}")

    elif event.event_type == "nft.minted":
        payload = NftMintedPayload(**event.payload)
        print(f"NFT {payload.nft_id} minted by {payload.issuer}")
        if payload.uri_decoded:
            print(f"Metadata: {payload.uri_decoded}")`}</pre>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/sdks/nodejs" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Node.js SDK</p>
              <p className="text-zinc-500 text-sm">npm install @xrnotify/sdk</p>
            </Link>
            <Link href="/docs/sdks/go" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Go SDK</p>
              <p className="text-zinc-500 text-sm">go get github.com/xrnotify/xrnotify-go</p>
            </Link>
            <Link href="/docs/sdks/signature-helpers" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Signature Helpers</p>
              <p className="text-zinc-500 text-sm">Copy-paste verification for any language</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
