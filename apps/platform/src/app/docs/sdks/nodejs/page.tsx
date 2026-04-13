import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Node.js SDK - XRNotify Docs',
  description: 'XRNotify Node.js SDK reference. Installation, webhook management, signature verification, and TypeScript types.',
};

export default function NodejsSdkPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#sdks" className="text-zinc-500 hover:text-zinc-300 no-underline">SDKs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Node.js</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            SDKs &amp; Libraries
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Node.js SDK</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            The official XRNotify Node.js SDK provides a typed, promise-based interface for managing webhooks, querying deliveries, and verifying webhook signatures. Supports both CommonJS and ESM. Requires Node.js 18 or later.
          </p>
        </div>

        {/* Installation */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Installation</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`npm install @xrnotify/sdk
# or
yarn add @xrnotify/sdk
# or
pnpm add @xrnotify/sdk`}</pre>
          </div>
        </section>

        {/* Initialization */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Initialization</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Create a client instance with your API key. Store the key in an environment variable. Never hard-code it.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import { XRNotify } from '@xrnotify/sdk';

const client = new XRNotify({
  apiKey: process.env.XRNOTIFY_API_KEY!,
  // Optional: use test environment for development
  // environment: 'test'
});`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Test environment:</span> Set <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">environment: &apos;test&apos;</code> to use test API keys (<code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">xrn_test_...</code>). Test mode delivers synthetic events only, with no real XRPL data consumed.
            </p>
          </div>
        </section>

        {/* Creating a webhook */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Creating a webhook</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Register a new webhook endpoint. The response includes a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">secret</code> field that is only returned once. Store it securely in your secrets manager.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`const webhook = await client.webhooks.create({
  url: 'https://yourapp.com/webhooks/xrpl',
  eventTypes: ['payment.xrp', 'nft.minted'],
  accountFilters: ['rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
  description: 'Payment processor'
});

console.log(webhook.id);      // wh_abc123
console.log(webhook.secret);  // Only available on creation - store immediately`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Important:</span> The <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">secret</code> field is only present in the creation response. It cannot be retrieved again. If lost, delete and recreate the webhook.
            </p>
          </div>
        </section>

        {/* Listing webhooks */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Listing webhooks</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Retrieve a paginated list of webhooks in your account. Use <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">hasMore</code> and the last item&apos;s ID to paginate through results.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`const { data, hasMore } = await client.webhooks.list({ limit: 10 });

for (const webhook of data) {
  console.log(webhook.id, webhook.url, webhook.isActive);
}

// Fetch the next page
if (hasMore) {
  const nextPage = await client.webhooks.list({
    limit: 10,
    startingAfter: data[data.length - 1].id
  });
}`}</pre>
          </div>
        </section>

        {/* Updating */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Updating a webhook</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Update any field of an existing webhook. Only the fields you provide are changed. Unspecified fields retain their current values.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`// Pause a webhook
await client.webhooks.update('wh_abc123', {
  isActive: false
});

// Change subscribed events
await client.webhooks.update('wh_abc123', {
  eventTypes: ['payment.xrp', 'payment.issued', 'nft.*']
});

// Update both URL and filters
await client.webhooks.update('wh_abc123', {
  url: 'https://newapp.com/webhooks/xrpl',
  accountFilters: ['rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN']
});`}</pre>
          </div>
        </section>

        {/* Listing deliveries */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Listing deliveries</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Query delivery history for a webhook, filtered by status and time range. Useful for debugging failed deliveries.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`const { data } = await client.deliveries.list({
  webhookId: 'wh_abc123',
  status: 'failed',
  since: new Date('2024-01-01')
});

for (const delivery of data) {
  console.log(
    delivery.id,
    delivery.eventType,
    delivery.statusCode,
    delivery.lastError
  );
}`}</pre>
          </div>
        </section>

        {/* Signature verification */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Verifying signatures</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Always verify the <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">X-XRNotify-Signature</code> header before processing an incoming webhook. The SDK provides a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">verifySignature</code> helper that uses a constant-time comparison to prevent timing attacks.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import { verifySignature } from '@xrnotify/sdk';
import express from 'express';

const app = express();

// Use express.raw(), NOT express.json(), to get the raw body buffer
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const isValid = verifySignature({
    payload: req.body,
    signature: req.headers['x-xrnotify-signature'] as string,
    secret: process.env.WEBHOOK_SECRET!
  });

  if (!isValid) {
    return res.status(401).send('Unauthorized');
  }

  const event = JSON.parse(req.body);

  switch (event.event_type) {
    case 'payment.xrp':
      console.log('XRP payment:', event.payload.amount_xrp, 'XRP');
      break;
    case 'nft.minted':
      console.log('NFT minted:', event.payload.nft_id);
      break;
  }

  res.sendStatus(200);
});`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Raw body required:</span> Signature verification operates on the raw bytes of the request body. Parsing JSON before calling <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">verifySignature</code> will corrupt the comparison and cause all signatures to fail.
            </p>
          </div>
        </section>

        {/* TypeScript types */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">TypeScript types</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            The SDK exports full TypeScript types for all events and payloads. Use these to write type-safe event handlers.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import type {
  WebhookEvent,
  PaymentXrpPayload,
  PaymentIssuedPayload,
  NftMintedPayload,
  NftOfferAcceptedPayload,
  DexOfferFilledPayload,
  TrustlineCreatedPayload
} from '@xrnotify/sdk';

function handleEvent(event: WebhookEvent): void {
  if (event.event_type === 'payment.xrp') {
    const payload = event.payload as PaymentXrpPayload;
    console.log(\`\${payload.amount_xrp} XRP from \${payload.sender} to \${payload.receiver}\`);
  }

  if (event.event_type === 'nft.minted') {
    const payload = event.payload as NftMintedPayload;
    console.log('New NFT:', payload.nft_id, 'URI:', payload.uri_decoded);
  }
}`}</pre>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/sdks/python" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Python SDK</p>
              <p className="text-zinc-500 text-sm">pip install xrnotify</p>
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
