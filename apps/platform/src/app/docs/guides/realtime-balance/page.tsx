import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Real-time Balance Updates: XRNotify Docs',
  description:
    'Stream live XRP and token balance changes to your frontend using XRNotify webhooks and Server-Sent Events.',
};

export default function RealtimeBalancePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">
              Docs
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#guides" className="text-zinc-500 hover:text-zinc-300 no-underline">Guides</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Real-time Balance Updates</span>
          </div>
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors text-sm no-underline"
          >
            Home →
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 mb-4">
            Guides
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">Real-time Balance Updates</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Push live XRP and token balance changes directly to browser clients the instant
            a payment lands on-chain, with no polling required.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            There are two common approaches for delivering real-time balance data to your
            frontend:
          </p>
          <div className="space-y-3 mb-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm font-medium text-white mb-1">Approach 1: Webhook-driven (this guide)</div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                XRNotify pushes a payment event to your server. Your server updates the
                database and emits a Server-Sent Event (SSE) to connected browser clients.
                Near-instant latency, no wasted requests.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm font-medium text-white mb-1">Approach 2: Client polling</div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                The frontend polls your balance API on a fixed interval. Simpler to implement
                but introduces latency equal to the poll interval and generates unnecessary
                requests.
              </p>
            </div>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            This guide covers Approach 1: XRNotify webhook → server handler → SSE stream →
            React hook. The end result is a balance that updates on-screen within a few
            seconds of a payment confirming on-chain.
          </p>
        </section>

        {/* Setting up the webhook */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Setting up the webhook</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Subscribe to payment events and trustline creation for each wallet address you
            want to monitor. You can add multiple addresses to{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">account_filters</code>, or omit it entirely to monitor all activity.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.yourapp.com/webhooks/balance",
    "event_types": ["payment.xrp", "payment.issued", "trustline.created"],
    "account_filters": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"]
  }'`}
            </pre>
          </div>
        </section>

        {/* Server-side handler */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Server-side handler (Node.js)</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            The webhook handler verifies the signature, updates the balance in the database,
            then broadcasts the delta to any SSE clients listening on that address.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`app.post('/webhooks/balance', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifySignature(req.body, req.headers['x-xrnotify-signature'], process.env.WEBHOOK_SECRET)) {
    return res.status(401).end();
  }

  // Idempotency: skip if already processed
  const deliveryId = req.headers['x-xrnotify-delivery-id'];
  if (await cache.get(\`delivery:\${deliveryId}\`)) return res.sendStatus(200);

  const event = JSON.parse(req.body);
  const { receiver, amount, currency, issuer } = event.payload;

  switch (event.event_type) {
    case 'payment.xrp': {
      const xrp = (parseInt(amount) / 1_000_000).toFixed(6);
      await updateXrpBalance(receiver, xrp);
      await broadcastBalanceUpdate(receiver, 'XRP', null, xrp);
      break;
    }
    case 'payment.issued': {
      const { value } = event.payload;
      await updateTokenBalance(receiver, currency, issuer, value);
      await broadcastBalanceUpdate(receiver, currency, issuer, value);
      break;
    }
    case 'trustline.created': {
      // A new trustline was established - client may want to show zero balance
      await broadcastTrustlineCreated(receiver, currency, issuer);
      break;
    }
  }

  await cache.set(\`delivery:\${deliveryId}\`, 'done', 86400);
  res.sendStatus(200);
});`}
            </pre>
          </div>
        </section>

        {/* Broadcasting to connected clients */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Broadcasting to connected clients (SSE)</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Server-Sent Events are a lightweight, browser-native alternative to WebSockets
            for one-way server-to-client streaming. They reconnect automatically on
            disconnect and work through HTTP/2.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`import { EventEmitter } from 'events';
export const balanceEmitter = new EventEmitter();
balanceEmitter.setMaxListeners(0); // Unlimited concurrent SSE clients

export async function broadcastBalanceUpdate(address, currency, issuer, delta) {
  balanceEmitter.emit('update', { address, currency, issuer, delta });
}

// SSE endpoint - authenticate before registering the listener
app.get('/api/balance-stream', requireAuth, (req, res) => {
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send a heartbeat comment every 15s to keep the connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\\n\\n'), 15_000);

  const listener = (update) => {
    // Only send updates belonging to this authenticated user's addresses
    if (isAddressOwnedByUser(update.address, userId)) {
      res.write(\`data: \${JSON.stringify(update)}\\n\\n\`);
    }
  };

  balanceEmitter.on('update', listener);

  req.on('close', () => {
    clearInterval(heartbeat);
    balanceEmitter.off('update', listener);
  });
});`}
            </pre>
          </div>
        </section>

        {/* Frontend React hook */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Frontend React hook</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            This hook opens a single SSE connection for the authenticated user and applies
            incoming balance deltas to local state, giving a live-updating balance without
            any polling.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`import { useState, useEffect } from 'react';

interface BalanceUpdate {
  address: string;
  currency: string;
  issuer: string | null;
  delta: string;
}

function useRealtimeBalance(address: string, initialBalance: number = 0) {
  const [balance, setBalance] = useState<number>(initialBalance);

  useEffect(() => {
    if (!address) return;

    const es = new EventSource('/api/balance-stream');

    es.onmessage = (e) => {
      const update: BalanceUpdate = JSON.parse(e.data);
      if (update.address === address && update.currency === 'XRP') {
        setBalance(prev => Math.max(0, prev + parseFloat(update.delta)));
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects - no manual retry needed
      console.warn('SSE connection lost, reconnecting...');
    };

    return () => es.close();
  }, [address]);

  return balance;
}

// Usage in a component:
function WalletBalance({ address }: { address: string }) {
  const balance = useRealtimeBalance(address, 0);
  return <span>{balance.toFixed(6)} XRP</span>;
}`}
            </pre>
          </div>
        </section>

        {/* Token balances hook */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Extending to token balances</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            For issued currency tokens, key the balance by the{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">(currency, issuer)</code> pair:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`function useRealtimeTokenBalance(address: string, currency: string, issuer: string) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const es = new EventSource('/api/balance-stream');

    es.onmessage = (e) => {
      const update: BalanceUpdate = JSON.parse(e.data);
      if (
        update.address === address &&
        update.currency === currency &&
        update.issuer === issuer
      ) {
        setBalance(prev => prev + parseFloat(update.delta));
      }
    };

    return () => es.close();
  }, [address, currency, issuer]);

  return balance;
}`}
            </pre>
          </div>
        </section>

        {/* Handling reconnection and idempotency */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Reconnection and idempotency</h2>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300 mb-4">
            <strong className="text-white">EventSource reconnects automatically.</strong> The
            browser will re-establish the SSE connection with exponential backoff if it drops.
            You do not need to implement reconnection logic manually.
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            During an SSE reconnect, the browser sends the last seen{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">Last-Event-ID</code> header if you set event IDs server-side.
            However, a simpler strategy is to initialize the balance from your REST API on
            mount, then apply SSE deltas on top. This way a reconnect just means a brief
            gap with no missed net balance change:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`function useRealtimeBalance(address: string) {
  const [balance, setBalance] = useState<number | null>(null);

  // 1. Fetch current balance on mount
  useEffect(() => {
    fetch(\`/api/balances/\${address}\`)
      .then(r => r.json())
      .then(data => setBalance(data.xrp_balance));
  }, [address]);

  // 2. Apply live deltas on top
  useEffect(() => {
    const es = new EventSource('/api/balance-stream');
    es.onmessage = (e) => {
      const update = JSON.parse(e.data);
      if (update.address === address && update.currency === 'XRP') {
        setBalance(prev => prev !== null ? prev + parseFloat(update.delta) : null);
      }
    };
    return () => es.close();
  }, [address]);

  return balance;
}`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Because XRNotify uses the{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">X-XRNotify-Delivery-Id</code> header for every delivery (including retries),
            your webhook handler&apos;s idempotency cache prevents the same delta from being
            applied twice to the database, ensuring the REST API always returns an accurate
            balance even during retry storms.
          </p>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/guides/payment-notifications', label: 'Payment Notifications', desc: 'Send push notifications when XRP arrives' },
              { href: '/docs/guides/handling-failures', label: 'Handling Failures', desc: 'Ensure no payment event is ever missed' },
              { href: '/docs/reference/event-schema', label: 'Event Schema', desc: 'Full payload interface for payment events' },
              { href: '/docs/verify-signatures', label: 'Verifying Signatures', desc: 'HMAC-SHA256 signature verification guide' },
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
