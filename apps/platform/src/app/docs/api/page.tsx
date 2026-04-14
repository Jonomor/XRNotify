import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Reference - XRNotify Docs',
  description: 'Complete REST API reference for XRNotify. Webhooks, deliveries, events, replay, and authentication.',
};

const endpoints = [
  {
    title: 'Authentication',
    href: '/docs/api/authentication',
    description: 'API keys, key types, scopes, rate limits, and error responses.',
    badge: 'X-XRNotify-Key',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    methods: [],
  },
  {
    title: 'Webhooks',
    href: '/docs/api/webhooks',
    description: 'Create, list, update, delete, and test webhook endpoints. Rotate secrets.',
    badge: '7 endpoints',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    methods: ['POST', 'GET', 'PATCH', 'DELETE'],
  },
  {
    title: 'Deliveries',
    href: '/docs/api/deliveries',
    description: 'Query delivery history, inspect request/response data, retry failed deliveries, view stats.',
    badge: '4 endpoints',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    methods: ['GET', 'POST'],
  },
  {
    title: 'Events',
    href: '/docs/api/events',
    description: 'Browse normalized XRPL events. Filter by type, account, ledger range, or time window.',
    badge: '2 endpoints',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    methods: ['GET'],
  },
  {
    title: 'Replay',
    href: '/docs/api/replay',
    description: 'Re-deliver past events to a webhook. Create, monitor, and cancel replay jobs.',
    badge: '3 endpoints',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    methods: ['POST', 'GET', 'DELETE'],
  },
];

const methodColors: Record<string, string> = {
  POST: 'text-emerald-400 bg-emerald-500/15',
  GET: 'text-blue-400 bg-blue-500/15',
  PATCH: 'text-amber-400 bg-amber-500/15',
  DELETE: 'text-red-400 bg-red-500/15',
};

const quickRef = [
  { method: 'POST', path: '/v1/webhooks', desc: 'Create a webhook' },
  { method: 'GET', path: '/v1/webhooks', desc: 'List webhooks' },
  { method: 'PATCH', path: '/v1/webhooks/:id', desc: 'Update a webhook' },
  { method: 'DELETE', path: '/v1/webhooks/:id', desc: 'Delete a webhook' },
  { method: 'POST', path: '/v1/webhooks/:id/test', desc: 'Send a test event' },
  { method: 'POST', path: '/v1/webhooks/:id/rotate-secret', desc: 'Rotate webhook secret' },
  { method: 'GET', path: '/v1/deliveries', desc: 'List deliveries' },
  { method: 'GET', path: '/v1/deliveries/:id', desc: 'Get delivery detail' },
  { method: 'POST', path: '/v1/deliveries/:id/retry', desc: 'Retry a delivery' },
  { method: 'GET', path: '/v1/deliveries/stats', desc: 'Delivery statistics' },
  { method: 'GET', path: '/v1/events', desc: 'List events' },
  { method: 'GET', path: '/v1/events/:event_id', desc: 'Get an event' },
  { method: 'POST', path: '/v1/replay', desc: 'Create replay job' },
  { method: 'GET', path: '/v1/replay/:job_id', desc: 'Get replay status' },
  { method: 'DELETE', path: '/v1/replay/:job_id', desc: 'Cancel replay job' },
];

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline transition-colors">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">API Reference</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            API Reference
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">REST API</h1>
          <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
            The XRNotify API is organized around REST. All requests use the base URL{' '}
            <code className="text-emerald-400 text-base bg-zinc-900 px-1.5 py-0.5 rounded">https://api.xrnotify.io</code>{' '}
            and return JSON.
          </p>
        </div>

        {/* Auth callout */}
        <div className="mb-10 p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 mb-1">Authentication</p>
            <p className="text-sm text-zinc-400">
              All requests require your API key in the{' '}
              <code className="text-emerald-400 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">X-XRNotify-Key</code>{' '}
              header.
            </p>
            <pre className="mt-3 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3 overflow-x-auto">
              <code>{`curl https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_your_key_here"`}</code>
            </pre>
          </div>
          <Link
            href="/docs/api/authentication"
            className="shrink-0 text-sm text-emerald-400 hover:text-emerald-300 no-underline transition-colors whitespace-nowrap"
          >
            Auth docs →
          </Link>
        </div>

        {/* Resource cards */}
        <div className="mb-12 space-y-3">
          <h2 className="text-lg font-semibold text-white mb-4">Resources</h2>
          {endpoints.map((ep) => (
            <Link
              key={ep.href}
              href={ep.href}
              className="group block no-underline p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1.5">
                    <span className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {ep.title}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${ep.badgeColor}`}>
                      {ep.badge}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{ep.description}</p>
                  {ep.methods.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {ep.methods.map((m) => (
                        <span
                          key={m}
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${methodColors[m] ?? ''}`}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors text-lg">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick reference table */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">All Endpoints</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-4 py-3 w-20">Method</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-4 py-3">Path</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {quickRef.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${methodColors[row.method] ?? ''}`}>
                        {row.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs text-zinc-300 font-mono">{row.path}</code>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className="text-xs text-zinc-500">{row.desc}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-zinc-800/50 flex flex-col sm:flex-row gap-4 sm:gap-8">
          <Link href="/docs/quickstart" className="text-sm text-zinc-400 hover:text-white no-underline transition-colors">
            ← Quick Start Guide
          </Link>
          <Link href="/docs/api/authentication" className="text-sm text-emerald-400 hover:text-emerald-300 no-underline transition-colors">
            Authentication →
          </Link>
        </div>
      </main>
    </div>
  );
}
