import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Webhook Signature Helpers - XRNotify Docs',
  description: 'Copy-paste webhook signature verification functions for Node.js, Python, Go, Ruby, PHP, and Java. No SDK required.',
};

export default function SignatureHelpersPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#sdks" className="text-zinc-500 hover:text-zinc-300 no-underline">SDKs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Signature Helpers</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            SDKs &amp; Libraries
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Webhook Signature Helpers</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Copy-paste ready signature verification functions for any language. No SDK required — these are standalone functions you can drop directly into your application.
          </p>
        </div>

        {/* How it works */}
        <section className="mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">How XRNotify signatures work</h3>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300 text-sm">
              <li>XRNotify computes <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">HMAC-SHA256(raw_body, webhook_secret)</code></li>
              <li>The result is formatted as <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">sha256=&lt;hex_digest&gt;</code></li>
              <li>This value is sent in the <code className="font-mono text-zinc-200 bg-zinc-800 px-1 rounded">X-XRNotify-Signature</code> request header</li>
              <li>You recompute the same HMAC on your side and compare using a constant-time function</li>
            </ol>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Always use raw bytes:</span> Compute the HMAC over the raw request body bytes <span className="font-semibold">before</span> any JSON parsing. Modifying the body (whitespace changes, key reordering) will invalidate the signature.
            </p>
          </div>
        </section>

        {/* Node.js */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-semibold text-white">Node.js</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">CommonJS</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`const crypto = require('crypto');

/**
 * Verify an XRNotify webhook signature.
 * @param {Buffer|string} payload - Raw request body (before JSON.parse)
 * @param {string} signature - X-XRNotify-Signature header value
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
function verifyXRNotifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    // Lengths differ — timingSafeEqual throws on mismatched lengths
    return false;
  }
}`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Key point:</span> <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">crypto.timingSafeEqual</code> throws if the two buffers have different lengths, so the try/catch is required. Pass the raw <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">req.body</code> Buffer — not a parsed object.
            </p>
          </div>
        </section>

        {/* Python */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-semibold text-white">Python</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">stdlib only</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import hmac
import hashlib


def verify_xrnotify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify an XRNotify webhook signature.

    payload:   raw request body bytes (before json.loads)
    signature: value of X-XRNotify-Signature header
    secret:    webhook secret string
    """
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Key point:</span> <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">hmac.compare_digest</code> performs a constant-time comparison, preventing timing-based attacks. Pass <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">request.data</code> (bytes) in Flask, or <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">await request.body()</code> in FastAPI.
            </p>
          </div>
        </section>

        {/* Go */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-semibold text-white">Go</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">stdlib only</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
)

// VerifyXRNotifySignature verifies an XRNotify webhook signature.
// payload:   raw request body bytes (from io.ReadAll(r.Body))
// signature: X-XRNotify-Signature header value
// secret:    webhook secret
func VerifyXRNotifySignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))
    return hmac.Equal([]byte(signature), []byte(expected))
}`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Key point:</span> <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">hmac.Equal</code> from the standard library performs a constant-time byte comparison. Read the body with <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">io.ReadAll(r.Body)</code> and pass the bytes directly to this function.
            </p>
          </div>
        </section>

        {/* Ruby */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-semibold text-white">Ruby</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">stdlib + rack</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`require 'openssl'
require 'rack'

# Verify an XRNotify webhook signature.
# payload:   raw request body string
# signature: X-XRNotify-Signature header value
# secret:    webhook secret
def verify_xrnotify_signature(payload, signature, secret)
  expected = 'sha256=' + OpenSSL::HMAC.hexdigest('sha256', secret, payload)
  Rack::Utils.secure_compare(signature, expected)
end

# Sinatra / Rails example:
# post '/webhooks/xrpl' do
#   raw = request.body.read
#   sig = request.env['HTTP_X_XRNOTIFY_SIGNATURE']
#   halt 401, 'Unauthorized' unless verify_xrnotify_signature(raw, sig, ENV['WEBHOOK_SECRET'])
#   event = JSON.parse(raw)
#   # handle event...
#   status 200
# end`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Key point:</span> <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">Rack::Utils.secure_compare</code> provides constant-time string comparison. Read the raw body with <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">request.body.read</code> before passing to <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">JSON.parse</code>.
            </p>
          </div>
        </section>

        {/* PHP */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-semibold text-white">PHP</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">stdlib only</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`<?php

/**
 * Verify an XRNotify webhook signature.
 *
 * @param string $payload   Raw request body
 * @param string $signature X-XRNotify-Signature header value
 * @param string $secret    Webhook secret
 * @return bool
 */
function verifyXRNotifySignature(string $payload, string $signature, string $secret): bool {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

// Usage example:
// $payload   = file_get_contents('php://input');
// $signature = $_SERVER['HTTP_X_XRNOTIFY_SIGNATURE'] ?? '';
// $secret    = getenv('WEBHOOK_SECRET');
//
// if (!verifyXRNotifySignature($payload, $signature, $secret)) {
//     http_response_code(401);
//     exit('Unauthorized');
// }
//
// $event = json_decode($payload, true);
// // handle $event...`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Key point:</span> <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">hash_equals</code> performs a constant-time string comparison (available since PHP 5.6). Read the raw body with <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">file_get_contents(&apos;php://input&apos;)</code> before decoding JSON.
            </p>
          </div>
        </section>

        {/* Java */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-semibold text-white">Java</h2>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5">JDK only</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

/**
 * Verify an XRNotify webhook signature.
 *
 * @param payload   raw request body bytes
 * @param signature X-XRNotify-Signature header value
 * @param secret    webhook secret string
 * @return true if the signature is valid
 */
public static boolean verifyXRNotifySignature(
    byte[] payload, String signature, String secret
) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes("UTF-8"), "HmacSHA256"));
    String expected = "sha256=" + bytesToHex(mac.doFinal(payload));

    // Use MessageDigest.isEqual for constant-time comparison
    return MessageDigest.isEqual(
        expected.getBytes("UTF-8"),
        signature.getBytes("UTF-8")
    );
}

private static String bytesToHex(byte[] bytes) {
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
        sb.append(String.format("%02x", b));
    }
    return sb.toString();
}`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Key point:</span> <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">MessageDigest.isEqual</code> performs a constant-time byte array comparison (available since Java 6). Read the raw request body bytes with <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">request.getInputStream().readAllBytes()</code> in a servlet before parsing JSON.
            </p>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">SDK documentation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/sdks/nodejs" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Node.js SDK</p>
              <p className="text-zinc-500 text-sm">Full SDK with TypeScript types</p>
            </Link>
            <Link href="/docs/sdks/python" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Python SDK</p>
              <p className="text-zinc-500 text-sm">Full SDK with Pydantic models</p>
            </Link>
            <Link href="/docs/sdks/go" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Go SDK</p>
              <p className="text-zinc-500 text-sm">Full SDK with idiomatic Go structs</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
