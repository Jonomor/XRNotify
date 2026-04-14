import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Retry Policy: XRNotify Docs',
  description:
    'Full retry schedule, failure conditions, jitter formula, auto-disable behavior, and manual recovery options for XRNotify webhook deliveries.',
};

export default function RetryPolicyPage() {
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
            <span className="text-zinc-300">Retry Policy</span>
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
            Reference
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">Retry Policy</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            XRNotify guarantees at-least-once delivery. If your endpoint does not return a
            2xx status within 10 seconds, the delivery is retried automatically on an
            exponential backoff schedule.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-3">
            Every event detected on the XRPL is delivered to your webhook endpoint at least
            once. In practice, the vast majority of deliveries succeed on the first attempt.
            The retry mechanism exists to handle transient failures: network blips, brief
            endpoint unavailability, or accidental non-2xx responses.
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Because retries are a normal part of the delivery guarantee, your webhook handler
            must be idempotent. Use the{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">X-XRNotify-Delivery-Id</code> header or the deterministic{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">event_id</code> field to detect and safely skip duplicate deliveries.
          </p>
        </section>

        {/* Retry schedule */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Retry schedule</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Attempt</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Delay after previous</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Cumulative elapsed</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['1', 'Immediate', '0s', 'Initial delivery'],
                  ['2', '1 minute', '~1m', 'First retry'],
                  ['3', '5 minutes', '~6m', ''],
                  ['4', '30 minutes', '~36m', ''],
                  ['5', '2 hours', '~2.6h', ''],
                  ['6', '6 hours', '~8.6h', ''],
                  ['7', '12 hours', '~20.6h', ''],
                  ['8', '24 hours', '~44.6h', 'Final attempt'],
                ].map(([attempt, delay, elapsed, notes]) => (
                  <tr key={attempt}>
                    <td className="py-2.5 pr-6 text-zinc-300">{attempt}</td>
                    <td className="py-2.5 pr-6 text-zinc-300">{delay}</td>
                    <td className="py-2.5 pr-6 text-zinc-300">{elapsed}</td>
                    <td className="py-2.5 text-zinc-500 text-xs">{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            After 8 failed attempts, the delivery moves to{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">dead</code> status. No further automatic retries occur. You
            can still trigger a manual retry at any time.
          </p>
        </section>

        {/* What counts as failure */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">What counts as a failure</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            A delivery attempt is marked as failed if any of the following occur:
          </p>
          <ul className="space-y-2 text-zinc-300 text-sm">
            {[
              'HTTP status 3xx, 4xx, or 5xx returned by your endpoint',
              'No response received within 10 seconds (connection timeout)',
              'SSL/TLS handshake failure or expired certificate',
              'DNS resolution failure for your endpoint\'s hostname',
              'Connection refused (e.g., server is down or port not open)',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-red-400 shrink-0 mt-0.5">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 text-zinc-300 text-sm">
            <p className="text-zinc-400 text-xs">A delivery is considered <strong className="text-emerald-400">successful</strong> if:</p>
            {[
              'HTTP status 200–299 returned within 10 seconds',
            ].map((item) => (
              <div key={item} className="flex gap-3">
                <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Jitter */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Jitter</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Each retry delay has ±10% random jitter applied. This prevents a thundering herd
            scenario where many deliveries that failed simultaneously all retry at exactly the
            same time, which could overwhelm your endpoint.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`# Backoff formula with jitter:
delay(attempt) = base_delay[attempt] × (1 + random(-0.1, 0.1))

# Example - attempt 3 base delay = 5 minutes:
# Actual delay will be between 4m30s and 5m30s`}
            </pre>
          </div>
        </section>

        {/* Auto-disable behavior */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Auto-disable behavior</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Each webhook tracks a{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">consecutive_failures</code> counter. This counter increments each
            time a delivery reaches the final failed state (after all 8 attempts), and
            resets to zero on any successful delivery.
          </p>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            If <code className="text-emerald-400 bg-zinc-800 px-1 rounded">consecutive_failures</code> reaches 100, XRNotify automatically sets the
            webhook status to <code className="text-emerald-400 bg-zinc-800 px-1 rounded">disabled</code> and sends an email notification to your
            account&apos;s registered email address.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-zinc-300 mb-4">
            <strong className="text-amber-300">Auto-disable:</strong> A disabled webhook stops
            receiving new events. No events are queued during the disabled period. Use the
            Replay API to recover missed events after re-enabling.
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Re-enable a disabled webhook via the dashboard or the API:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mt-3">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X PATCH https://api.xrnotify.io/v1/webhooks/wh_abc123 \\
  -H "X-XRNotify-Key: xrn_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "active" }'`}
            </pre>
          </div>
        </section>

        {/* Delivery status values */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Delivery status values</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Status</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['pending', 'Queued for initial delivery or awaiting a scheduled retry.'],
                  ['delivering', 'Currently being sent to your endpoint.'],
                  ['succeeded', 'Your endpoint returned a 2xx status within the timeout.'],
                  ['failed', 'All retry attempts have been exhausted. Manual action required.'],
                  ['dead', 'Alias for failed. Delivery will not be retried automatically.'],
                ].map(([status, desc]) => (
                  <tr key={status}>
                    <td className="py-2.5 pr-6">
                      <code className="text-emerald-400 text-xs">{status}</code>
                    </td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manual retry */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Manual retry</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Even after a delivery reaches <code className="text-emerald-400 bg-zinc-800 px-1 rounded">failed</code> status, you can trigger an
            immediate re-attempt:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X POST https://api.xrnotify.io/v1/deliveries/dlv_abc123/retry \\
  -H "X-XRNotify-Key: xrn_live_xxx"`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The response includes the delivery object with the updated{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">status</code>,{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">response_code</code>, and{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">last_error</code> fields after the attempt completes.
          </p>
        </section>

        {/* Bulk recovery with Replay */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Bulk recovery with Replay</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            For large-scale recovery, such as when your endpoint was down for several hours
            and hundreds of deliveries failed, use the Replay API to re-deliver all events
            matching a time window in one request, rather than retrying them individually.
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
      "until": "2024-01-15T12:00:00Z"
    }
  }'`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The Replay API re-delivers events as new deliveries with fresh{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">X-XRNotify-Delivery-Id</code> values. Because the{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">event_id</code> in the body is deterministic and unchanged, you can use it
            as a stable idempotency key. See the{' '}
            <Link href="/docs/api/replay" className="text-emerald-400 hover:text-emerald-300">
              Replay API reference
            </Link>{' '}
            for the full filter options.
          </p>
        </section>

        {/* Idempotency reminder */}
        <section className="mb-10">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-zinc-300 mb-4">
            <strong className="text-amber-300">Idempotency is required.</strong> Because
            XRNotify retries deliveries, your endpoint may receive the same event more than
            once. Always implement idempotency using the{' '}
            <code className="text-emerald-400">X-XRNotify-Delivery-Id</code> header or the{' '}
            <code className="text-emerald-400">event_id</code> body field to detect and safely
            skip duplicate processing.
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            <strong className="text-white">Secret rotation note:</strong> Events are retried
            against your webhook&apos;s current configuration. If you rotate your webhook secret
            between the original delivery and a retry, the retry will be signed with the
            new secret, not the original one. Ensure your signature verification uses the
            current secret stored in your environment.
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/guides/handling-failures', label: 'Handling Failures Guide', desc: 'Practical patterns for resilient webhook handlers' },
              { href: '/docs/api/replay', label: 'Replay API Reference', desc: 'Full spec for bulk event recovery' },
              { href: '/docs/api/deliveries', label: 'Deliveries API', desc: 'Query, filter, and inspect delivery logs' },
              { href: '/docs/reference/error-codes', label: 'Error Codes', desc: 'API error format and code reference' },
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
