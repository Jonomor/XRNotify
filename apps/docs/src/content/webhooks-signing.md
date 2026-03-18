---
title: "Webhook Signature Verification"
description: "How to verify XRNotify webhook signatures to ensure payload authenticity and integrity."
---

# Webhook Signature Verification

Every webhook delivery from XRNotify includes a cryptographic signature so you can verify that the payload is authentic and hasn't been tampered with in transit.

**Never process a webhook payload without verifying the signature first.**

---

## How It Works

1. When you create a webhook, XRNotify generates a unique signing secret (prefixed with `whsec_`).
2. For each delivery, XRNotify computes an HMAC-SHA256 digest of the **raw request body** using your webhook secret.
3. The hex-encoded digest is sent in the `X-XRNotify-Signature` header, prefixed with `sha256=`.
4. Your server recomputes the HMAC using the same secret and compares it to the header value.

```
X-XRNotify-Signature: sha256=5d41402abc4b2a76b9719d911017c592...
```

---

## Delivery Headers

Every webhook delivery includes these headers:

| Header | Description |
|--------|-------------|
| `X-XRNotify-Signature` | HMAC-SHA256 signature: `sha256=<hex>` |
| `X-XRNotify-Event-Type` | Event type (e.g. `payment`, `nft.mint`) |
| `X-XRNotify-Event-Id` | Deterministic event ID |
| `X-XRNotify-Delivery-Id` | Unique delivery attempt ID |
| `X-XRNotify-Timestamp` | ISO 8601 UTC delivery timestamp |
| `Content-Type` | Always `application/json` |
| `User-Agent` | `XRNotify/1.0` |

---

## Verification Steps

1. Extract the `X-XRNotify-Signature` header from the incoming request.
2. Read the **raw request body** as bytes (before any JSON parsing).
3. Compute HMAC-SHA256 of the raw body using your webhook secret.
4. Prepend `sha256=` to the hex-encoded result.
5. Compare using a **constant-time** comparison function.
6. If they match, the payload is authentic — process it. If not, return `401`.

> **Critical:** You must compare the raw bytes of the body, not a re-serialized version. JSON key ordering, whitespace, and encoding differences will cause signature mismatches if you parse and re-serialize.

---

## Code Examples

### Node.js

```javascript
import crypto from "node:crypto";

const WEBHOOK_SECRET = process.env.XRNOTIFY_WEBHOOK_SECRET;

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedSig = `sha256=${expected}`;

  // Constant-time comparison to prevent timing attacks
  if (expectedSig.length !== signatureHeader.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(signatureHeader)
  );
}

// Express example
app.post("/webhooks/xrpl", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-xrnotify-signature"];

  if (!verifyWebhookSignature(req.body, signature)) {
    console.error("Webhook signature verification failed");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());
  console.log(`Received ${event.event_type}: ${event.event_id}`);

  // Process the event...

  res.status(200).json({ received: true });
});
```

> **Express note:** Use `express.raw()` middleware to get the raw body. The default `express.json()` parser will parse the body before you can compute the signature.

### Node.js (Fastify)

```javascript
import Fastify from "fastify";
import crypto from "node:crypto";

const app = Fastify({
  // Get raw body alongside parsed body
  bodyLimit: 1048576,
});

app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (req, body, done) => {
    req.rawBody = body;
    try {
      done(null, JSON.parse(body.toString()));
    } catch (err) {
      done(err);
    }
  }
);

app.post("/webhooks/xrpl", async (request, reply) => {
  const signature = request.headers["x-xrnotify-signature"];
  const rawBody = request.rawBody;

  const expected = crypto
    .createHmac("sha256", process.env.XRNOTIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedSig = `sha256=${expected}`;

  if (
    expectedSig.length !== signature?.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature))
  ) {
    return reply.status(401).send({ error: "Invalid signature" });
  }

  const event = request.body;
  // Process event...

  return { received: true };
});
```

### Python (Flask)

```python
import hmac
import hashlib
import os
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = os.environ["XRNOTIFY_WEBHOOK_SECRET"]


def verify_signature(raw_body: bytes, signature: str) -> bool:
    """Verify HMAC-SHA256 webhook signature."""
    if not signature or not signature.startswith("sha256="):
        return False

    expected = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    expected_sig = f"sha256={expected}"

    # Constant-time comparison
    return hmac.compare_digest(expected_sig, signature)


@app.route("/webhooks/xrpl", methods=["POST"])
def webhook_handler():
    signature = request.headers.get("X-XRNotify-Signature", "")
    raw_body = request.get_data()

    if not verify_signature(raw_body, signature):
        return jsonify({"error": "Invalid signature"}), 401

    event = request.get_json()
    print(f"Received {event['event_type']}: {event['event_id']}")

    # Process the event...

    return jsonify({"received": True}), 200
```

### Python (FastAPI)

```python
import hmac
import hashlib
import os
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = os.environ["XRNOTIFY_WEBHOOK_SECRET"]


@app.post("/webhooks/xrpl")
async def webhook_handler(request: Request):
    signature = request.headers.get("x-xrnotify-signature", "")
    raw_body = await request.body()

    expected = hmac.new(
        WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(f"sha256={expected}", signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = await request.json()
    # Process event...

    return {"received": True}
```

### Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
)

var webhookSecret = os.Getenv("XRNOTIFY_WEBHOOK_SECRET")

func verifySignature(body []byte, signature string) bool {
	if len(signature) < 8 || signature[:7] != "sha256=" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	// hmac.Equal is constant-time
	return hmac.Equal([]byte(expected), []byte(signature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	signature := r.Header.Get("X-XRNotify-Signature")
	if !verifySignature(body, signature) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Process event from body...
	fmt.Fprintf(w, `{"received": true}`)
}

func main() {
	http.HandleFunc("/webhooks/xrpl", webhookHandler)
	http.ListenAndServe(":8080", nil)
}
```

### Ruby (Sinatra)

```ruby
require "sinatra"
require "openssl"
require "json"

WEBHOOK_SECRET = ENV.fetch("XRNOTIFY_WEBHOOK_SECRET")

def verify_signature(raw_body, signature)
  return false unless signature&.start_with?("sha256=")

  expected = OpenSSL::HMAC.hexdigest("SHA256", WEBHOOK_SECRET, raw_body)
  expected_sig = "sha256=#{expected}"

  # Constant-time comparison
  Rack::Utils.secure_compare(expected_sig, signature)
end

post "/webhooks/xrpl" do
  request.body.rewind
  raw_body = request.body.read
  signature = request.env["HTTP_X_XRNOTIFY_SIGNATURE"]

  unless verify_signature(raw_body, signature)
    halt 401, { error: "Invalid signature" }.to_json
  end

  event = JSON.parse(raw_body)
  puts "Received #{event['event_type']}: #{event['event_id']}"

  # Process the event...

  status 200
  { received: true }.to_json
end
```

### PHP

```php
<?php

$webhookSecret = getenv('XRNOTIFY_WEBHOOK_SECRET');
$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_XRNOTIFY_SIGNATURE'] ?? '';

$expected = 'sha256=' . hash_hmac('sha256', $rawBody, $webhookSecret);

// Timing-safe comparison
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = json_decode($rawBody, true);
error_log("Received {$event['event_type']}: {$event['event_id']}");

// Process the event...

http_response_code(200);
echo json_encode(['received' => true]);
```

### Java (Spring Boot)

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

@RestController
public class WebhookController {

    private static final String SECRET = System.getenv("XRNOTIFY_WEBHOOK_SECRET");

    @PostMapping("/webhooks/xrpl")
    public ResponseEntity<?> handleWebhook(
            @RequestBody byte[] rawBody,
            @RequestHeader("X-XRNotify-Signature") String signature) {

        String expected = computeSignature(rawBody);

        // Constant-time comparison
        if (!MessageDigest.isEqual(
                expected.getBytes(), signature.getBytes())) {
            return ResponseEntity.status(401)
                .body(Map.of("error", "Invalid signature"));
        }

        String body = new String(rawBody);
        // Parse and process event...

        return ResponseEntity.ok(Map.of("received", true));
    }

    private String computeSignature(byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(), "HmacSHA256"));
            byte[] hash = mac.doFinal(body);
            StringBuilder hex = new StringBuilder("sha256=");
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }
}
```

---

## Replay Protection

To prevent replay attacks where an attacker re-sends a previously valid delivery, you should:

1. **Check the timestamp.** The `X-XRNotify-Timestamp` header contains the delivery time. Reject payloads older than 5 minutes:

```javascript
const deliveryTime = new Date(req.headers["x-xrnotify-timestamp"]);
const now = new Date();
const fiveMinutes = 5 * 60 * 1000;

if (Math.abs(now - deliveryTime) > fiveMinutes) {
  return res.status(401).json({ error: "Delivery too old" });
}
```

2. **Track processed event IDs.** Store the `X-XRNotify-Event-Id` and `X-XRNotify-Delivery-Id` and reject duplicates:

```javascript
const eventId = req.headers["x-xrnotify-event-id"];
const deliveryId = req.headers["x-xrnotify-delivery-id"];

const key = `${eventId}:${deliveryId}`;
if (await redis.exists(`processed:${key}`)) {
  return res.status(200).json({ already_processed: true });
}

// Process event, then mark as processed
await redis.set(`processed:${key}`, "1", "EX", 86400); // 24h TTL
```

---

## Troubleshooting

### Signature mismatch

| Symptom | Cause | Fix |
|---------|-------|-----|
| Every delivery fails verification | Wrong secret | Re-check the `whsec_` value from webhook creation |
| Intermittent failures | Body parsed before verification | Use raw body middleware (see framework examples above) |
| Works locally, fails in production | Proxy modifying body | Check reverse proxy isn't re-encoding or adding whitespace |
| Signature header missing | Firewall stripping headers | Allow `X-XRNotify-*` headers through your WAF/CDN |

### Common mistakes

- **Parsing JSON before verification.** JSON serialization is not guaranteed to be byte-identical. Always verify the raw bytes.
- **Using simple string comparison.** Use constant-time functions (`timingSafeEqual`, `compare_digest`, `hash_equals`, `hmac.Equal`) to prevent timing attacks.
- **URL-decoding the body.** The signature is computed on the raw body, not a URL-decoded version.
- **Encoding mismatch.** Ensure you're reading the body as UTF-8 bytes, not another encoding.

---

## Testing Signatures Locally

Generate a test signature to validate your verification code:

```bash
# Set your webhook secret
SECRET="whsec_test_abc123"

# Create a test payload
PAYLOAD='{"event_id":"xrpl:1:abc:payment","event_type":"payment","timestamp":"2026-02-26T00:00:00Z","ledger_index":1,"tx_hash":"abc","account_context":["rTest"],"payload":{}}'

# Compute signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"

echo "Signature: $SIGNATURE"

# Send test request to your local server
curl -X POST http://localhost:8080/webhooks/xrpl \
  -H "Content-Type: application/json" \
  -H "X-XRNotify-Signature: $SIGNATURE" \
  -H "X-XRNotify-Event-Type: payment" \
  -H "X-XRNotify-Event-Id: xrpl:1:abc:payment" \
  -H "X-XRNotify-Delivery-Id: del_test_001" \
  -H "X-XRNotify-Timestamp: 2026-02-26T00:00:00Z" \
  -d "$PAYLOAD"
```

---

## Security Best Practices

- **Store your webhook secret securely.** Use environment variables or a secrets manager — never hardcode it.
- **Rotate secrets periodically.** Delete and recreate the webhook to get a new secret. Update your server before deleting the old webhook.
- **Always verify before processing.** Treat unverified payloads as untrusted and reject them.
- **Use HTTPS.** Ensure your webhook endpoint uses TLS to protect payloads in transit.
- **Respond quickly.** Return `2xx` within 30 seconds. Do heavy processing asynchronously after acknowledging receipt.
- **Handle retries idempotently.** The same event may be delivered more than once. Use the `event_id` to deduplicate.
