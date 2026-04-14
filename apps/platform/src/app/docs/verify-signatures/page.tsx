'use client';

import { useState } from 'react';
import Link from 'next/link';

const tabs = ['Node.js', 'Python', 'Go', 'Ruby'] as const;
type Tab = typeof tabs[number];

const codeExamples: Record<Tab, string> = {
  'Node.js': `const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = \`sha256=\${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}\`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/xrpl', (req, res) => {
  const valid = verifySignature(
    req.body,
    req.headers['x-xrnotify-signature'],
    process.env.WEBHOOK_SECRET
  );

  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  const event = JSON.parse(req.body);
  console.log('Verified event:', event.event_type);

  // process event...
  res.sendStatus(200);
});`,

  Python: `import hmac
import hashlib
import os
from flask import Flask, request

app = Flask(__name__)

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhooks/xrpl', methods=['POST'])
def handle_webhook():
    if not verify_signature(
        request.data,
        request.headers.get('X-XRNotify-Signature', ''),
        os.environ['WEBHOOK_SECRET']
    ):
        return 'Invalid signature', 401

    event = request.get_json()
    print(f"Verified event: {event['event_type']}")
    return 'OK', 200`,

  Go: `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "net/http"
    "os"
)

func verifySignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))
    return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    sig := r.Header.Get("X-XRNotify-Signature")
    if !verifySignature(body, sig, os.Getenv("WEBHOOK_SECRET")) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // process body...
    w.WriteHeader(http.StatusOK)
}`,

  Ruby: `require 'openssl'
require 'rack'
require 'json'

def verify_signature(payload, signature, secret)
  expected = 'sha256=' + OpenSSL::HMAC.hexdigest('sha256', secret, payload)
  Rack::Utils.secure_compare(signature, expected)
end

# Sinatra example
post '/webhooks/xrpl' do
  payload = request.body.read
  signature = request.env['HTTP_X_XRNOTIFY_SIGNATURE'] || ''

  unless verify_signature(payload, signature, ENV['WEBHOOK_SECRET'])
    halt 401, 'Invalid signature'
  end

  event = JSON.parse(payload)
  puts "Verified event: #{event['event_type']}"
  status 200
end`,
};

export default function VerifySignaturesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Node.js');

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">Getting Started</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Verify Signatures</span>
          </div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Home →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            Getting Started
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Verify Webhook Signatures</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Every request from XRNotify is signed with your webhook secret. Verifying this signature protects your endpoint from spoofed or tampered requests.
          </p>
        </div>

        {/* How it works */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">How signatures work</h2>
          <p className="text-zinc-300 mb-4 leading-relaxed">
            When XRNotify delivers an event, it computes an HMAC-SHA256 digest of the raw request body using your webhook's signing secret. The result is included in the{' '}
            <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">X-XRNotify-Signature</code> request header, prefixed with{' '}
            <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">sha256=</code>.
          </p>
          <p className="text-zinc-300 leading-relaxed">
            To verify, you recompute the HMAC using the same secret and compare your result to the header value using a constant-time comparison function to prevent timing attacks.
          </p>
        </section>

        {/* Headers table */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Webhook request headers</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Header</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  { header: 'X-XRNotify-Signature', desc: 'HMAC-SHA256 of the raw body, formatted as sha256=<hex_digest>' },
                  { header: 'X-XRNotify-Timestamp', desc: 'Unix timestamp (seconds) of when the delivery was initiated' },
                  { header: 'X-XRNotify-Delivery-Id', desc: 'Unique delivery ID. Use for idempotency checks in your database' },
                  { header: 'X-XRNotify-Webhook-Id', desc: 'ID of the webhook this event was delivered to' },
                ].map(({ header, desc }) => (
                  <tr key={header}>
                    <td className="py-2.5 pr-6">
                      <code className="font-mono text-emerald-400 text-xs">{header}</code>
                    </td>
                    <td className="py-2.5 text-zinc-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Security warning:</span> Always verify the signature before processing any event data. Never trust the payload contents without first confirming the request originated from XRNotify.
            </p>
          </div>
        </section>

        {/* Code examples with tabs */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Verification examples</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="flex border-b border-zinc-800">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-white border-b-2 border-emerald-500 bg-zinc-800/50'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{codeExamples[activeTab]}</pre>
            </div>
          </div>
        </section>

        {/* Common mistakes */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Common mistakes</h2>
          <div className="space-y-4">
            {[
              {
                mistake: 'Parsing JSON before verifying',
                detail: 'The signature covers the raw bytes of the request body. If you parse the JSON first and re-serialize, even a single whitespace difference will cause verification to fail. Always use the raw body buffer.',
              },
              {
                mistake: 'Using == for string comparison',
                detail: 'Standard equality checks are vulnerable to timing attacks where an attacker can infer the correct signature byte-by-byte by measuring response times. Always use a constant-time comparison function like crypto.timingSafeEqual (Node.js), hmac.compare_digest (Python), or hmac.Equal (Go).',
              },
              {
                mistake: 'Forgetting the sha256= prefix',
                detail: 'The header value is sha256=<hex_digest>, not just the hex digest. Your expected value must include the prefix, otherwise the comparison will always fail.',
              },
            ].map(({ mistake, detail }) => (
              <div key={mistake} className="flex gap-3">
                <span className="text-red-400 text-sm shrink-0 mt-0.5">✗</span>
                <div>
                  <p className="text-white font-medium text-sm mb-1">{mistake}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Security best practices */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-4">Security best practices</h2>
          <ul className="space-y-3">
            {[
              {
                title: 'Rotate secrets if compromised',
                desc: 'Use the rotate-secret endpoint (POST /v1/webhooks/:id/rotate-secret) to immediately invalidate the old secret and generate a new one.',
              },
              {
                title: 'Reject stale events',
                desc: 'Check the X-XRNotify-Timestamp header and reject events older than 5 minutes. This prevents replay attacks where an attacker re-sends a valid old request.',
              },
              {
                title: 'Deduplicate with delivery IDs',
                desc: 'Store X-XRNotify-Delivery-Id values in your database to ensure idempotent processing. XRNotify may retry failed deliveries, so your handler should be safe to call multiple times.',
              },
              {
                title: 'Store secrets in environment variables',
                desc: 'Never hardcode webhook secrets in your source code. Use environment variables or a secrets manager like AWS Secrets Manager or HashiCorp Vault.',
              },
            ].map(({ title, desc }) => (
              <li key={title} className="flex gap-3">
                <span className="text-emerald-400 text-sm shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="text-white font-medium text-sm mb-0.5">{title}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/docs/api/webhooks" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Webhooks API Reference</p>
              <p className="text-zinc-500 text-sm">Rotate secrets, update settings, and more</p>
            </Link>
            <Link href="/docs/api/deliveries" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Deliveries API</p>
              <p className="text-zinc-500 text-sm">Monitor delivery status and retry failed events</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
