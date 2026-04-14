import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Deliveries API - XRNotify Docs',
  description: 'Monitor webhook delivery status, inspect request/response details, retry failed deliveries, and view delivery statistics.',
};

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${colors[method] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      {method}
    </span>
  );
}

export default function DeliveriesApiPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#api" className="text-zinc-500 hover:text-zinc-300 no-underline">API Reference</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Deliveries</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            API Reference
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Deliveries API</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            A delivery represents one attempt to send an event to a webhook endpoint. Use the Deliveries API to monitor delivery status, inspect request and response details, retry failures, and view aggregate statistics.
          </p>
        </div>

        {/* Delivery status flow */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Delivery status flow</h2>
          <p className="text-zinc-400 mb-6 text-sm">Every delivery starts as <code className="font-mono text-zinc-300">pending</code> and transitions based on your endpoint's response.</p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            {[
              { status: 'pending', color: 'bg-zinc-700 text-zinc-300', desc: 'Queued, awaiting delivery' },
              { status: '→', color: '', desc: '' },
              { status: 'delivered', color: 'bg-emerald-500/20 text-emerald-400', desc: 'Your endpoint returned 2xx' },
            ].map(({ status, color, desc }, i) => (
              status === '→'
                ? <span key={i} className="text-zinc-600 text-lg">→</span>
                : (
                  <div key={status} className="text-center">
                    <span className={`inline-block text-xs font-mono font-medium px-3 py-1 rounded-full ${color}`}>{status}</span>
                    {desc && <p className="text-zinc-500 text-xs mt-1 max-w-28">{desc}</p>}
                  </div>
                )
            ))}
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Status</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  {
                    status: 'pending',
                    color: 'bg-zinc-700 text-zinc-300',
                    desc: 'The delivery is queued and will be attempted shortly.',
                  },
                  {
                    status: 'delivered',
                    color: 'bg-emerald-500/20 text-emerald-400',
                    desc: 'Your endpoint responded with a 2xx HTTP status code within the timeout.',
                  },
                  {
                    status: 'retrying',
                    color: 'bg-amber-500/20 text-amber-400',
                    desc: 'A previous attempt failed. XRNotify will retry with exponential backoff (up to 10 retries over 12 hours).',
                  },
                  {
                    status: 'failed',
                    color: 'bg-red-500/20 text-red-400',
                    desc: 'All retry attempts were exhausted. Use the retry endpoint to attempt again manually.',
                  },
                ].map(({ status, color, desc }) => (
                  <tr key={status}>
                    <td className="py-2.5 pr-6">
                      <span className={`inline-block text-xs font-mono font-medium px-2.5 py-0.5 rounded-full ${color}`}>{status}</span>
                    </td>
                    <td className="py-2.5 text-zinc-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* GET /v1/deliveries */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/deliveries</code>
          </div>
          <p className="text-zinc-400 mb-6">List deliveries with optional filters. Results are ordered by creation time, newest first.</p>

          <h3 className="text-base font-semibold text-white mb-3">Query parameters</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Parameter</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { param: 'webhook_id', type: 'string', desc: 'Filter to a specific webhook' },
                  { param: 'event_type', type: 'string', desc: 'Filter by event type (e.g. payment.xrp)' },
                  { param: 'status', type: 'string', desc: 'Filter by status: delivered, pending, retrying, or failed' },
                  { param: 'since', type: 'ISO timestamp', desc: 'Return deliveries created after this time' },
                  { param: 'until', type: 'ISO timestamp', desc: 'Return deliveries created before this time' },
                  { param: 'limit', type: 'integer', desc: 'Results per page. Default 20, max 100' },
                  { param: 'cursor', type: 'string', desc: 'Pagination cursor from a previous response' },
                ].map(({ param, type, desc }) => (
                  <tr key={param}>
                    <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">{param}</code></td>
                    <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">{type}</code></td>
                    <td className="py-2.5 text-zinc-300 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`curl "https://api.xrnotify.io/v1/deliveries?webhook_id=wh_abc&status=failed&since=2024-01-01T00:00:00Z" \\
  -H "X-XRNotify-Key: xrn_live_xxx"`}</pre>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "data": [
    {
      "id": "dlv_xyz789",
      "webhook_id": "wh_abc123",
      "event_id": "xrpl:89547832:A4B2F1:payment.xrp",
      "event_type": "payment.xrp",
      "status": "failed",
      "attempts": 5,
      "last_error": "Connection refused",
      "created_at": "2024-01-15T10:23:45Z",
      "updated_at": "2024-01-15T18:30:00Z"
    }
  ],
  "has_more": false,
  "next_cursor": null
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* GET /v1/deliveries/:id */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/deliveries/<span className="text-zinc-400">:id</span></code>
          </div>
          <p className="text-zinc-400 mb-6">Retrieve full details for a single delivery, including the request body sent, response received, and history of all attempts.</p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "id": "dlv_xyz789",
  "webhook_id": "wh_abc123",
  "event_id": "xrpl:89547832:A4B2F1:payment.xrp",
  "event_type": "payment.xrp",
  "status": "delivered",
  "attempts": 2,
  "response_status": 200,
  "response_time_ms": 143,
  "request_body": "{\"event_type\":\"payment.xrp\",...}",
  "response_body": "OK",
  "last_error": null,
  "created_at": "2024-01-15T10:23:45Z",
  "updated_at": "2024-01-15T10:24:05Z",
  "attempt_history": [
    {
      "attempt": 1,
      "status": "failed",
      "response_status": 500,
      "response_time_ms": 5032,
      "error": "Internal Server Error",
      "attempted_at": "2024-01-15T10:23:46Z"
    },
    {
      "attempt": 2,
      "status": "delivered",
      "response_status": 200,
      "response_time_ms": 143,
      "attempted_at": "2024-01-15T10:24:05Z"
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* POST retry */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="POST" />
            <code className="font-mono text-white text-lg">/v1/deliveries/<span className="text-zinc-400">:id</span>/retry</code>
          </div>
          <p className="text-zinc-400 mb-4">Manually trigger a retry for a failed delivery. The delivery is re-queued as <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">pending</code> and will be attempted shortly.</p>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-6">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Note:</span> Retried deliveries count against your plan's monthly delivery quota. Consider using the <Link href="/docs/api/replay" className="text-emerald-200 hover:text-white underline">Replay API</Link> for bulk re-delivery of missed events.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X POST \\
  https://api.xrnotify.io/v1/deliveries/dlv_xyz789/retry \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "delivery_id": "dlv_xyz789",
  "status": "pending"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* GET stats */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/deliveries/stats</code>
          </div>
          <p className="text-zinc-400 mb-6">Aggregate delivery statistics for your account. Useful for monitoring overall health and building dashboards.</p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Parameter</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">webhook_id</code></td>
                  <td className="py-2.5 text-zinc-300 text-sm">Optional. Scope stats to a specific webhook.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">period</code></td>
                  <td className="py-2.5 text-zinc-300 text-sm">Time window: 1h, 24h, 7d, 30d. Default: 24h.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl "https://api.xrnotify.io/v1/deliveries/stats?period=24h" \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "period": "24h",
  "total": 1284,
  "delivered": 1271,
  "failed": 8,
  "pending": 5,
  "success_rate": 99.0,
  "avg_latency_ms": 187
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API</p>
              <p className="text-zinc-500 text-sm">Manage webhook configurations</p>
            </Link>
            <Link href="/docs/api/events" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Events API</p>
              <p className="text-zinc-500 text-sm">Query the XRPL event log</p>
            </Link>
            <Link href="/docs/api/replay" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Replay API</p>
              <p className="text-zinc-500 text-sm">Re-deliver events in bulk</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
