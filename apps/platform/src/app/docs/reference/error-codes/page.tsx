import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Error Codes: XRNotify Docs',
  description:
    'Complete reference for all XRNotify API error codes, HTTP status codes, and error response format.',
};

export default function ErrorCodesPage() {
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
            <span className="text-zinc-300">Error Codes</span>
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
            Reference
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">Error Codes</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            All API errors use a consistent JSON structure with machine-readable error codes.
            Use the <code className="text-emerald-400">code</code> field, not the HTTP status, for programmatic error handling.
          </p>
        </div>

        {/* Error response format */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Error response format</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Every error response from the XRNotify API has the same top-level structure:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`{
  "error": {
    "code": "invalid_api_key",
    "message": "The API key provided is invalid or has been revoked.",
    "status": 401,
    "request_id": "req_abc123"
  }
}`}
            </pre>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Field</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['code', 'Snake_case string. Use this for programmatic error handling.'],
                  ['message', 'Human-readable description suitable for logging.'],
                  ['status', 'Mirrors the HTTP status code of the response.'],
                  ['request_id', 'Unique identifier for this request. Include in support tickets.'],
                  ['details', 'Optional array of per-field validation errors (validation_error only).'],
                  ['retry_after', 'Seconds to wait before retrying (rate_limit_exceeded only).'],
                ].map(([field, desc]) => (
                  <tr key={field}>
                    <td className="py-2.5 pr-6">
                      <code className="text-emerald-400 text-xs">{field}</code>
                    </td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 400 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">400</span>
            <span className="text-zinc-400">Bad Request</span>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">bad_request</code></td>
                  <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">The request body is malformed or missing required fields.</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">validation_error</code></td>
                  <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">One or more fields failed validation. Check the <code className="text-zinc-400">details</code> array for per-field messages.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-zinc-400 text-xs mb-3">
            The <code className="text-emerald-400 bg-zinc-800 px-1 rounded">validation_error</code> response includes a{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">details</code> array with one entry per failing field:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "status": 400,
    "request_id": "req_xyz789",
    "details": [
      { "field": "url", "message": "Must be a valid HTTPS URL" },
      { "field": "event_types", "message": "Must contain at least one event type" }
    ]
  }
}`}
            </pre>
          </div>
        </section>

        {/* 401 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">401</span>
            <span className="text-zinc-400">Unauthorized</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['unauthorized', 'No API key was provided in the X-XRNotify-Key header.'],
                  ['invalid_api_key', 'The key format is invalid, or the key does not exist in our system.'],
                  ['api_key_expired', 'The API key has passed its configured expiration date.'],
                  ['api_key_revoked', 'The API key was manually revoked via the dashboard or API.'],
                ].map(([code, desc]) => (
                  <tr key={code}>
                    <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">{code}</code></td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 403 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">403</span>
            <span className="text-zinc-400">Forbidden</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['forbidden', 'The API key is valid but lacks the required scope for this operation.'],
                  ['plan_limit_exceeded', 'Your account has reached a plan limit (webhook count, monthly event volume, etc.). Upgrade your plan to continue.'],
                ].map(([code, desc]) => (
                  <tr key={code}>
                    <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">{code}</code></td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 404 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">404</span>
            <span className="text-zinc-400">Not Found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['not_found', 'The requested resource does not exist.'],
                  ['webhook_not_found', 'The webhook ID does not exist, or belongs to a different account.'],
                  ['delivery_not_found', 'The delivery ID was not found. IDs are case-sensitive.'],
                ].map(([code, desc]) => (
                  <tr key={code}>
                    <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">{code}</code></td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 409 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">409</span>
            <span className="text-zinc-400">Conflict</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">conflict</code></td>
                  <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">
                    A webhook already exists with the same URL and event types combination. Each
                    (URL, event_types) pair must be unique within an account.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 422 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">422</span>
            <span className="text-zinc-400">Unprocessable Entity</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {[
                  ['invalid_url', 'The webhook URL failed validation. Must be HTTPS. Localhost and private IP ranges are blocked.'],
                  ['ssrf_blocked', 'The URL resolves to a private, loopback, link-local, or reserved IP address. This is a security measure.'],
                  ['unsupported_event_type', 'One or more values in the event_types array are not recognised. Check the EventType union for valid values.'],
                ].map(([code, desc]) => (
                  <tr key={code}>
                    <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">{code}</code></td>
                    <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 429 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">429</span>
            <span className="text-zinc-400">Too Many Requests</span>
          </div>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Rate limit errors include a <code className="text-emerald-400 bg-zinc-800 px-1 rounded">Retry-After</code> HTTP header and a{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">retry_after</code> field in the error body:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">rate_limit_exceeded</code></td>
                  <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">
                    You have exceeded your plan&apos;s request rate limit. Wait for the number of
                    seconds indicated in <code className="text-zinc-400">Retry-After</code> before retrying.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 23 seconds.",
    "status": 429,
    "request_id": "req_def456",
    "retry_after": 23
  }
}`}
            </pre>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            See the{' '}
            <Link href="/docs/reference/rate-limits" className="text-emerald-400 hover:text-emerald-300">
              Rate Limits reference
            </Link>{' '}
            for per-plan limits and best practices for handling 429 responses.
          </p>
        </section>

        {/* 500 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg font-bold text-white">500</span>
            <span className="text-zinc-400">Internal Server Error</span>
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Code</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-2.5 pr-6"><code className="text-emerald-400 text-xs">internal_error</code></td>
                  <td className="py-2.5 text-zinc-300 text-xs leading-relaxed">
                    An unexpected error occurred on our side. Retrying the request may succeed.
                    If the error persists, contact support with the <code className="text-zinc-400">request_id</code>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            If you encounter a persistent 500 error, contact support at{' '}
            <a href="mailto:support@xrnotify.io" className="text-emerald-400 hover:text-emerald-300">
              support@xrnotify.io
            </a>{' '}
            and include the <code className="text-emerald-400">request_id</code> from the error response to help us diagnose the issue quickly.
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/reference/rate-limits', label: 'Rate Limits', desc: 'Per-plan limits and how to handle 429 responses' },
              { href: '/docs/reference/retry-policy', label: 'Retry Policy', desc: 'How XRNotify retries failed deliveries' },
              { href: '/docs/reference/event-schema', label: 'Event Schema', desc: 'Structure of every XRNotify event' },
              { href: '/docs/guides/handling-failures', label: 'Handling Failures', desc: 'Build resilient webhook endpoints' },
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
