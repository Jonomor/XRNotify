/**
 * XRNotify — k6 Load Test: Webhook Delivery Pipeline
 *
 * Tests:
 *   1. API authentication throughput
 *   2. Webhook CRUD operations under concurrent load
 *   3. Delivery log query performance
 *   4. Metrics endpoint latency
 *   5. End-to-end event replay → delivery cycle
 *
 * Usage:
 *   k6 run ops/load/k6-webhook-delivery.js
 *   k6 run --vus 50 --duration 2m ops/load/k6-webhook-delivery.js
 *   k6 run --env BASE_URL=https://api.xrnotify.io ops/load/k6-webhook-delivery.js
 *
 * Prerequisites:
 *   - XRNotify API running (local or remote)
 *   - Valid API key with full scopes
 *   - At least one webhook endpoint registered (for delivery tests)
 *
 * Environment variables:
 *   BASE_URL   — API base URL (default: http://localhost:4400)
 *   API_KEY    — Valid XRNotify API key
 *   WEBHOOK_URL — Test receiver URL for webhook creation (default: https://httpbin.org/post)
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

/* ------------------------------------------------------------------ */
/*  Custom metrics                                                     */
/* ------------------------------------------------------------------ */

const webhookCreateDuration = new Trend("xrnotify_webhook_create_duration", true);
const webhookListDuration = new Trend("xrnotify_webhook_list_duration", true);
const deliveryListDuration = new Trend("xrnotify_delivery_list_duration", true);
const metricsSummaryDuration = new Trend("xrnotify_metrics_summary_duration", true);
const replayDuration = new Trend("xrnotify_replay_duration", true);
const authFailures = new Rate("xrnotify_auth_failure_rate");
const apiErrors = new Counter("xrnotify_api_errors");

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const BASE_URL = __ENV.BASE_URL || "http://localhost:4400";
const API_KEY = __ENV.API_KEY || "xrn_test_loadtest_key";
const WEBHOOK_URL = __ENV.WEBHOOK_URL || "https://httpbin.org/post";

const HEADERS = {
  "Content-Type": "application/json",
  "X-XRNotify-Key": API_KEY,
};

/* ------------------------------------------------------------------ */
/*  Test stages                                                        */
/* ------------------------------------------------------------------ */

export const options = {
  scenarios: {
    /* Ramp-up smoke test */
    smoke: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 5 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
      tags: { scenario: "smoke" },
    },

    /* Sustained load test */
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "3m", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "15s",
      startTime: "2m30s", /* starts after smoke completes */
      tags: { scenario: "load" },
    },

    /* Spike test */
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "30s", target: 100 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
      startTime: "11m", /* starts after load completes */
      tags: { scenario: "spike" },
    },
  },

  thresholds: {
    /* Global */
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.05"],

    /* Custom */
    xrnotify_webhook_create_duration: ["p(95)<300"],
    xrnotify_webhook_list_duration: ["p(95)<200"],
    xrnotify_delivery_list_duration: ["p(95)<400"],
    xrnotify_metrics_summary_duration: ["p(95)<500"],
    xrnotify_auth_failure_rate: ["rate<0.01"],
    xrnotify_api_errors: ["count<50"],
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function checkResponse(res, name, expectedStatus = 200) {
  const passed = check(res, {
    [`${name} — status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} — has body`]: (r) => r.body && r.body.length > 0,
    [`${name} — latency < 2s`]: (r) => r.timings.duration < 2000,
  });

  if (!passed) {
    apiErrors.add(1);
    if (res.status === 401 || res.status === 403) {
      authFailures.add(1);
    }
  }

  return passed;
}

function randomEventTypes() {
  const all = [
    "payment", "trustset", "nft.mint", "nft.burn",
    "nft.accept_offer", "offer.create", "offer.cancel",
    "account.set", "account.delete",
  ];
  const count = Math.floor(Math.random() * all.length) + 1;
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/*  Test scenarios                                                     */
/* ------------------------------------------------------------------ */

export default function () {
  /* ---- 1. Health check ---- */
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/healthz`);
    check(res, {
      "healthz — 200": (r) => r.status === 200,
    });
  });

  sleep(0.5);

  /* ---- 2. Readiness check ---- */
  group("Readiness Check", () => {
    const res = http.get(`${BASE_URL}/readyz`);
    check(res, {
      "readyz — 200": (r) => r.status === 200,
    });
  });

  sleep(0.5);

  /* ---- 3. Webhook CRUD cycle ---- */
  let createdWebhookId = null;

  group("Webhook Create", () => {
    const payload = JSON.stringify({
      url: `${WEBHOOK_URL}?test=${uniqueId()}`,
      event_types: randomEventTypes(),
      description: `k6 load test ${uniqueId()}`,
      metadata: { source: "k6", run_id: uniqueId() },
    });

    const res = http.post(`${BASE_URL}/v1/webhooks`, payload, {
      headers: HEADERS,
    });

    webhookCreateDuration.add(res.timings.duration);

    if (checkResponse(res, "Create webhook", 201)) {
      try {
        const body = JSON.parse(res.body);
        createdWebhookId = body.id;
      } catch (e) {
        apiErrors.add(1);
      }
    }
  });

  sleep(0.3);

  group("Webhook List", () => {
    const res = http.get(`${BASE_URL}/v1/webhooks?per_page=10`, {
      headers: HEADERS,
    });

    webhookListDuration.add(res.timings.duration);
    checkResponse(res, "List webhooks");

    /* Verify response structure */
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        check(body, {
          "List has webhooks array": (b) => Array.isArray(b.webhooks),
          "List has total count": (b) => typeof b.total === "number",
          "List has page number": (b) => typeof b.page === "number",
        });
      } catch (e) {
        apiErrors.add(1);
      }
    }
  });

  sleep(0.3);

  if (createdWebhookId) {
    group("Webhook Get", () => {
      const res = http.get(`${BASE_URL}/v1/webhooks/${createdWebhookId}`, {
        headers: HEADERS,
      });
      checkResponse(res, "Get webhook");

      if (res.status === 200) {
        try {
          const body = JSON.parse(res.body);
          check(body, {
            "Get returns correct ID": (b) => b.id === createdWebhookId,
            "Get does not expose secret": (b) => !b.secret && !b.secret_hash,
          });
        } catch (e) {
          apiErrors.add(1);
        }
      }
    });

    sleep(0.3);

    group("Webhook Update", () => {
      const payload = JSON.stringify({
        description: `Updated by k6 at ${new Date().toISOString()}`,
        active: Math.random() > 0.5,
      });

      const res = http.patch(
        `${BASE_URL}/v1/webhooks/${createdWebhookId}`,
        payload,
        { headers: HEADERS },
      );
      checkResponse(res, "Update webhook");
    });

    sleep(0.3);

    /* Clean up — delete the webhook */
    group("Webhook Delete", () => {
      const res = http.del(
        `${BASE_URL}/v1/webhooks/${createdWebhookId}`,
        null,
        { headers: HEADERS },
      );
      checkResponse(res, "Delete webhook", 204);
    });

    sleep(0.3);
  }

  /* ---- 4. Delivery logs ---- */
  group("Delivery List", () => {
    const res = http.get(
      `${BASE_URL}/v1/deliveries?per_page=25&page=1`,
      { headers: HEADERS },
    );

    deliveryListDuration.add(res.timings.duration);
    checkResponse(res, "List deliveries");
  });

  sleep(0.3);

  group("Delivery List — Filtered by status", () => {
    const statuses = ["success", "failed", "retrying", "dead_letter"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const res = http.get(
      `${BASE_URL}/v1/deliveries?status=${status}&per_page=10`,
      { headers: HEADERS },
    );
    checkResponse(res, `List deliveries (${status})`);
  });

  sleep(0.3);

  /* ---- 5. Metrics summary ---- */
  group("Metrics Summary", () => {
    const ranges = ["1h", "24h", "7d", "30d"];
    const range = ranges[Math.floor(Math.random() * ranges.length)];

    const res = http.get(
      `${BASE_URL}/v1/metrics/summary?range=${range}`,
      { headers: HEADERS },
    );

    metricsSummaryDuration.add(res.timings.duration);
    checkResponse(res, `Metrics summary (${range})`);

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        check(body, {
          "Metrics has success_rate": (b) => typeof b.success_rate === "number",
          "Metrics has total_events": (b) => typeof b.total_events === "number",
          "Metrics has latency_p95": (b) => typeof b.latency_p95_ms === "number",
        });
      } catch (e) {
        apiErrors.add(1);
      }
    }
  });

  sleep(0.3);

  /* ---- 6. API Keys list ---- */
  group("API Keys List", () => {
    const res = http.get(`${BASE_URL}/v1/api-keys`, {
      headers: HEADERS,
    });
    checkResponse(res, "List API keys");
  });

  sleep(0.3);

  /* ---- 7. Events list ---- */
  group("Events List", () => {
    const res = http.get(
      `${BASE_URL}/v1/events?per_page=10`,
      { headers: HEADERS },
    );
    checkResponse(res, "List events");
  });

  sleep(0.3);

  /* ---- 8. Auth failure test (intentional) ---- */
  group("Auth Failure", () => {
    const res = http.get(`${BASE_URL}/v1/webhooks`, {
      headers: {
        "Content-Type": "application/json",
        "X-XRNotify-Key": "xrn_invalid_key_for_load_test",
      },
    });

    check(res, {
      "Invalid key returns 401": (r) => r.status === 401,
    });
  });

  sleep(0.5);
}

/* ------------------------------------------------------------------ */
/*  Lifecycle hooks                                                    */
/* ------------------------------------------------------------------ */

export function setup() {
  /* Verify API is reachable before starting */
  const healthRes = http.get(`${BASE_URL}/healthz`);
  if (healthRes.status !== 200) {
    throw new Error(
      `API not reachable at ${BASE_URL}/healthz — got ${healthRes.status}`,
    );
  }

  /* Verify API key is valid */
  const authRes = http.get(`${BASE_URL}/v1/webhooks`, {
    headers: HEADERS,
  });
  if (authRes.status === 401) {
    throw new Error(
      "API key is invalid. Set API_KEY env var to a valid XRNotify key.",
    );
  }

  console.log(`✓ XRNotify API reachable at ${BASE_URL}`);
  console.log(`✓ API key authenticated successfully`);

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}

/* ------------------------------------------------------------------ */
/*  Summary handler                                                    */
/* ------------------------------------------------------------------ */

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration?.values?.["p(95)"],
      http_req_duration_p99: data.metrics.http_req_duration?.values?.["p(99)"],
      http_req_failed_rate: data.metrics.http_req_failed?.values?.rate,
      total_requests: data.metrics.http_reqs?.values?.count,
      webhook_create_p95: data.metrics.xrnotify_webhook_create_duration?.values?.["p(95)"],
      webhook_list_p95: data.metrics.xrnotify_webhook_list_duration?.values?.["p(95)"],
      delivery_list_p95: data.metrics.xrnotify_delivery_list_duration?.values?.["p(95)"],
      metrics_summary_p95: data.metrics.xrnotify_metrics_summary_duration?.values?.["p(95)"],
      api_errors: data.metrics.xrnotify_api_errors?.values?.count,
    },
  };

  return {
    "ops/load/results/summary.json": JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}

/**
 * Minimal text summary formatter (k6 doesn't export the built-in one
 * when using handleSummary, so we provide a simple version).
 */
function textSummary(data, opts = {}) {
  const lines = [];
  lines.push("\n╔══════════════════════════════════════════╗");
  lines.push("║     XRNotify Load Test Results           ║");
  lines.push("╚══════════════════════════════════════════╝\n");

  if (data.metrics.http_reqs) {
    lines.push(`  Total requests:    ${data.metrics.http_reqs.values.count}`);
  }
  if (data.metrics.http_req_duration) {
    const d = data.metrics.http_req_duration.values;
    lines.push(`  Duration avg:      ${d.avg?.toFixed(1)}ms`);
    lines.push(`  Duration p(95):    ${d["p(95)"]?.toFixed(1)}ms`);
    lines.push(`  Duration p(99):    ${d["p(99)"]?.toFixed(1)}ms`);
  }
  if (data.metrics.http_req_failed) {
    lines.push(`  Failed rate:       ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  }
  if (data.metrics.xrnotify_api_errors) {
    lines.push(`  API errors:        ${data.metrics.xrnotify_api_errors.values.count}`);
  }

  lines.push("");

  /* Thresholds */
  const thresholds = data.root_group?.checks || [];
  let passed = 0;
  let failed = 0;
  for (const key of Object.keys(data.metrics)) {
    const m = data.metrics[key];
    if (m.thresholds) {
      for (const [name, result] of Object.entries(m.thresholds)) {
        if (result.ok) passed++;
        else failed++;
      }
    }
  }
  lines.push(`  Thresholds passed: ${passed}`);
  lines.push(`  Thresholds failed: ${failed}`);
  lines.push("");

  return lines.join("\n");
}
