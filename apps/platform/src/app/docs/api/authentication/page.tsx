import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication - XRNotify Docs',
  description: 'Learn how to authenticate API requests with XRNotify API keys, manage scopes, and understand rate limits.',
};

export default function AuthenticationPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#api" className="text-zinc-500 hover:text-zinc-300 no-underline">API Reference</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Authentication</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            API Reference
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Authentication</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            All XRNotify API requests must be authenticated using an API key passed in the <code className="font-mono text-zinc-200 bg-zinc-800 px-1.5 py-0.5 rounded text-base">X-XRNotify-Key</code> request header.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Making an authenticated request</h2>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            Include your API key in every request using the <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">X-XRNotify-Key</code> header. The key is passed as a plain string — no encoding or prefix is required.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`curl https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_your_key_here"`}</pre>
          </div>
          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Node.js</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`const response = await fetch("https://api.xrnotify.io/v1/webhooks", {
  headers: {
    "X-XRNotify-Key": process.env.XRNOTIFY_API_KEY,
  },
});
const data = await response.json();`}</pre>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Python</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import os, requests

response = requests.get(
    "https://api.xrnotify.io/v1/webhooks",
    headers={"X-XRNotify-Key": os.environ["XRNOTIFY_API_KEY"]},
)
data = response.json()`}</pre>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Keep keys secret:</span> Never expose API keys in client-side code, public repositories, or logs. Treat them like passwords. If a key is compromised, revoke it immediately from the dashboard.
            </p>
          </div>
        </section>

        {/* Security best practices */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Security best practices</h2>
          <ul className="space-y-3 text-zinc-300 text-sm leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#x2713;</span>
              Store API keys in environment variables or a secrets manager — never hard-code them.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#x2713;</span>
              Use the principle of least privilege — only grant the scopes each key actually needs.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#x2713;</span>
              Set expiration dates on keys used in CI/CD pipelines or temporary environments.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#x2713;</span>
              Rotate keys periodically and revoke any key that may have been exposed.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#x2713;</span>
              Use separate keys for production and development — never share keys across environments.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">&#x2713;</span>
              Monitor the &quot;Last Used&quot; timestamp on the API Keys dashboard to detect unauthorized usage.
            </li>
          </ul>
        </section>

        {/* Key types */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">API key types</h2>
          <p className="text-zinc-300 mb-4">
            XRNotify provides two key types. The prefix tells you which environment the key belongs to.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Prefix</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Environment</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Use for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 pr-6"><code className="font-mono text-emerald-400 text-xs">xrn_live_</code></td>
                  <td className="py-2.5 pr-6"><span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">Production</span></td>
                  <td className="py-2.5 text-zinc-300">Real XRPL mainnet events, live webhook deliveries</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6"><code className="font-mono text-amber-400 text-xs">xrn_test_</code></td>
                  <td className="py-2.5 pr-6"><span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">Test</span></td>
                  <td className="py-2.5 text-zinc-300">Safe testing environment. No real events or charges.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              Use test keys (<code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">xrn_test_...</code>) during development and CI. They behave identically to live keys for all API operations but only deliver synthetic test events.
            </p>
          </div>
        </section>

        {/* Creating keys */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Creating API keys</h2>

          <h3 className="text-lg font-semibold text-white mb-2">Via dashboard</h3>
          <p className="text-zinc-300 mb-4 text-sm">
            Navigate to <span className="text-white">Settings → API Keys → Create Key</span>. Give it a name, select the scopes you need, and optionally set an expiration date. The key is shown once on creation — copy it before closing the dialog.
          </p>

          <h3 className="text-lg font-semibold text-white mb-2">Via API</h3>
          <p className="text-zinc-300 mb-3 text-sm">
            You can create keys programmatically using an existing admin-scoped key:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-6">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`curl -X POST https://api.xrnotify.io/v1/api-keys \\
  -H "X-XRNotify-Key: xrn_live_admin_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Bot",
    "scopes": ["webhooks:read", "webhooks:write"],
    "expires_at": "2025-12-31T23:59:59Z"
  }'`}</pre>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Available scopes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { scope: 'webhooks:read', desc: 'List and retrieve webhook configurations' },
              { scope: 'webhooks:write', desc: 'Create, update, delete, and rotate webhook secrets' },
              { scope: 'deliveries:read', desc: 'View delivery history and details' },
              { scope: 'deliveries:write', desc: 'Retry failed deliveries' },
              { scope: 'events:read', desc: 'Query the event log' },
              { scope: 'api_keys:read', desc: 'List API keys' },
              { scope: 'api_keys:write', desc: 'Create and revoke API keys' },
              { scope: 'admin', desc: 'Full access to all endpoints and resources' },
            ].map(({ scope, desc }) => (
              <div key={scope} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <code className="font-mono text-emerald-400 text-xs mt-0.5 shrink-0">{scope}</code>
                <p className="text-zinc-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rate limits */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Rate limits</h2>
          <p className="text-zinc-300 mb-4 text-sm">
            Rate limits are applied per API key. Limits vary by plan:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Plan</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Requests / min</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Requests / day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { plan: 'Free', perMin: '60', perDay: '1,000' },
                  { plan: 'Starter', perMin: '300', perDay: '10,000' },
                  { plan: 'Pro', perMin: '1,000', perDay: '100,000' },
                  { plan: 'Enterprise', perMin: 'Custom', perDay: 'Custom' },
                ].map(({ plan, perMin, perDay }) => (
                  <tr key={plan}>
                    <td className="py-2.5 pr-6 text-white font-medium">{plan}</td>
                    <td className="py-2.5 pr-6 text-zinc-300 font-mono">{perMin}</td>
                    <td className="py-2.5 text-zinc-300 font-mono">{perDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">Rate limit headers</h3>
          <p className="text-zinc-400 mb-3 text-sm">Every API response includes these headers so you can track usage:</p>
          <div className="space-y-2 mb-4">
            {[
              { header: 'X-RateLimit-Limit', desc: 'Maximum requests allowed in the current window' },
              { header: 'X-RateLimit-Remaining', desc: 'Number of requests remaining in the current window' },
              { header: 'X-RateLimit-Reset', desc: 'Unix timestamp when the rate limit window resets' },
            ].map(({ header, desc }) => (
              <div key={header} className="flex items-center gap-4">
                <code className="font-mono text-emerald-400 text-xs w-56 shrink-0">{header}</code>
                <p className="text-zinc-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Error responses */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Authentication errors</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5">401 Unauthorized</span>
                <span className="text-zinc-400 text-sm">Missing or invalid API key</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key. Pass your key in the X-XRNotify-Key header."
  }
}`}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5">403 Forbidden</span>
                <span className="text-zinc-400 text-sm">Valid key but missing required scope</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "error": {
    "code": "FORBIDDEN",
    "message": "This key does not have the required scope: webhooks:write"
  }
}`}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-2 py-0.5">429 Too Many Requests</span>
                <span className="text-zinc-400 text-sm">Rate limit exceeded</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 2024-01-15T10:24:00Z."
  }
}
// Response also includes: Retry-After: 15`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API</p>
              <p className="text-zinc-500 text-sm">Create and manage webhooks</p>
            </Link>
            <Link href="/docs/api/deliveries" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Deliveries API</p>
              <p className="text-zinc-500 text-sm">Monitor event delivery status</p>
            </Link>
            <Link href="/docs/api/events" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Events API</p>
              <p className="text-zinc-500 text-sm">Query the XRPL event log</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
