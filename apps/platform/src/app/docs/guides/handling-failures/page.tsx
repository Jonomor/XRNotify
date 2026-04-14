import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Handling Webhook Failures: XRNotify Docs',
  description:
    'Learn how XRNotify retries failed deliveries, how to recover missed events with the Replay API, and how to build an idempotent webhook handler.',
};

export default function HandlingFailuresPage() {
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
            <span className="text-zinc-300">Handling Failures</span>
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
          <h1 className="text-3xl font-bold text-white mb-3">Handling Webhook Failures</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Understand how XRNotify retries failed deliveries, how to recover from extended
            outages with the Replay API, and how to build an idempotent handler that safely
            processes retried events.
          </p>
        </div>

        {/* Retry policy */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Retry policy overview</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            XRNotify automatically retries a delivery whenever your endpoint returns a
            non-2xx HTTP status or does not respond within the 10-second timeout. Retries
            follow an exponential backoff schedule with ±10% jitter:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Attempt</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Delay</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Total elapsed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['1 (initial)', 'Immediate', '0s'],
                  ['2', '1 second', '~1s'],
                  ['3', '5 seconds', '~6s'],
                  ['4', '30 seconds', '~36s'],
                  ['5', '2 minutes', '~2.5m'],
                  ['6', '10 minutes', '~12.5m'],
                  ['7', '30 minutes', '~42.5m'],
                  ['8', '2 hours', '~2.7h'],
                  ['9', '6 hours', '~8.7h'],
                  ['10', '12 hours', '~20.7h'],
                ].map(([attempt, delay, elapsed]) => (
                  <tr key={attempt}>
                    <td className="py-2 pr-6 text-zinc-300">{attempt}</td>
                    <td className="py-2 pr-6 text-zinc-300">{delay}</td>
                    <td className="py-2 text-zinc-300">{elapsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            After 10 attempts the delivery status becomes{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">failed</code>. No further automatic retries occur, but
            you can trigger a manual retry at any time. See the full schedule in the{' '}
            <Link href="/docs/reference/retry-policy" className="text-emerald-400 hover:text-emerald-300">
              Retry Policy reference
            </Link>
            .
          </p>
        </section>

        {/* Checking failed deliveries */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Checking failed deliveries</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Query the deliveries API with a status filter to see everything that failed for
            a given webhook:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl "https://api.xrnotify.io/v1/deliveries?status=failed&webhook_id=wh_abc" \\
  -H "X-XRNotify-Key: xrn_live_xxx"`}
            </pre>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Each delivery object in the response includes{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">last_error</code>,{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">attempts</code>, and{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">next_retry_at</code> so you can understand exactly what went wrong.
            You can also view this on the{' '}
            <Link href="/dashboard/deliveries" className="text-emerald-400 hover:text-emerald-300">
              Deliveries page
            </Link>{' '}
            in the dashboard.
          </p>
        </section>

        {/* Manual retry */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Manual retry (single delivery)</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            If a delivery has exhausted its automatic retries, or you want to force an
            immediate re-attempt before the next scheduled retry, call the retry endpoint:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X POST https://api.xrnotify.io/v1/deliveries/dlv_abc123/retry \\
  -H "X-XRNotify-Key: xrn_live_xxx"`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm">
            The delivery will be dispatched immediately. The response includes the new{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">status</code> and{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">response_code</code> once the attempt completes.
          </p>
        </section>

        {/* Bulk recovery */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Bulk recovery with the Replay API</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            If your endpoint was down for several hours and many deliveries failed, retrying
            them individually is impractical. The Replay API re-delivers all events matching
            a time window and optional event type filter in a single call:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X POST https://api.xrnotify.io/v1/replay \\
  -H "X-XRNotify-Key: xrn_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_id": "wh_abc123",
    "filters": {
      "since": "2024-01-15T00:00:00Z",
      "until": "2024-01-15T06:00:00Z",
      "event_types": ["payment.xrp"]
    }
  }'`}
            </pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            Because the Replay API re-delivers events, your handler will receive{' '}
            <code className="text-emerald-400">X-XRNotify-Delivery-Id</code> values that differ from the original delivery IDs.
            Ensure your idempotency key is derived from the <strong className="text-white">event_id</strong> field
            in the body (which is deterministic) rather than the delivery ID header.
          </div>
        </section>

        {/* Idempotency */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Idempotency</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Because XRNotify retries deliveries, your endpoint may receive the same event
            more than once. Use the{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">X-XRNotify-Delivery-Id</code> header to record processed deliveries
            and skip duplicates:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  // 1. Verify signature first
  if (!verifySignature(req.body, req.headers['x-xrnotify-signature'], process.env.WEBHOOK_SECRET)) {
    return res.status(401).end();
  }

  const deliveryId = req.headers['x-xrnotify-delivery-id'];

  // 2. Check if already processed
  const processed = await cache.get(\`delivery:\${deliveryId}\`);
  if (processed) return res.sendStatus(200); // Already done - safe to ack

  // 3. Process event
  const event = JSON.parse(req.body);
  await processEvent(event);

  // 4. Mark as processed with a 24-hour TTL
  await cache.set(\`delivery:\${deliveryId}\`, 'done', 86400);

  res.sendStatus(200);
});`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Any in-memory store, Redis, or database table works for the idempotency cache.
            The 24-hour TTL is sufficient because XRNotify&apos;s retry window is approximately 21 hours.
          </p>
        </section>

        {/* Making your endpoint resilient */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Making your endpoint resilient</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            A well-designed webhook endpoint minimises the chance of generating failures in
            the first place:
          </p>
          <ul className="space-y-3 text-zinc-300 text-sm">
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Respond within 10 seconds.</strong> XRNotify&apos;s delivery timeout is 10 seconds. If your
                processing takes longer, push the event to an internal queue (SQS, BullMQ,
                etc.) immediately and acknowledge with <code className="text-emerald-400 bg-zinc-800 px-1 rounded">200 OK</code>. Process asynchronously.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Always return 200 on receipt.</strong> Acknowledge the delivery as soon as you&apos;ve
                safely queued the event, even if downstream processing fails. Track your
                own processing failures in a dead-letter queue separate from XRNotify&apos;s
                retry mechanism.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Monitor your own queue.</strong> XRNotify&apos;s retry mechanism ensures delivery to your
                endpoint, but it cannot guarantee that your internal processing succeeds.
                Set up alerts on your dead-letter queue depth.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Use a valid TLS certificate.</strong> Expired or self-signed certificates cause
                immediate failures. Use a certificate from a public CA and set up automatic
                renewal (e.g., Let&apos;s Encrypt with Certbot).
              </span>
            </li>
          </ul>
        </section>

        {/* Auto-disable warning */}
        <section className="mb-10">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-zinc-300">
            <strong className="text-amber-300">Warning:</strong> If your endpoint returns 5xx errors
            consistently, XRNotify may automatically disable the webhook after 100 consecutive
            failures. You will receive an email notification when this happens. Re-enable the
            webhook from the dashboard or via{' '}
            <code className="text-emerald-400">PATCH /v1/webhooks/&#123;id&#125;</code>{' '}
            once your endpoint is healthy.
          </div>
        </section>

        {/* Delivery health */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Delivery health dashboard</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            The Stats endpoint returns aggregate delivery metrics for a webhook over the
            last 24 hours:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl "https://api.xrnotify.io/v1/webhooks/wh_abc123/stats" \\
  -H "X-XRNotify-Key: xrn_live_xxx"`}
            </pre>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            You can also view a real-time success rate chart and per-delivery logs on the{' '}
            <Link href="/dashboard/deliveries" className="text-emerald-400 hover:text-emerald-300">
              Deliveries page
            </Link>{' '}
            in the dashboard, with no API call needed.
          </p>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/reference/retry-policy', label: 'Retry Policy Reference', desc: 'Full retry schedule, jitter formula, and auto-disable logic' },
              { href: '/docs/api/replay', label: 'Replay API Reference', desc: 'Full request/response spec for the Replay endpoint' },
              { href: '/docs/reference/error-codes', label: 'Error Codes', desc: 'API error codes and troubleshooting' },
              { href: '/docs/verify-signatures', label: 'Verifying Signatures', desc: 'Secure your endpoint with HMAC validation' },
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
