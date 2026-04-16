import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Quick Start Guide',
  description: 'Get up and running with XRNotify in minutes. Learn how to create webhooks, verify signatures, and handle XRPL events.',
};

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">Getting Started</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Quick Start Guide</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Getting Started
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Quick Start Guide</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Get XRNotify integrated in your application in under 10 minutes. This guide walks you through creating an API key, registering a webhook, verifying signatures, and testing your integration.
          </p>
        </div>

        {/* Step 1 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">1</div>
            <h2 className="text-2xl font-semibold text-white">Get your API key</h2>
          </div>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            Every request to the XRNotify API must be authenticated with an API key. Navigate to your dashboard to create one.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-zinc-300 mb-4 ml-2">
            <li>Open your <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300">Dashboard</Link></li>
            <li>Go to <span className="text-white font-medium">Settings → API Keys</span></li>
            <li>Click <span className="text-white font-medium">Create new key</span></li>
            <li>Copy and store the key securely. It won't be shown again</li>
          </ol>
          <p className="text-zinc-400 mb-4 text-sm">
            Your key will look like this:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <code className="text-emerald-400 font-mono text-sm">xrn_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Tip:</span> Use test keys (<code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">xrn_test_...</code>) during development. Test keys behave identically but only deliver test events, with no real XRPL data.
            </p>
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">2</div>
            <h2 className="text-2xl font-semibold text-white">Register a webhook</h2>
          </div>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            A webhook is an HTTPS endpoint in your application that XRNotify will POST events to. Register it using the API or the dashboard.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/xrpl",
    "event_types": ["payment.xrp", "nft.minted"],
    "account_filters": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"]
  }'`}</pre>
          </div>
          <p className="text-zinc-400 text-sm">
            The <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">account_filters</code> field is optional. Omit it to receive events for all XRPL accounts. The response includes a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">secret</code> field that you'll use to verify incoming requests.
          </p>
        </section>

        {/* Step 3 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">3</div>
            <h2 className="text-2xl font-semibold text-white">Handle incoming webhooks</h2>
          </div>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            When XRNotify delivers an event to your endpoint, it signs the raw request body using HMAC-SHA256 and includes the signature in the <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">X-XRNotify-Signature</code> header. Always verify this before processing.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/xrpl', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-xrnotify-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (signature !== \`sha256=\${expected}\`) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  console.log('Event received:', event.event_type);

  // Handle your event types
  switch (event.event_type) {
    case 'payment.xrp':
      // handle XRP payment
      break;
    case 'nft.minted':
      // handle NFT mint
      break;
  }

  res.status(200).send('OK');
});

app.listen(3000);`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Important:</span> Use <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">express.raw()</code>, not <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">express.json()</code>, so you can verify the raw bytes. Parsing JSON before verification will break signature checks.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">4</div>
            <h2 className="text-2xl font-semibold text-white">Test your integration</h2>
          </div>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            Send a test event to your webhook without waiting for a real XRPL transaction:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/webhooks/wh_your_id_here/test \\
  -H "X-XRNotify-Key: xrn_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"event_type": "payment.xrp"}'`}</pre>
          </div>
          <p className="text-zinc-400 text-sm">
            Alternatively, trigger a real transaction on the <a href="https://xrpl.org/xrp-testnet-faucet.html" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">XRPL Testnet</a> using a funded wallet. XRNotify will detect and deliver the event within seconds.
          </p>
        </section>

        {/* Event payload reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Event payload structure</h2>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            Every event delivered to your webhook follows this structure. The <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">payload</code> field varies by event type.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "event_id": "xrpl:89547832:A4B2F1E3C9D4:payment.xrp",
  "event_type": "payment.xrp",
  "ledger_index": 89547832,
  "timestamp": "2024-01-15T10:23:45Z",
  "network": "mainnet",
  "webhook_id": "wh_abc123",
  "payload": {
    "sender": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "receiver": "rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN",
    "amount": "1000000",
    "fee": "12",
    "delivered_amount": "1000000",
    "destination_tag": 12345,
    "tx_hash": "A4B2F1E3C9D4..."
  }
}`}</pre>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 mb-1">amounts</p>
              <p className="text-zinc-300">XRP amounts are in drops (1 XRP = 1,000,000 drops)</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-400 mb-1">idempotency</p>
              <p className="text-zinc-300">Use <code className="font-mono text-zinc-200">event_id</code> to deduplicate in your database</p>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/verify-signatures" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Verify Signatures</p>
              <p className="text-zinc-500 text-sm">Examples in Node.js, Python, Go, and Ruby</p>
            </Link>
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API</p>
              <p className="text-zinc-500 text-sm">Full reference for all webhook endpoints</p>
            </Link>
            <Link href="/docs/api/events" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Event Types</p>
              <p className="text-zinc-500 text-sm">All supported XRPL event types and payloads</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
