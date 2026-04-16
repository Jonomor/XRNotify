import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Rate Limits',
  description:
    'Per-plan API rate limits, response headers, token bucket algorithm explanation, and best practices for handling 429 responses.',
};

export default function RateLimitsPage() {
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
            <span className="text-zinc-300">Rate Limits</span>
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
          <h1 className="text-3xl font-bold text-white mb-3">Rate Limits</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            XRNotify enforces rate limits on API requests per key using a token bucket
            algorithm. Limits vary by plan and are designed to support high-throughput
            integrations on paid plans.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-3">
            Rate limits apply per API key, not per account. If you have multiple API keys,
            each operates its own independent token bucket. All API endpoints count toward
            the same rate limit bucket for a given key.
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            <strong className="text-white">Webhook deliveries are not counted.</strong> Inbound
            event deliveries from XRNotify to your endpoint do not consume API rate limit
            tokens. Only your outbound requests to the XRNotify API are counted.
          </div>
        </section>

        {/* Limits by plan */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Limits by plan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Plan</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Requests / minute</th>
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Requests / day</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Burst capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['Developer', '60', '1,000', '20'],
                  ['Builder', '300', '10,000', '50'],
                  ['Professional', '1,000', '100,000', '200'],
                  ['Compliance', '1,000', '100,000', '200'],
                  ['Enterprise', 'Custom', 'Unlimited', 'Custom'],
                ].map(([plan, rpm, rpd, burst]) => (
                  <tr key={plan}>
                    <td className="py-2.5 pr-6 text-zinc-300 font-medium">{plan}</td>
                    <td className="py-2.5 pr-6 text-zinc-300">{rpm}</td>
                    <td className="py-2.5 pr-6 text-zinc-300">{rpd}</td>
                    <td className="py-2.5 text-zinc-300">{burst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Token bucket algorithm */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Token bucket algorithm</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            XRNotify uses a token bucket algorithm for rate limiting. Each API key starts
            with a bucket of tokens equal to its plan&apos;s burst capacity. Every API request
            consumes one token from the bucket. The bucket refills continuously at a rate of{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">(requests_per_minute / 60)</code> tokens per second, up to the burst
            capacity ceiling.
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            For example, a Professional plan key refills at roughly 16.7 tokens/second and can absorb
            a burst of 200 requests before the rate limit is enforced. This means short
            bursts of activity are handled gracefully without triggering 429 errors, as long
            as the average request rate over time stays within the per-minute limit.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`# Token bucket refill rate formula:
refill_rate = requests_per_minute / 60   # tokens per second

# Example for Professional plan:
refill_rate = 1000 / 60 = ~16.7 tokens/second
burst_capacity = 200 tokens

# A burst of 200 requests is absorbed instantly.
# After the burst, the bucket refills at 16.7/s.
# Sustained rate above 1000 req/min will trigger 429.`}
            </pre>
          </div>
        </section>

        {/* Rate limit headers */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Rate limit headers</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Every API response includes the following headers so you can monitor your usage
            and slow down proactively before hitting the limit:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Header</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['X-RateLimit-Limit', 'Your plan\'s requests per minute limit.'],
                  ['X-RateLimit-Remaining', 'Number of tokens remaining in the current bucket.'],
                  ['X-RateLimit-Reset', 'Unix timestamp when the bucket will be full again.'],
                  ['Retry-After', 'Seconds to wait before retrying. Only present on 429 responses.'],
                ].map(([header, desc]) => (
                  <tr key={header}>
                    <td className="py-2.5 pr-6">
                      <code className="text-emerald-400 text-xs whitespace-nowrap">{header}</code>
                    </td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Handling 429 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Handling 429 responses</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            When you receive a 429 response, read the{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">Retry-After</code> header and wait that many seconds before retrying.
            The following example implements a simple retry helper with respect for the
            server-provided delay:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function apiCall(url, options, retries = 3) {
  const response = await fetch(url, options);

  if (response.status === 429 && retries > 0) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    console.warn(\`Rate limited. Waiting \${retryAfter}s before retry...\`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return apiCall(url, options, retries - 1);
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error: \${error.error.code} - \${error.error.message}\`);
  }

  return response.json();
}

// Usage:
const webhooks = await apiCall('https://api.xrnotify.io/v1/webhooks', {
  headers: { 'X-XRNotify-Key': process.env.XRNOTIFY_API_KEY },
});`}
            </pre>
          </div>
        </section>

        {/* Exponential backoff */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Exponential backoff for persistent 429s</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            If you&apos;re consistently hitting the rate limit, use exponential backoff with
            jitter to spread retries over time and avoid a retry thundering herd:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function apiCallWithBackoff(url, options, attempt = 0) {
  const MAX_ATTEMPTS = 5;
  const response = await fetch(url, options);

  if (response.status === 429 && attempt < MAX_ATTEMPTS) {
    // Use server's Retry-After if available, otherwise exponential backoff
    const serverDelay = parseInt(response.headers.get('Retry-After') || '0', 10);
    const exponential = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s, 16s
    const jitter = Math.random() * 500;              // up to 500ms jitter
    const delay = Math.max(serverDelay * 1000, exponential + jitter);

    await new Promise(resolve => setTimeout(resolve, delay));
    return apiCallWithBackoff(url, options, attempt + 1);
  }

  return response;
}`}
            </pre>
          </div>
        </section>

        {/* Best practices */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Best practices</h2>
          <ul className="space-y-3 text-zinc-300 text-sm">
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Cache GET responses.</strong> Webhook lists,
                delivery logs, and stats do not change on every request. Cache them for
                30–60 seconds to dramatically reduce API call volume.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Batch operations.</strong> When creating multiple
                webhooks or retrying multiple deliveries, stagger your requests rather than
                firing them all simultaneously. A short sleep between requests protects your
                burst budget.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Monitor X-RateLimit-Remaining.</strong> When the
                remaining token count drops below 20% of your limit, slow your request rate
                proactively, before you hit 0 and start receiving 429 errors.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Use the Retry-After header.</strong> Always respect
                the server-provided delay. Using a fixed backoff shorter than the server&apos;s
                window will result in wasted requests that still fail.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 shrink-0 mt-0.5">→</span>
              <span>
                <strong className="text-white">Consider upgrading your plan.</strong> If you
                consistently need more than 60 requests/minute, the Builder or Professional
                plan may be more appropriate. Contact us for Enterprise limits.
              </span>
            </li>
          </ul>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/reference/error-codes', label: 'Error Codes', desc: 'Full error code reference including 429 format' },
              { href: '/docs/reference/retry-policy', label: 'Retry Policy', desc: 'How XRNotify retries failed webhook deliveries' },
              { href: '/docs/api/webhooks', label: 'Webhooks API', desc: 'Create, update, and list webhooks' },
              { href: '/docs/guides/handling-failures', label: 'Handling Failures', desc: 'Build resilient webhook handlers' },
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
