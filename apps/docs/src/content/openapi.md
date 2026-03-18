---
title: "OpenAPI Reference"
description: "XRNotify REST API — OpenAPI 3.1 specification"
---

# XRNotify API — OpenAPI Reference

Base URL: `https://api.xrnotify.io`

Version: `1.0.0`

---

## Authentication

All endpoints require one of:

| Method | Header | Description |
|--------|--------|-------------|
| API Key | `X-XRNotify-Key: xrn_live_...` | Primary auth for programmatic access |
| JWT Bearer | `Authorization: Bearer <token>` | Session auth for dashboard UI |

API keys are generated in the dashboard. Each key is a 32-byte random value prefixed with `xrn_live_` (production) or `xrn_test_` (sandbox). Only the SHA-256 hash is stored server-side.

---

## Endpoints

### Auth

#### POST /v1/auth/login

Authenticate with email and password to receive a JWT session token.

**Request Body**

```json
{
  "email": "user@company.com",
  "password": "your_password"
}
```

**Response (200)**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": "2026-02-27T10:00:00.000Z",
  "tenant": {
    "id": "tn_a1b2c3d4",
    "name": "Acme Corp",
    "plan": "pro"
  }
}
```

#### POST /v1/auth/register

Create a new tenant account.

**Request Body**

```json
{
  "name": "Acme Corp",
  "email": "user@company.com",
  "password": "secure_password_here"
}
```

**Response (201)** — same shape as login response.

---

### Webhooks

#### POST /v1/webhooks

Create a new webhook endpoint.

**Request Body**

```json
{
  "url": "https://yourapp.com/webhooks/xrpl",
  "event_types": ["payment", "nft.mint"],
  "description": "Production listener",
  "active": true,
  "metadata": {
    "environment": "production"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | HTTPS endpoint (HTTP allowed in dev only) |
| `event_types` | string[] | Yes | One or more supported event types |
| `description` | string | No | Human-readable label |
| `active` | boolean | No | Default `true` |
| `metadata` | object | No | Arbitrary key-value pairs delivered with each event |

**Response (201)**

```json
{
  "id": "wh_a1b2c3d4e5f6",
  "url": "https://yourapp.com/webhooks/xrpl",
  "description": "Production listener",
  "event_types": ["payment", "nft.mint"],
  "active": true,
  "secret": "whsec_abc123def456ghi789...",
  "secret_last4": "i789",
  "created_at": "2026-02-26T10:00:00.000Z",
  "updated_at": "2026-02-26T10:00:00.000Z",
  "metadata": {
    "environment": "production"
  }
}
```

> **Important:** The `secret` field is returned only in the creation response. Store it securely for signature verification.

#### GET /v1/webhooks

List all webhooks for the authenticated tenant.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 50 | Results per page (max 100) |

**Response (200)**

```json
{
  "webhooks": [ ... ],
  "total": 3,
  "page": 1,
  "per_page": 50
}
```

#### GET /v1/webhooks/:id

Retrieve a single webhook by ID.

**Response (200)** — single webhook object (without `secret`).

#### PATCH /v1/webhooks/:id

Update a webhook. Only include fields you wish to change.

**Request Body**

```json
{
  "event_types": ["payment", "nft.mint", "offer.create"],
  "active": false
}
```

**Response (200)** — updated webhook object.

#### DELETE /v1/webhooks/:id

Permanently delete a webhook.

**Response (204)** — no body.

---

### Events

#### GET /v1/events

List recent events captured by the listener.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 50 | Results per page (max 100) |
| `event_type` | string | — | Filter by event type |

**Response (200)**

```json
{
  "events": [ ... ],
  "total": 1542,
  "page": 1,
  "per_page": 50
}
```

#### GET /v1/events/:event_id

Retrieve a single event by its deterministic event ID.

**Response (200)**

```json
{
  "event_id": "xrpl:92845631:A1B2C3D4E5F6:payment",
  "ledger_index": 92845631,
  "tx_hash": "A1B2C3D4E5F6...",
  "event_type": "payment",
  "timestamp": "2026-02-26T14:30:00.000Z",
  "account_context": ["rSourceAddr...", "rDestAddr..."],
  "payload": {
    "source": "rSourceAddr...",
    "destination": "rDestAddr...",
    "amount": {
      "currency": "XRP",
      "value": "100.000000"
    },
    "destination_tag": 12345
  }
}
```

#### POST /v1/events/replay

Replay a past event to one or all active webhooks.

**Request Body**

```json
{
  "event_id": "xrpl:92845631:A1B2C3D4E5F6:payment",
  "webhook_id": "wh_a1b2c3d4e5f6"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | string | Yes | Event to replay |
| `webhook_id` | string | No | Target webhook (omit to replay to all active) |

**Response (202)**

```json
{
  "replayed": true,
  "event_id": "xrpl:92845631:A1B2C3D4E5F6:payment",
  "target_webhooks": 1
}
```

---

### Deliveries

#### GET /v1/deliveries

List delivery attempts with optional filters.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 50 | Results per page (max 100) |
| `webhook_id` | string | — | Filter by webhook |
| `status` | string | — | Filter: `success`, `failed`, `retrying`, `pending`, `dead_letter` |
| `event_type` | string | — | Filter by event type |

**Response (200)**

```json
{
  "deliveries": [
    {
      "id": "del_x1y2z3",
      "webhook_id": "wh_a1b2c3d4e5f6",
      "webhook_url": "https://yourapp.com/webhooks/xrpl",
      "event_id": "xrpl:92845631:A1B2C3D4E5F6:payment",
      "event_type": "payment",
      "status": "success",
      "http_status": 200,
      "attempt": 1,
      "max_attempts": 5,
      "latency_ms": 142,
      "next_retry_at": null,
      "error_message": null,
      "created_at": "2026-02-26T14:30:01.000Z",
      "completed_at": "2026-02-26T14:30:01.142Z"
    }
  ],
  "total": 8432,
  "page": 1,
  "per_page": 50
}
```

#### GET /v1/deliveries/:id

Retrieve a single delivery with full detail including request headers and response body.

#### POST /v1/deliveries/:id/retry

Re-queue a failed or dead-letter delivery for immediate retry.

**Response (202)**

```json
{
  "retried": true,
  "delivery_id": "del_x1y2z3"
}
```

---

### API Keys

#### POST /v1/api-keys

Create a new API key.

**Request Body**

```json
{
  "name": "Production Backend",
  "scopes": ["webhooks:read", "webhooks:write", "deliveries:read"],
  "expires_at": "2027-02-26T00:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable label |
| `scopes` | string[] | Yes | Permission scopes (see table below) |
| `expires_at` | string | No | ISO 8601 expiration (omit for non-expiring) |

**Available Scopes**

| Scope | Grants |
|-------|--------|
| `webhooks:read` | List and get webhook details |
| `webhooks:write` | Create, update, delete webhooks |
| `deliveries:read` | List delivery logs |
| `deliveries:write` | Retry deliveries |
| `events:read` | List events, get event detail, replay |
| `metrics:read` | Read metrics summary |

**Response (201)**

```json
{
  "id": "key_m1n2o3p4",
  "name": "Production Backend",
  "key": "xrn_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "prefix": "xrn_live_a1b2",
  "last4": "o5p6",
  "scopes": ["webhooks:read", "webhooks:write", "deliveries:read"],
  "created_at": "2026-02-26T10:00:00.000Z"
}
```

> **Important:** The `key` field is returned only once at creation. Store it securely.

#### GET /v1/api-keys

List all API keys for the tenant (keys are masked — prefix and last4 only).

**Response (200)**

```json
{
  "api_keys": [
    {
      "id": "key_m1n2o3p4",
      "name": "Production Backend",
      "prefix": "xrn_live_a1b2",
      "last4": "o5p6",
      "scopes": ["webhooks:read", "webhooks:write", "deliveries:read"],
      "active": true,
      "last_used_at": "2026-02-26T12:30:00.000Z",
      "expires_at": "2027-02-26T00:00:00.000Z",
      "created_at": "2026-02-26T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### DELETE /v1/api-keys/:id

Revoke an API key. Takes effect immediately.

**Response (204)** — no body.

---

### Metrics

#### GET /v1/metrics/summary

Retrieve aggregated platform metrics.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `24h` | Time range: `1h`, `24h`, `7d`, `30d` |

**Response (200)**

```json
{
  "total_events": 15420,
  "total_deliveries": 30840,
  "success_rate": 0.9987,
  "avg_latency_ms": 134,
  "active_webhooks": 5,
  "failed_24h": 4,
  "dead_letter_count": 1,
  "events_by_type": {
    "payment": 12300,
    "nft.mint": 1520,
    "offer.create": 980,
    "trustset": 620
  },
  "deliveries_by_status": {
    "success": 30795,
    "failed": 30,
    "retrying": 14,
    "dead_letter": 1
  },
  "latency_p50_ms": 98,
  "latency_p95_ms": 245,
  "latency_p99_ms": 890
}
```

---

### Health

These endpoints are unauthenticated.

#### GET /healthz

Liveness check. Returns `200` if the process is running.

```json
{ "status": "ok" }
```

#### GET /readyz

Readiness check. Returns `200` only if Postgres, Redis, and the XRPL listener are connected.

```json
{
  "status": "ready",
  "postgres": "connected",
  "redis": "connected",
  "xrpl_listener": "connected",
  "uptime_seconds": 86420
}
```

#### GET /metrics

Prometheus-format metrics scrape endpoint.

---

## Webhook Delivery Format

When XRNotify delivers an event to your endpoint, the HTTP request looks like:

```
POST /your/webhook/path HTTP/1.1
Host: yourapp.com
Content-Type: application/json
User-Agent: XRNotify/1.0
X-XRNotify-Signature: sha256=a1b2c3d4e5f6...
X-XRNotify-Event-Type: payment
X-XRNotify-Delivery-Id: del_x1y2z3
X-XRNotify-Event-Id: xrpl:92845631:A1B2C3D4E5F6:payment
X-XRNotify-Timestamp: 2026-02-26T14:30:00.000Z
```

**Body** — the full event object (see Event Schema above).

**Expected response:**
- Return `2xx` within 30 seconds to acknowledge successful receipt.
- Any non-2xx or timeout triggers retry with exponential backoff.

---

## Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | ~30 seconds |
| 3 | ~2 minutes |
| 4 | ~15 minutes |
| 5 | ~1 hour |

Delays include randomised jitter (±20%) to avoid thundering herd. After all attempts are exhausted the delivery moves to `dead_letter` status.

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": "error_code",
  "message": "Human-readable explanation",
  "status": 400
}
```

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `validation_error` | Invalid request body or query parameters |
| 401 | `unauthorized` | Missing, invalid, or expired credentials |
| 403 | `forbidden` | Valid credentials but insufficient scope |
| 404 | `not_found` | Requested resource does not exist |
| 409 | `conflict` | Duplicate resource (idempotency violation) |
| 422 | `unprocessable` | Valid JSON but semantically incorrect |
| 429 | `rate_limited` | Rate limit exceeded — check `X-RateLimit-Reset` header |
| 500 | `internal_error` | Unexpected server error |

---

## SSRF Protection

Webhook URLs are validated on creation and update:

- **Production:** Only `https://` URLs are accepted.
- **Blocked ranges:** Private IP addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `::1`) are rejected.
- **DNS resolution:** The target hostname is resolved and checked against blocked ranges before the first delivery.
- **Enterprise:** Optional URL allowlist for additional control.

---

## Versioning

The API is versioned via URL path (`/v1/`). Breaking changes will be introduced under a new version prefix. Non-breaking additions (new fields, new event types) may be added to the current version without notice — design your integrations to ignore unknown fields.
