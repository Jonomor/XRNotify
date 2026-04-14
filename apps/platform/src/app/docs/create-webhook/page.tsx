import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Create Your First Webhook - XRNotify Docs',
  description: 'Learn how to create a webhook via the dashboard or API, configure event types, add account filters, and test with local tools.',
};

export default function CreateWebhookPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">Getting Started</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Create Your First Webhook</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Getting Started
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Create Your First Webhook</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Webhooks are HTTPS endpoints in your application that XRNotify delivers XRPL events to. You can create them through the dashboard UI or the REST API.
          </p>
        </div>

        {/* Method 1: Dashboard */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-2">Method 1: Dashboard</h2>
          <p className="text-zinc-400 mb-6 text-sm">The fastest way to get started, with no code required.</p>
          <ol className="space-y-4">
            {[
              {
                step: '1',
                title: 'Navigate to Webhooks',
                desc: 'Open your Dashboard and go to Webhooks → New Webhook.',
              },
              {
                step: '2',
                title: 'Enter your endpoint URL',
                desc: 'Provide the full HTTPS URL that XRNotify should POST events to. Must be publicly reachable (see URL requirements below).',
              },
              {
                step: '3',
                title: 'Select event types',
                desc: 'Choose which XRPL event types you want to receive. You can always update this later.',
              },
              {
                step: '4',
                title: 'Add account filters (optional)',
                desc: 'Optionally restrict delivery to specific XRPL wallet addresses (r-addresses). Leave empty to receive events for all accounts.',
              },
              {
                step: '5',
                title: 'Click Create',
                desc: 'Your webhook is created and the signing secret is shown once. Copy it immediately. It cannot be retrieved after you leave this page.',
              },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-mono text-xs shrink-0 mt-0.5">{step}</div>
                <div>
                  <p className="text-white font-medium mb-1">{title}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Method 2: API */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-2">Method 2: API</h2>
          <p className="text-zinc-400 mb-4 text-sm">Create webhooks programmatically. Useful for automated deployments or multi-tenant applications.</p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-6">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/xrpl",
    "description": "Production payment handler",
    "event_types": ["payment.xrp", "payment.issued"],
    "account_filters": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"]
  }'`}</pre>
          </div>

          {/* Parameters table */}
          <h3 className="text-lg font-semibold text-white mb-3">Request body parameters</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Parameter</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Required</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { param: 'url', type: 'string', required: 'Yes', desc: 'HTTPS URL to deliver events to' },
                  { param: 'event_types', type: 'string[]', required: 'Yes', desc: 'Array of event type strings (e.g. ["payment.xrp"])' },
                  { param: 'description', type: 'string', required: 'No', desc: 'Human-readable label for your own reference' },
                  { param: 'account_filters', type: 'string[]', required: 'No', desc: 'Limit delivery to specific XRPL accounts. Empty array = all accounts' },
                  { param: 'is_active', type: 'boolean', required: 'No', desc: 'Whether the webhook is active. Defaults to true' },
                ].map(({ param, type, required, desc }) => (
                  <tr key={param}>
                    <td className="py-2.5 pr-4"><code className="font-mono text-emerald-400 text-xs">{param}</code></td>
                    <td className="py-2.5 pr-4"><code className="font-mono text-zinc-400 text-xs">{type}</code></td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${required === 'Yes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                        {required}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* URL Requirements */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">URL requirements</h2>
          <p className="text-zinc-400 mb-4 text-sm">XRNotify enforces strict requirements on webhook URLs to ensure reliable delivery and security.</p>
          <div className="space-y-2 mb-6">
            {[
              { ok: true, url: 'https://api.yourapp.com/webhooks', note: 'Valid HTTPS public endpoint' },
              { ok: true, url: 'https://yourapp.ngrok.io/xrpl', note: 'Valid HTTPS tunnel URL' },
              { ok: false, url: 'http://yourapp.com/webhook', note: 'Not HTTPS. Must use TLS' },
              { ok: false, url: 'https://localhost:3000/webhook', note: 'Localhost not reachable from XRNotify servers' },
              { ok: false, url: 'http://192.168.1.1/hook', note: 'Private IP addresses are blocked' },
            ].map(({ ok, url, note }) => (
              <div key={url} className="flex items-start gap-3">
                <span className={`text-sm mt-0.5 shrink-0 ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? '✓' : '✗'}</span>
                <div>
                  <code className="font-mono text-sm text-zinc-200">{url}</code>
                  <span className="text-zinc-500 text-sm ml-2">- {note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Local testing */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-2">Local testing tools</h2>
          <p className="text-zinc-400 mb-4 text-sm">
            Since XRNotify requires a publicly reachable HTTPS URL, you need a tunnel to test locally. Here are two popular options:
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">ngrok</p>
                <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs">ngrok.com →</a>
              </div>
              <div className="bg-black/40 rounded p-3 overflow-x-auto mb-2">
                <code className="font-mono text-sm text-zinc-300">ngrok http 3000</code>
              </div>
              <p className="text-zinc-500 text-xs">Copy the <code className="font-mono text-zinc-400">https://</code> forwarding URL and use it as your webhook URL.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">Cloudflare Tunnel</p>
                <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/run-tunnel/trycloudflare/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs">cloudflare.com →</a>
              </div>
              <div className="bg-black/40 rounded p-3 overflow-x-auto mb-2">
                <code className="font-mono text-sm text-zinc-300">cloudflare tunnel --url http://localhost:3000</code>
              </div>
              <p className="text-zinc-500 text-xs">No account required for quick testing with <code className="font-mono text-zinc-400">trycloudflare</code>.</p>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Pro tip:</span> Use the <Link href="/docs/api/webhooks" className="text-emerald-200 hover:text-white underline">test endpoint</Link> (<code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">POST /v1/webhooks/:id/test</code>) to immediately send a synthetic event to your webhook without waiting for real XRPL activity.
            </p>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/docs/verify-signatures" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Verify Signatures</p>
              <p className="text-zinc-500 text-sm">Secure your endpoint against spoofed requests</p>
            </Link>
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API Reference</p>
              <p className="text-zinc-500 text-sm">Full documentation for all webhook endpoints</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
