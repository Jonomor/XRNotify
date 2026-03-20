import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Webhooks API - XRNotify Docs',
  description: 'Full reference for the XRNotify Webhooks API — create, list, update, delete, rotate secrets, and send test events.',
};

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PATCH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${colors[method] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      {method}
    </span>
  );
}

export default function WebhooksApiPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">API Reference</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Webhooks</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            API Reference
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Webhooks API</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Manage your webhook endpoints — create, read, update, delete, rotate signing secrets, and trigger test events.
          </p>
        </div>

        {/* Base URL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-10">
          <p className="text-zinc-500 text-xs mb-1">Base URL</p>
          <code className="font-mono text-zinc-200 text-sm">https://api.xrnotify.io/v1</code>
        </div>

        {/* POST /v1/webhooks */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="POST" />
            <code className="font-mono text-white text-lg">/v1/webhooks</code>
          </div>
          <p className="text-zinc-400 mb-6">Create a new webhook endpoint. Returns the webhook object including the signing secret — this is the only time the secret is shown.</p>

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
                  { field: 'url', type: 'string', req: true, desc: 'HTTPS endpoint to deliver events to' },
                  { field: 'event_types', type: 'string[]', req: true, desc: 'Event types to subscribe to (e.g. ["payment.xrp"])' },
                  { field: 'description', type: 'string', req: false, desc: 'Human-readable label for your own reference' },
                  { field: 'account_filters', type: 'string[]', req: false, desc: 'Restrict to specific XRPL account addresses. Empty = all accounts' },
                  { field: 'is_active', type: 'boolean', req: false, desc: 'Whether to start delivering immediately. Default: true' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto h-full">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/xrpl",
    "event_types": ["payment.xrp"],
    "description": "Main handler"
  }'`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">201 Created</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "id": "wh_abc123",
  "url": "https://yourapp.com/webhooks/xrpl",
  "description": "Main handler",
  "event_types": ["payment.xrp"],
  "account_filters": [],
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "secret": "whsec_xxxxxxxxxxxxxxxx"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* GET /v1/webhooks */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/webhooks</code>
          </div>
          <p className="text-zinc-400 mb-6">List all webhooks for your account. Results are paginated using cursor-based pagination.</p>

          <h3 className="text-base font-semibold text-white mb-3">Query parameters</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Parameter</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Default</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">limit</code></td>
                  <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">20</code></td>
                  <td className="py-2.5 text-zinc-300 text-sm">Results per page. Max 100.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">cursor</code></td>
                  <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">—</code></td>
                  <td className="py-2.5 text-zinc-300 text-sm">Pagination cursor from a previous response's <code className="font-mono text-zinc-400">next_cursor</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl "https://api.xrnotify.io/v1/webhooks?limit=10" \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "data": [
    {
      "id": "wh_abc123",
      "url": "https://yourapp.com/...",
      "event_types": ["payment.xrp"],
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "has_more": false,
  "next_cursor": null
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* GET /v1/webhooks/:id */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="GET" />
            <code className="font-mono text-white text-lg">/v1/webhooks/<span className="text-zinc-400">:id</span></code>
          </div>
          <p className="text-zinc-400 mb-6">Retrieve a single webhook by ID. The response does not include the signing secret.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl https://api.xrnotify.io/v1/webhooks/wh_abc123 \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "id": "wh_abc123",
  "url": "https://yourapp.com/webhooks/xrpl",
  "description": "Main handler",
  "event_types": ["payment.xrp"],
  "account_filters": [],
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* PATCH /v1/webhooks/:id */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="PATCH" />
            <code className="font-mono text-white text-lg">/v1/webhooks/<span className="text-zinc-400">:id</span></code>
          </div>
          <p className="text-zinc-400 mb-4">Update a webhook. Send only the fields you want to change — all others remain unchanged.</p>
          <p className="text-zinc-400 mb-6 text-sm">Updatable fields: <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">url</code>, <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">event_types</code>, <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">account_filters</code>, <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">description</code>, <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">is_active</code></p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X PATCH https://api.xrnotify.io/v1/webhooks/wh_abc123 \\
  -H "X-XRNotify-Key: xrn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_types": ["payment.xrp", "nft.minted"],
    "is_active": true
  }'`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "id": "wh_abc123",
  "url": "https://yourapp.com/webhooks/xrpl",
  "event_types": ["payment.xrp", "nft.minted"],
  "is_active": true,
  "updated_at": "2024-01-15T11:00:00Z"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* DELETE /v1/webhooks/:id */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="DELETE" />
            <code className="font-mono text-white text-lg">/v1/webhooks/<span className="text-zinc-400">:id</span></code>
          </div>
          <p className="text-zinc-400 mb-6">Permanently delete a webhook. All pending deliveries are cancelled. This action cannot be undone.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X DELETE https://api.xrnotify.io/v1/webhooks/wh_abc123 \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`204 No Content`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* POST rotate-secret */}
        <section className="mb-12 border-b border-zinc-800/50 pb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="POST" />
            <code className="font-mono text-white text-lg">/v1/webhooks/<span className="text-zinc-400">:id</span>/rotate-secret</code>
          </div>
          <p className="text-zinc-400 mb-4">Generate a new signing secret for the webhook. The new secret is returned once in the response and the old secret is immediately invalidated.</p>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Warning:</span> The old secret is invalidated immediately upon rotation. Update your <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">WEBHOOK_SECRET</code> environment variable and redeploy your application before rotating in production to avoid verification failures.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X POST \\
  https://api.xrnotify.io/v1/webhooks/wh_abc123/rotate-secret \\
  -H "X-XRNotify-Key: xrn_live_..."`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "secret": "whsec_new_secret_shown_once"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* POST test */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method="POST" />
            <code className="font-mono text-white text-lg">/v1/webhooks/<span className="text-zinc-400">:id</span>/test</code>
          </div>
          <p className="text-zinc-400 mb-4">Send a synthetic test event to the webhook endpoint. Useful for verifying your signature verification code and endpoint reachability without waiting for a real XRPL event.</p>

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
              <tbody>
                <tr>
                  <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">event_type</code></td>
                  <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">string</code></td>
                  <td className="py-2.5 pr-4"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">Optional</span></td>
                  <td className="py-2.5 text-zinc-300 text-sm">Event type to simulate. Defaults to the first event type on the webhook.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-2">Request</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`curl -X POST \\
  https://api.xrnotify.io/v1/webhooks/wh_abc123/test \\
  -H "X-XRNotify-Key: xrn_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"event_type": "payment.xrp"}'`}</pre>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Response <span className="text-emerald-500">200 OK</span></p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre">{`{
  "delivery_id": "dlv_test_xyz789",
  "status": "delivered",
  "response_status": 200
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/api/deliveries" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Deliveries API</p>
              <p className="text-zinc-500 text-sm">Monitor and retry event deliveries</p>
            </Link>
            <Link href="/docs/verify-signatures" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Verify Signatures</p>
              <p className="text-zinc-500 text-sm">Secure your webhook endpoint</p>
            </Link>
            <Link href="/docs/api/replay" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Replay API</p>
              <p className="text-zinc-500 text-sm">Re-deliver past events</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
