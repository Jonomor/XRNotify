import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Replay API - XRNotify Docs',
  description: 'Re-deliver past XRPL events to your webhook using the XRNotify Replay API. Recover from downtime, backfill data, or test with historical events.',
};

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${colors[method] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      {method}
    </span>
  );
}

export default function ReplayApiPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#api" className="text-zinc-500 hover:text-zinc-300 no-underline">API Reference</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Replay</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            API Reference
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Replay API</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            The Replay API lets you re-deliver past XRPL events to a webhook endpoint. Use it to recover from downtime, backfill a new data store, or test your event handling code against real historical data.
          </p>
        </div>

        {/* Use cases */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Common use cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                icon: '⬇',
                title: 'Recover from downtime',
                desc: 'Your endpoint was unreachable for a period. Replay missed events to catch up without gaps in your data.',
              },
              {
                icon: '🔬',
                title: 'Test event handling',
                desc: "Re-deliver specific historical events to test how your code handles edge cases or new logic you've added.",
              },
              {
                icon: '📦',
                title: 'Backfill new data stores',
                desc: 'Added a new webhook or database? Replay past events to populate it without needing direct XRPL access.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-white font-medium mb-2">{title}</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Quota usage:</span> Replay events count against your plan's monthly delivery quota. Large filter-based replays may generate thousands of deliveries. Large replay jobs may take several minutes to complete.
            </p>
          </div>
        </section>

        {/* Plan availability */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Plan availability</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Feature</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Free</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Starter</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Pro</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  {
                    feature: 'Replay by event_ids',
                    free: '✓',
                    starter: '✓',
                    pro: '✓',
                    ent: '✓',
                  },
                  {
                    feature: 'Replay with filters (date range, type)',
                    free: '✗',
                    starter: '✗',
                    pro: '✓',
                    ent: '✓',
                  },
                  {
                    feature: 'Concurrent replay jobs',
                    free: '1',
                    starter: '2',
                    pro: '5',
                    ent: 'Custom',
                  },
                ].map(({ feature, free, starter, pro, ent }) => (
                  <tr key={feature}>
                    <td className="py-2.5 pr-6 text-zinc-300">{feature}</td>
                    {[free, starter, pro, ent].map((val, i) => (
                      <td key={i} className={`py-2.5 pr-6 font-mono text-sm ${val === '✓' ? 'text-emerald-400' : val === '✗' ? 'text-zinc-600' : 'text-zinc-300'}`}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              All plans can replay specific events by providing <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">event_ids</code>. Filter-based replay (by date range, event type, or account) requires <span className="font-semibold">Pro or Enterprise</span>.
            </p>
          </div>
        </section>

        {/* POST /v1/replay */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="POST" />
            <code className="font-mono text-white text-lg">/v1/replay</code>
          </div>
          <p className="text-zinc-400 mb-6">
            Create a new replay job. You can specify exact event IDs to replay, or use filters to select events by type, account, or time range. The two modes are mutually exclusive.
          </p>

          <h3 className="text-base font-semibold text-white mb-3">Request body</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Field</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Required</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { field: 'webhook_id', type: 'string', req: true, desc: 'The webhook to deliver replay events to' },
                  { field: 'event_ids', type: 'string[]', req: false, desc: 'Specific event IDs to replay. Use this OR filters.' },
                  { field: 'filters', type: 'object', req: false, desc: 'Filter-based selection (Pro+ only). Use this OR event_ids.' },
                  { field: 'filters.event_types', type: 'string[]', req: false, desc: 'Only replay events of these types' },
                  { field: 'filters.since', type: 'ISO timestamp', req: false, desc: 'Replay events created after this time' },
                  { field: 'filters.until', type: 'ISO timestamp', req: false, desc: 'Replay events created before this time' },
                  { field: 'filters.accounts', type: 'string[]', req: false, desc: 'Only replay events involving these XRPL accounts' },
                ].map(({ field, type, req, desc }) => (
                  <tr key={field}>
                    <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">{field}</code></td>
                    <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">{type}</code></td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${req ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                        {req ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-300 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request — replay by event IDs (all plans)</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto h-full">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/replay \\
  -H "X-XRNotify-Key: xrn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_id": "wh_abc123",
    "event_ids": [
      "xrpl:89547832:A4B2F1:payment.xrp",
      "xrpl:89547900:C3D5E2:nft.minted:0"
    ]
  }'`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request — replay with filters (Pro+)</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto h-full">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/replay \\
  -H "X-XRNotify-Key: xrn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_id": "wh_abc123",
    "filters": {
      "event_types": ["payment.xrp"],
      "since": "2024-01-01T00:00:00Z",
      "until": "2024-01-02T00:00:00Z",
      "accounts": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"]
    }
  }'`}</pre>
              </div>
            </div>
          </div>

          <div>
            <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">202 Accepted</span></p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "job_id": "rpl_job_xyz123",
  "status": "queued",
  "webhook_id": "wh_abc123",
  "estimated_events": 150,
  "created_at": "2024-01-15T12:00:00Z"
}`}</pre>
            </div>
          </div>
        </section>

        {/* GET /v1/replay/:job_id */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/replay/<span className="text-zinc-400">:job_id</span></code>
          </div>
          <p className="text-zinc-400 mb-6">Check the status and progress of a replay job. Poll this endpoint to track completion.</p>

          <h3 className="text-base font-semibold text-white mb-3">Job statuses</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Status</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { status: 'queued', color: 'bg-zinc-700 text-zinc-300', desc: 'Job has been created and is waiting to start' },
                  { status: 'running', color: 'bg-blue-500/20 text-blue-400', desc: 'Replay is in progress — events are being re-delivered' },
                  { status: 'completed', color: 'bg-emerald-500/20 text-emerald-400', desc: 'All events have been queued for delivery' },
                  { status: 'cancelled', color: 'bg-zinc-600 text-zinc-400', desc: 'Job was cancelled via the DELETE endpoint before completion' },
                  { status: 'failed', color: 'bg-red-500/20 text-red-400', desc: 'Job encountered an unrecoverable error. Contact support.' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl https://api.xrnotify.io/v1/replay/rpl_job_xyz123 \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "job_id": "rpl_job_xyz123",
  "status": "running",
  "webhook_id": "wh_abc123",
  "total_events": 150,
  "processed_events": 87,
  "failed_events": 2,
  "created_at": "2024-01-15T12:00:00Z",
  "completed_at": null
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* DELETE /v1/replay/:job_id */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="DELETE" />
            <code className="font-mono text-white text-lg">/v1/replay/<span className="text-zinc-400">:job_id</span></code>
          </div>
          <p className="text-zinc-400 mb-4">Cancel a replay job. Only jobs with status <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">queued</code> or <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">running</code> can be cancelled. Events that have already been queued for delivery before cancellation may still be delivered.</p>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Note:</span> Cancelling a replay job stops future event processing, but deliveries that are already in-flight will not be recalled. Check the <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">processed_events</code> count to understand how many events were sent before cancellation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X DELETE \\
  https://api.xrnotify.io/v1/replay/rpl_job_xyz123 \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "job_id": "rpl_job_xyz123",
  "status": "cancelled",
  "processed_events": 87,
  "cancelled_at": "2024-01-15T12:03:42Z"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/api/events" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Events API</p>
              <p className="text-zinc-500 text-sm">Query the event log to find IDs to replay</p>
            </Link>
            <Link href="/docs/api/deliveries" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Deliveries API</p>
              <p className="text-zinc-500 text-sm">Track delivery status of replayed events</p>
            </Link>
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API</p>
              <p className="text-zinc-500 text-sm">Manage the endpoints events are delivered to</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
