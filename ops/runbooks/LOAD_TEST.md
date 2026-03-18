---
title: "Load Test Runbook"
description: "How to run, interpret, and act on XRNotify load test results."
---

# XRNotify — Load Test Runbook

## Overview

This runbook covers running the k6 load test suite against the XRNotify API to validate throughput, latency, and reliability under simulated production traffic.

The load test script lives at `ops/load/k6-webhook-delivery.js` and exercises:

- Health/readiness endpoints
- Full webhook CRUD lifecycle
- Delivery log queries (unfiltered + filtered)
- Metrics summary endpoint
- API key listing
- Events listing
- Authentication failure handling

---

## Prerequisites

### 1. Install k6

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

Verify installation:

```bash
k6 version
# Expected: k6 v0.50+ (any recent version)
```

### 2. Running XRNotify API

Ensure the API is running and accessible:

```bash
# Local (Docker Compose)
docker compose -f ops/docker-compose.yml up --build -d

# Verify
curl http://localhost:4400/healthz
# Expected: {"status":"ok"}

curl http://localhost:4400/readyz
# Expected: {"status":"ready","postgres":"connected","redis":"connected",...}
```

### 3. Create a Load Test API Key

Create a dedicated API key with full scopes for load testing. **Do not reuse production keys.**

```bash
# Via the dashboard UI, or via curl if you have a session token:
curl -X POST http://localhost:4400/v1/api-keys \
  -H "Authorization: Bearer <your_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "k6 Load Test",
    "scopes": [
      "webhooks:read", "webhooks:write",
      "deliveries:read", "deliveries:write",
      "events:read", "metrics:read"
    ]
  }'
```

Save the returned `key` value — you'll need it for the `API_KEY` environment variable.

### 4. Seed Test Data (Optional)

For delivery log and events queries to return meaningful results, ensure some webhook deliveries have occurred. You can:

- Create a webhook pointing to `https://httpbin.org/post`
- Wait for XRPL events to trigger deliveries
- Or replay past events via `POST /v1/events/replay`

---

## Running the Load Test

### Quick Smoke Test

```bash
k6 run \
  --env BASE_URL=http://localhost:4400 \
  --env API_KEY=xrn_live_your_key_here \
  ops/load/k6-webhook-delivery.js
```

This runs all three scenarios (smoke → load → spike) sequentially over ~12 minutes.

### Smoke Only (Fast Validation)

```bash
k6 run \
  --env BASE_URL=http://localhost:4400 \
  --env API_KEY=xrn_live_your_key_here \
  --scenario smoke \
  ops/load/k6-webhook-delivery.js
```

### Custom VUs and Duration

```bash
k6 run \
  --vus 30 \
  --duration 5m \
  --env BASE_URL=http://localhost:4400 \
  --env API_KEY=xrn_live_your_key_here \
  ops/load/k6-webhook-delivery.js
```

### Against Staging/Production

```bash
k6 run \
  --env BASE_URL=https://api.staging.xrnotify.io \
  --env API_KEY=xrn_live_staging_key \
  --env WEBHOOK_URL=https://your-test-receiver.com/hook \
  ops/load/k6-webhook-delivery.js
```

> **Warning:** Running against production will create and delete real webhook records. Use a dedicated test tenant.

### Via Docker

```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:4400 \
  -e API_KEY=xrn_live_your_key_here \
  -v $(pwd)/ops/load:/scripts \
  grafana/k6 run /scripts/k6-webhook-delivery.js
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | No | `http://localhost:4400` | XRNotify API base URL |
| `API_KEY` | Yes | — | Valid API key with full scopes |
| `WEBHOOK_URL` | No | `https://httpbin.org/post` | Test receiver for created webhooks |

---

## Understanding Results

### Scenarios

| Scenario | VUs | Duration | Purpose |
|----------|-----|----------|---------|
| Smoke | 1→5 | ~2 min | Baseline validation, catch regressions |
| Load | 20→50 | ~8 min | Sustained throughput under normal-to-high traffic |
| Spike | 0→100 | ~50 sec | Burst tolerance, queue backpressure, rate limiting |

### Thresholds

The test defines pass/fail thresholds. **Any threshold failure should be investigated.**

| Metric | Threshold | What It Means |
|--------|-----------|---------------|
| `http_req_duration p(95)` | < 500ms | 95th percentile response time for all requests |
| `http_req_duration p(99)` | < 1500ms | 99th percentile — tail latency |
| `http_req_failed` | < 5% | Overall HTTP failure rate |
| `xrnotify_webhook_create_duration p(95)` | < 300ms | Webhook creation should be fast |
| `xrnotify_webhook_list_duration p(95)` | < 200ms | List queries should be snappy |
| `xrnotify_delivery_list_duration p(95)` | < 400ms | Delivery logs may involve joins |
| `xrnotify_metrics_summary_duration p(95)` | < 500ms | Aggregation queries allowed more headroom |
| `xrnotify_auth_failure_rate` | < 1% | Auth should almost never fail with valid key |
| `xrnotify_api_errors` | < 50 | Total unexpected errors across the run |

### Output Files

After a run, results are saved to:

```
ops/load/results/summary.json
```

This JSON file contains key metrics for CI integration or historical tracking.

---

## Interpreting Common Results

### All Green

```
✓ http_req_duration p(95) < 500ms
✓ http_req_failed rate < 0.05
✓ xrnotify_webhook_create_duration p(95) < 300ms
```

System is performing within acceptable bounds. No action needed.

### High p95 Latency on Webhook Create

```
✗ xrnotify_webhook_create_duration p(95) < 300ms
  actual: 620ms
```

**Possible causes:**
- Database connection pool exhaustion
- Slow DNS resolution for SSRF checks on webhook URLs
- Redis contention for rate limiting

**Actions:**
1. Check Postgres connection pool size (`max_connections`, pgBouncer settings)
2. Review `readyz` endpoint for DB latency
3. Check Redis `INFO` for memory/CPU pressure
4. Profile the webhook creation handler with tracing

### High Delivery List Latency

```
✗ xrnotify_delivery_list_duration p(95) < 400ms
  actual: 890ms
```

**Possible causes:**
- Missing database indexes on deliveries table
- Large result sets without proper pagination
- Unoptimized JOIN queries

**Actions:**
1. Run `EXPLAIN ANALYZE` on the delivery list query
2. Verify indexes exist on `(tenant_id, status)`, `(webhook_id)`, `(created_at)`
3. Consider read replicas for heavy query loads

### Elevated Error Rate

```
✗ http_req_failed rate < 0.05
  actual: 0.12
```

**Possible causes:**
- Rate limiting kicking in (expected during spike)
- Database connection timeouts
- OOM on the API container

**Actions:**
1. Check if errors are 429 (rate limited) — this is expected during spike
2. Review API container logs for OOM kills or crash loops
3. Check Redis rate limiter configuration
4. Increase rate limit for the load test key if needed

### Spike Scenario Failures

Failures isolated to the spike scenario (100 VUs) are generally acceptable if the system recovers. Check:

1. **Recovery time** — does p95 return to normal after the spike?
2. **Error type** — 429s are expected; 500s are not
3. **Queue depth** — do Redis streams back up during the spike?

---

## Monitoring During Load Tests

### Grafana Dashboards

If Grafana is running (via `ops/docker-compose.yml`), monitor these panels during the test:

- **API Latency** — request duration by endpoint
- **Queue Depth** — Redis stream length (pending messages)
- **Worker Throughput** — deliveries processed per second
- **Error Rate** — 4xx vs 5xx breakdown
- **Database Connections** — active/idle pool utilization

Access Grafana at `http://localhost:3000` (default credentials: `admin`/`admin`).

### Real-Time CLI Monitoring

In a separate terminal during the test:

```bash
# API request rate
watch -n 2 'curl -s http://localhost:4400/metrics | grep http_request_duration'

# Redis stream length
docker exec xrnotify-redis redis-cli XLEN xrnotify:events:live

# Postgres active connections
docker exec xrnotify-postgres psql -U xrnotify -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

---

## Scaling Guidance

Based on load test results, here are recommended scaling actions:

| Bottleneck | Indicator | Scaling Action |
|------------|-----------|----------------|
| API latency | p95 > 500ms sustained | Add API replicas (horizontal scale on Fly.io) |
| DB connections | Pool exhaustion errors | Increase pool size or add PgBouncer |
| DB query time | Slow delivery/event queries | Add read replica, optimize indexes |
| Redis memory | OOM or eviction warnings | Upgrade Redis instance, check key TTLs |
| Worker throughput | Queue depth growing | Add worker replicas, increase consumer concurrency |
| Rate limiting | High 429 rate for legitimate traffic | Increase per-key token bucket capacity |

### Fly.io Scaling Commands

```bash
# Scale API horizontally
fly scale count api=3

# Increase API VM size
fly scale vm shared-cpu-2x --app xrnotify-api

# Scale worker separately
fly scale count worker=2 --app xrnotify-worker
```

---

## CI Integration

Add load tests to your CI pipeline as a gate on staging deploys:

```yaml
# In .github/workflows/ci.yml
load-test:
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/k6-action@v0.3.1
      with:
        filename: ops/load/k6-webhook-delivery.js
      env:
        BASE_URL: ${{ secrets.STAGING_API_URL }}
        API_KEY: ${{ secrets.STAGING_LOAD_TEST_KEY }}
    - uses: actions/upload-artifact@v4
      with:
        name: load-test-results
        path: ops/load/results/
```

---

## Runbook Checklist

Before running a load test:

- [ ] API is running and `/healthz` returns 200
- [ ] `/readyz` confirms DB, Redis, and listener connected
- [ ] Dedicated load test API key created (not production key)
- [ ] Grafana/monitoring accessible for real-time observation
- [ ] Team notified if running against shared staging environment
- [ ] Previous results archived for comparison

After the load test:

- [ ] Review threshold pass/fail summary
- [ ] Check for 500 errors in API logs
- [ ] Verify Redis queue depth returned to normal
- [ ] Save `summary.json` for historical tracking
- [ ] File issues for any threshold failures
- [ ] Update scaling recommendations if thresholds changed
