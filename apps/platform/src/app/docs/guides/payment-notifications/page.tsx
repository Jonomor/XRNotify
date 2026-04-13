import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Building a Payment Notification System: XRNotify Docs',
  description:
    'End-to-end tutorial for building a real-time payment notification system on XRPL using XRNotify webhooks.',
};

export default function PaymentNotificationsPage() {
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
            <span className="text-zinc-300">Payment Notifications</span>
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
            Guides
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">
            Building a Payment Notification System
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Learn how to receive real-time payment events from the XRP Ledger and deliver
            push notifications to your users when funds arrive.
          </p>
        </div>

        {/* Architecture overview */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Architecture overview</h2>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            The data flow for a payment notification system is straightforward. XRNotify
            monitors the XRPL on your behalf and forwards matching events to your server,
            which then fans out to whichever push notification service your app uses.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`XRPL Mainnet → XRNotify → Your Server → Push Notification Service → User`}
            </pre>
          </div>
          <ul className="space-y-3 text-zinc-300">
            <li>
              <span className="text-white font-medium">XRPL Mainnet</span>: the source of
              truth. Every payment, NFT transfer, and DEX trade is recorded in an immutable
              ledger that closes roughly every 3–4 seconds.
            </li>
            <li>
              <span className="text-white font-medium">XRNotify</span>: listens to the
              validated ledger stream, detects events matching your webhook configuration,
              signs and delivers HTTP POST requests to your server with a 10-second timeout
              and automatic retries.
            </li>
            <li>
              <span className="text-white font-medium">Your Server</span>: verifies the
              webhook signature, updates your database, and dispatches the notification.
            </li>
            <li>
              <span className="text-white font-medium">Push Notification Service</span>: any
              provider such as Firebase Cloud Messaging, Apple Push Notification Service, or
              a third-party service like OneSignal.
            </li>
            <li>
              <span className="text-white font-medium">User</span>: receives a push
              notification on their device within seconds of the ledger closing.
            </li>
          </ul>
        </section>

        {/* Step 1 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-1">Step 1: Set up the webhook</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Subscribe to <code className="text-emerald-400 bg-zinc-800 px-1 rounded">payment.xrp</code> and{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">payment.issued</code> for a specific wallet address.
            Using an <code className="text-emerald-400 bg-zinc-800 px-1 rounded">account_filters</code> array narrows delivery to only
            events where your user&apos;s address is the sender or receiver, keeping your payload volume low.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.yourapp.com/webhooks/payments",
    "event_types": ["payment.xrp", "payment.issued"],
    "account_filters": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"]
  }'`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm">
            The response includes the webhook&apos;s <code className="text-emerald-400 bg-zinc-800 px-1 rounded">secret</code> field. Store this securely. You will use
            it to verify signatures on every incoming delivery.
          </p>
        </section>

        {/* Step 2 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-1">
            Step 2: Handle <code className="text-emerald-400">payment.xrp</code> events
          </h2>
          <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Set up a route that accepts raw request bodies (required for HMAC signature
            verification), verifies the signature, then converts the amount from drops to XRP
            before dispatching the notification.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`app.post('/webhooks/payments', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-xrnotify-signature'];
  if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event_type === 'payment.xrp') {
    const { receiver, amount, destination_tag } = event.payload;
    const amountXrp = (parseInt(amount) / 1_000_000).toFixed(6);

    // Find user by address
    const user = await db.users.findByXrplAddress(receiver);
    if (!user) return res.sendStatus(200); // Not our user

    // Update balance in DB
    await db.balances.increment(user.id, amountXrp);

    // Send push notification
    await pushService.send({
      userId: user.id,
      title: 'Payment Received',
      body: \`You received \${amountXrp} XRP\`,
    });
  }

  res.sendStatus(200);
});`}
            </pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            XRP amounts on the ledger are always expressed in <strong className="text-white">drops</strong> (1 XRP = 1,000,000 drops).
            Always divide by <code className="text-emerald-400">1_000_000</code> before displaying or storing as XRP.
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-1">
            Step 3: Handle <code className="text-emerald-400">payment.issued</code> events
          </h2>
          <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
            Issued currency payments carry additional fields (<code className="text-emerald-400 bg-zinc-800 px-1 rounded">currency</code>,{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">issuer</code>, and{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">value</code>) instead of a raw drops amount.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`  if (event.event_type === 'payment.issued') {
    const { receiver, currency, issuer, value } = event.payload;

    const user = await db.users.findByXrplAddress(receiver);
    if (!user) return res.sendStatus(200);

    // Update token balance; key by (currency, issuer) pair
    await db.tokenBalances.increment(user.id, currency, issuer, value);

    await pushService.send({
      userId: user.id,
      title: 'Token Payment Received',
      body: \`You received \${value} \${currency}\`,
    });
  }`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm">
            Note that the same currency code can be issued by different addresses, so you
            must always treat the <code className="text-emerald-400 bg-zinc-800 px-1 rounded">(currency, issuer)</code> pair as the composite key for a token balance.
          </p>
        </section>

        {/* Step 4 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Step 4: Handle edge cases</h2>

          <h3 className="text-base font-semibold text-white mb-2">Idempotency</h3>
          <p className="text-zinc-300 text-sm mb-3 leading-relaxed">
            XRNotify retries deliveries if your endpoint returns a non-2xx status or times out.
            Use the <code className="text-emerald-400 bg-zinc-800 px-1 rounded">X-XRNotify-Delivery-Id</code> header to detect and skip duplicates:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`const deliveryId = req.headers['x-xrnotify-delivery-id'];
const alreadyProcessed = await cache.get(\`delivery:\${deliveryId}\`);
if (alreadyProcessed) return res.sendStatus(200);

// ... process event ...

await cache.set(\`delivery:\${deliveryId}\`, 'done', 86400); // 24h TTL`}
            </pre>
          </div>

          <h3 className="text-base font-semibold text-white mb-2">Failed deliveries</h3>
          <p className="text-zinc-300 text-sm mb-3 leading-relaxed">
            If your endpoint was unreachable during a window, use the Replay API to
            re-deliver all missed events in bulk rather than retrying individual deliveries
            one by one. See the{' '}
            <Link href="/docs/api/replay" className="text-emerald-400 hover:text-emerald-300">
              Replay API reference
            </Link>{' '}
            for details.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Destination tags</h3>
          <p className="text-zinc-300 text-sm leading-relaxed">
            XRPL destination tags are integers that senders attach to payments to identify
            the beneficiary on a shared address. Map tags to internal user IDs in your
            database so you can credit the correct account even when many users share a
            single deposit address.
          </p>
        </section>

        {/* Step 5 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Step 5: Monitor delivery health</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Keep an eye on your webhook&apos;s delivery success rate to catch outages early.
            You can query delivery stats from the API:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl "https://api.xrnotify.io/v1/webhooks/wh_abc123/stats" \\
  -H "X-XRNotify-Key: xrn_live_xxx"`}
            </pre>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            The response includes <code className="text-emerald-400 bg-zinc-800 px-1 rounded">total_deliveries</code>,{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">successful_deliveries</code>,{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">failed_deliveries</code>, and{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">success_rate</code>.
            You can also view a visual breakdown on the{' '}
            <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300">
              dashboard
            </Link>
            .
          </p>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/guides/handling-failures', label: 'Handling Webhook Failures', desc: 'Retry policy, idempotency, and recovery strategies' },
              { href: '/docs/guides/realtime-balance', label: 'Real-time Balance Updates', desc: 'Push balance changes to connected browser clients via SSE' },
              { href: '/docs/reference/event-schema', label: 'Event Schema', desc: 'Full TypeScript interface for every XRNotify event' },
              { href: '/docs/verify-signatures', label: 'Verifying Signatures', desc: 'Secure your endpoint with HMAC-SHA256 validation' },
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
