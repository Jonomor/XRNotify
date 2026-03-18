import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Retry engine (mirrors worker/retry.ts logic)                       */
/* ------------------------------------------------------------------ */

interface DeliveryAttempt {
  delivery_id: string;
  webhook_id: string;
  event_id: string;
  url: string;
  attempt: number;
  max_attempts: number;
  status: "pending" | "success" | "failed" | "retrying" | "dead_letter";
  http_status: number | null;
  latency_ms: number | null;
  error_message: string | null;
  next_retry_at: string | null;
  created_at: string;
  completed_at: string | null;
}

interface RetryPolicy {
  max_attempts: number;
  base_delay_ms: number;
  max_delay_ms: number;
  jitter_factor: number; /* 0–1 range, e.g. 0.2 = ±20% */
}

const DEFAULT_POLICY: RetryPolicy = {
  max_attempts: 5,
  base_delay_ms: 30_000,       /* 30 seconds */
  max_delay_ms: 3_600_000,     /* 1 hour */
  jitter_factor: 0.2,
};

/**
 * Calculate the delay before the next retry attempt.
 * Uses exponential backoff with capped maximum and random jitter.
 */
function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_POLICY,
  _randomFn: () => number = Math.random,
): number {
  if (attempt < 1) return 0;

  /* Exponential: base * 2^(attempt-1) */
  const exponential = policy.base_delay_ms * Math.pow(2, attempt - 1);

  /* Cap at max */
  const capped = Math.min(exponential, policy.max_delay_ms);

  /* Apply jitter: ±jitter_factor */
  const jitterRange = capped * policy.jitter_factor;
  const jitter = (_randomFn() * 2 - 1) * jitterRange;

  return Math.max(0, Math.round(capped + jitter));
}

/**
 * Determine the next status based on delivery outcome.
 */
function resolveDeliveryStatus(
  httpStatus: number | null,
  attempt: number,
  maxAttempts: number,
  timedOut: boolean,
  networkError: boolean,
): { status: DeliveryAttempt["status"]; shouldRetry: boolean } {
  /* Success: 2xx */
  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) {
    return { status: "success", shouldRetry: false };
  }

  /* Non-retryable client errors: 4xx except 408, 429 */
  if (httpStatus !== null && httpStatus >= 400 && httpStatus < 500) {
    const retryable4xx = [408, 429];
    if (!retryable4xx.includes(httpStatus)) {
      if (attempt >= maxAttempts) {
        return { status: "dead_letter", shouldRetry: false };
      }
      /* Still move to dead_letter for non-retryable 4xx to avoid waste */
      return { status: "dead_letter", shouldRetry: false };
    }
  }

  /* Exhausted retries */
  if (attempt >= maxAttempts) {
    return { status: "dead_letter", shouldRetry: false };
  }

  /* Retryable: 5xx, 408, 429, timeout, network error */
  return { status: "retrying", shouldRetry: true };
}

/**
 * Check idempotency: has this (webhook_id, event_id) already been delivered?
 */
function isIdempotentDuplicate(
  deliveries: DeliveryAttempt[],
  webhookId: string,
  eventId: string,
): boolean {
  return deliveries.some(
    (d) =>
      d.webhook_id === webhookId &&
      d.event_id === eventId &&
      d.status === "success",
  );
}

/**
 * Simulate an HTTP delivery attempt.
 */
interface DeliverResult {
  httpStatus: number | null;
  latencyMs: number;
  timedOut: boolean;
  networkError: boolean;
  errorMessage: string | null;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Retry Delay — calculateRetryDelay", () => {
  /* Use deterministic random (returns 0.5 → zero jitter) */
  const noJitter = () => 0.5;

  it("returns 0 for attempt < 1", () => {
    expect(calculateRetryDelay(0, DEFAULT_POLICY, noJitter)).toBe(0);
    expect(calculateRetryDelay(-1, DEFAULT_POLICY, noJitter)).toBe(0);
  });

  it("returns base_delay for attempt 1 (no jitter)", () => {
    const delay = calculateRetryDelay(1, DEFAULT_POLICY, noJitter);
    expect(delay).toBe(30_000);
  });

  it("doubles delay for each attempt", () => {
    const d1 = calculateRetryDelay(1, DEFAULT_POLICY, noJitter);
    const d2 = calculateRetryDelay(2, DEFAULT_POLICY, noJitter);
    const d3 = calculateRetryDelay(3, DEFAULT_POLICY, noJitter);
    const d4 = calculateRetryDelay(4, DEFAULT_POLICY, noJitter);

    expect(d2).toBe(d1 * 2);   /* 60s */
    expect(d3).toBe(d1 * 4);   /* 120s */
    expect(d4).toBe(d1 * 8);   /* 240s */
  });

  it("caps at max_delay_ms", () => {
    const d10 = calculateRetryDelay(10, DEFAULT_POLICY, noJitter);
    expect(d10).toBe(DEFAULT_POLICY.max_delay_ms); /* 1 hour */
  });

  it("applies positive jitter when random > 0.5", () => {
    const highRandom = () => 0.9; /* produces positive jitter */
    const delay = calculateRetryDelay(1, DEFAULT_POLICY, highRandom);
    expect(delay).toBeGreaterThan(30_000);
    expect(delay).toBeLessThanOrEqual(30_000 * 1.2); /* max +20% */
  });

  it("applies negative jitter when random < 0.5", () => {
    const lowRandom = () => 0.1; /* produces negative jitter */
    const delay = calculateRetryDelay(1, DEFAULT_POLICY, lowRandom);
    expect(delay).toBeLessThan(30_000);
    expect(delay).toBeGreaterThanOrEqual(30_000 * 0.8); /* max -20% */
  });

  it("jitter stays within bounds across many samples", () => {
    const policy = { ...DEFAULT_POLICY, base_delay_ms: 1000, jitter_factor: 0.2 };
    for (let i = 0; i < 100; i++) {
      const delay = calculateRetryDelay(1, policy); /* real Math.random */
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(1200);
    }
  });

  it("works with custom policy", () => {
    const custom: RetryPolicy = {
      max_attempts: 3,
      base_delay_ms: 5_000,
      max_delay_ms: 60_000,
      jitter_factor: 0,
    };
    expect(calculateRetryDelay(1, custom, noJitter)).toBe(5_000);
    expect(calculateRetryDelay(2, custom, noJitter)).toBe(10_000);
    expect(calculateRetryDelay(3, custom, noJitter)).toBe(20_000);
    expect(calculateRetryDelay(4, custom, noJitter)).toBe(40_000);
    expect(calculateRetryDelay(5, custom, noJitter)).toBe(60_000); /* capped */
  });

  it("never returns negative delay", () => {
    const extremeLow = () => 0.0;
    const policy = { ...DEFAULT_POLICY, jitter_factor: 0.5 };
    for (let attempt = 1; attempt <= 10; attempt++) {
      expect(calculateRetryDelay(attempt, policy, extremeLow)).toBeGreaterThanOrEqual(0);
    }
  });

  it("matches expected schedule for default policy", () => {
    /* Expected: ~30s, ~60s, ~120s, ~240s, ~480s (capped at 3600s) */
    const delays = [1, 2, 3, 4, 5].map((a) =>
      calculateRetryDelay(a, DEFAULT_POLICY, noJitter),
    );
    expect(delays).toEqual([30_000, 60_000, 120_000, 240_000, 480_000]);
  });
});

describe("Delivery Status — resolveDeliveryStatus", () => {
  const MAX = 5;

  describe("Success (2xx)", () => {
    it.each([200, 201, 202, 204])("returns success for HTTP %d", (code) => {
      const result = resolveDeliveryStatus(code, 1, MAX, false, false);
      expect(result.status).toBe("success");
      expect(result.shouldRetry).toBe(false);
    });

    it("returns success even on last attempt", () => {
      const result = resolveDeliveryStatus(200, MAX, MAX, false, false);
      expect(result.status).toBe("success");
    });
  });

  describe("Non-retryable client errors (4xx)", () => {
    it.each([400, 401, 403, 404, 405, 422])(
      "returns dead_letter for HTTP %d without retry",
      (code) => {
        const result = resolveDeliveryStatus(code, 1, MAX, false, false);
        expect(result.status).toBe("dead_letter");
        expect(result.shouldRetry).toBe(false);
      },
    );
  });

  describe("Retryable client errors", () => {
    it("retries on HTTP 408 (Request Timeout)", () => {
      const result = resolveDeliveryStatus(408, 1, MAX, false, false);
      expect(result.status).toBe("retrying");
      expect(result.shouldRetry).toBe(true);
    });

    it("retries on HTTP 429 (Too Many Requests)", () => {
      const result = resolveDeliveryStatus(429, 1, MAX, false, false);
      expect(result.status).toBe("retrying");
      expect(result.shouldRetry).toBe(true);
    });

    it("dead-letters 408 after max attempts", () => {
      const result = resolveDeliveryStatus(408, MAX, MAX, false, false);
      expect(result.status).toBe("dead_letter");
      expect(result.shouldRetry).toBe(false);
    });

    it("dead-letters 429 after max attempts", () => {
      const result = resolveDeliveryStatus(429, MAX, MAX, false, false);
      expect(result.status).toBe("dead_letter");
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe("Server errors (5xx)", () => {
    it.each([500, 502, 503, 504])("retries on HTTP %d", (code) => {
      const result = resolveDeliveryStatus(code, 1, MAX, false, false);
      expect(result.status).toBe("retrying");
      expect(result.shouldRetry).toBe(true);
    });

    it("dead-letters 500 after max attempts", () => {
      const result = resolveDeliveryStatus(500, MAX, MAX, false, false);
      expect(result.status).toBe("dead_letter");
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe("Timeout", () => {
    it("retries on timeout when attempts remain", () => {
      const result = resolveDeliveryStatus(null, 1, MAX, true, false);
      expect(result.status).toBe("retrying");
      expect(result.shouldRetry).toBe(true);
    });

    it("dead-letters on timeout at max attempts", () => {
      const result = resolveDeliveryStatus(null, MAX, MAX, true, false);
      expect(result.status).toBe("dead_letter");
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe("Network error", () => {
    it("retries on network error when attempts remain", () => {
      const result = resolveDeliveryStatus(null, 1, MAX, false, true);
      expect(result.status).toBe("retrying");
      expect(result.shouldRetry).toBe(true);
    });

    it("dead-letters on network error at max attempts", () => {
      const result = resolveDeliveryStatus(null, MAX, MAX, false, true);
      expect(result.status).toBe("dead_letter");
    });
  });

  describe("Attempt progression", () => {
    it("retries through attempts 1 to max-1 for 500", () => {
      for (let attempt = 1; attempt < MAX; attempt++) {
        const result = resolveDeliveryStatus(500, attempt, MAX, false, false);
        expect(result.status).toBe("retrying");
        expect(result.shouldRetry).toBe(true);
      }
    });

    it("dead-letters at exactly max attempts", () => {
      const result = resolveDeliveryStatus(500, MAX, MAX, false, false);
      expect(result.status).toBe("dead_letter");
      expect(result.shouldRetry).toBe(false);
    });
  });
});

describe("Idempotency — isIdempotentDuplicate", () => {
  const deliveries: DeliveryAttempt[] = [];

  beforeEach(() => {
    deliveries.length = 0;
  });

  function makeDelivery(
    overrides: Partial<DeliveryAttempt> = {},
  ): DeliveryAttempt {
    return {
      delivery_id: `del_${Math.random().toString(36).slice(2, 10)}`,
      webhook_id: "wh_001",
      event_id: "xrpl:100:abc:payment",
      url: "https://example.com/hook",
      attempt: 1,
      max_attempts: 5,
      status: "success",
      http_status: 200,
      latency_ms: 100,
      error_message: null,
      next_retry_at: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      ...overrides,
    };
  }

  it("detects duplicate when prior delivery was successful", () => {
    deliveries.push(makeDelivery());
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(true);
  });

  it("does not flag as duplicate when no prior delivery exists", () => {
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(false);
  });

  it("does not flag when prior delivery failed", () => {
    deliveries.push(makeDelivery({ status: "failed", http_status: 500 }));
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(false);
  });

  it("does not flag when prior delivery is retrying", () => {
    deliveries.push(makeDelivery({ status: "retrying" }));
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(false);
  });

  it("does not flag when prior delivery is dead_letter", () => {
    deliveries.push(makeDelivery({ status: "dead_letter" }));
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(false);
  });

  it("does not cross-match different webhook IDs", () => {
    deliveries.push(makeDelivery({ webhook_id: "wh_002" }));
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(false);
  });

  it("does not cross-match different event IDs", () => {
    deliveries.push(makeDelivery({ event_id: "xrpl:200:def:nft.mint" }));
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(false);
  });

  it("detects duplicate among multiple deliveries", () => {
    deliveries.push(makeDelivery({ webhook_id: "wh_002", event_id: "xrpl:100:abc:payment" }));
    deliveries.push(makeDelivery({ webhook_id: "wh_001", event_id: "xrpl:200:def:nft.mint" }));
    deliveries.push(makeDelivery({ webhook_id: "wh_001", event_id: "xrpl:100:abc:payment", status: "success" }));
    expect(isIdempotentDuplicate(deliveries, "wh_001", "xrpl:100:abc:payment")).toBe(true);
  });
});

describe("Worker — End-to-end delivery flow simulation", () => {
  /**
   * Simulates the full delivery + retry loop for a single event→webhook pair.
   */
  function simulateDeliveryFlow(
    responses: DeliverResult[],
    policy: RetryPolicy = DEFAULT_POLICY,
  ): DeliveryAttempt {
    let attempt = 0;
    let delivery: DeliveryAttempt = {
      delivery_id: "del_sim_001",
      webhook_id: "wh_001",
      event_id: "xrpl:100:abc:payment",
      url: "https://example.com/hook",
      attempt: 0,
      max_attempts: policy.max_attempts,
      status: "pending",
      http_status: null,
      latency_ms: null,
      error_message: null,
      next_retry_at: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    for (const response of responses) {
      attempt++;
      delivery.attempt = attempt;
      delivery.http_status = response.httpStatus;
      delivery.latency_ms = response.latencyMs;
      delivery.error_message = response.errorMessage;

      const { status, shouldRetry } = resolveDeliveryStatus(
        response.httpStatus,
        attempt,
        policy.max_attempts,
        response.timedOut,
        response.networkError,
      );

      delivery.status = status;

      if (status === "success") {
        delivery.completed_at = new Date().toISOString();
        break;
      }

      if (!shouldRetry) {
        delivery.completed_at = new Date().toISOString();
        break;
      }

      /* Schedule retry */
      const delay = calculateRetryDelay(attempt, policy, () => 0.5);
      delivery.next_retry_at = new Date(Date.now() + delay).toISOString();
    }

    return delivery;
  }

  it("succeeds on first attempt", () => {
    const result = simulateDeliveryFlow([
      { httpStatus: 200, latencyMs: 50, timedOut: false, networkError: false, errorMessage: null },
    ]);
    expect(result.status).toBe("success");
    expect(result.attempt).toBe(1);
    expect(result.completed_at).not.toBeNull();
  });

  it("succeeds after transient 500 errors", () => {
    const result = simulateDeliveryFlow([
      { httpStatus: 500, latencyMs: 100, timedOut: false, networkError: false, errorMessage: "Internal Server Error" },
      { httpStatus: 502, latencyMs: 80, timedOut: false, networkError: false, errorMessage: "Bad Gateway" },
      { httpStatus: 200, latencyMs: 45, timedOut: false, networkError: false, errorMessage: null },
    ]);
    expect(result.status).toBe("success");
    expect(result.attempt).toBe(3);
  });

  it("succeeds after timeout then recovery", () => {
    const result = simulateDeliveryFlow([
      { httpStatus: null, latencyMs: 30000, timedOut: true, networkError: false, errorMessage: "Timeout" },
      { httpStatus: 200, latencyMs: 120, timedOut: false, networkError: false, errorMessage: null },
    ]);
    expect(result.status).toBe("success");
    expect(result.attempt).toBe(2);
  });

  it("dead-letters after exhausting all attempts with 500", () => {
    const responses: DeliverResult[] = Array.from({ length: 5 }, () => ({
      httpStatus: 500,
      latencyMs: 100,
      timedOut: false,
      networkError: false,
      errorMessage: "Internal Server Error",
    }));

    const result = simulateDeliveryFlow(responses);
    expect(result.status).toBe("dead_letter");
    expect(result.attempt).toBe(5);
  });

  it("dead-letters immediately on non-retryable 4xx", () => {
    const result = simulateDeliveryFlow([
      { httpStatus: 404, latencyMs: 30, timedOut: false, networkError: false, errorMessage: "Not Found" },
    ]);
    expect(result.status).toBe("dead_letter");
    expect(result.attempt).toBe(1);
  });

  it("dead-letters after exhausting retries on 429", () => {
    const responses: DeliverResult[] = Array.from({ length: 5 }, () => ({
      httpStatus: 429,
      latencyMs: 10,
      timedOut: false,
      networkError: false,
      errorMessage: "Rate Limited",
    }));

    const result = simulateDeliveryFlow(responses);
    expect(result.status).toBe("dead_letter");
    expect(result.attempt).toBe(5);
  });

  it("dead-letters after all network errors", () => {
    const responses: DeliverResult[] = Array.from({ length: 5 }, () => ({
      httpStatus: null,
      latencyMs: 0,
      timedOut: false,
      networkError: true,
      errorMessage: "ECONNREFUSED",
    }));

    const result = simulateDeliveryFlow(responses);
    expect(result.status).toBe("dead_letter");
    expect(result.attempt).toBe(5);
  });

  it("records next_retry_at for retrying deliveries", () => {
    const result = simulateDeliveryFlow([
      { httpStatus: 500, latencyMs: 100, timedOut: false, networkError: false, errorMessage: "Error" },
      /* Only 1 response provided, so loop ends at retrying state */
    ]);
    expect(result.status).toBe("retrying");
    expect(result.next_retry_at).not.toBeNull();
  });

  it("tracks latency from last attempt", () => {
    const result = simulateDeliveryFlow([
      { httpStatus: 500, latencyMs: 100, timedOut: false, networkError: false, errorMessage: "Error" },
      { httpStatus: 200, latencyMs: 42, timedOut: false, networkError: false, errorMessage: null },
    ]);
    expect(result.latency_ms).toBe(42);
  });

  it("works with custom 3-attempt policy", () => {
    const policy: RetryPolicy = {
      max_attempts: 3,
      base_delay_ms: 1_000,
      max_delay_ms: 10_000,
      jitter_factor: 0,
    };

    const responses: DeliverResult[] = Array.from({ length: 3 }, () => ({
      httpStatus: 503,
      latencyMs: 50,
      timedOut: false,
      networkError: false,
      errorMessage: "Service Unavailable",
    }));

    const result = simulateDeliveryFlow(responses, policy);
    expect(result.status).toBe("dead_letter");
    expect(result.attempt).toBe(3);
  });
});

describe("Worker — Retry scheduling timestamps", () => {
  it("next_retry_at increases with each attempt", () => {
    const policy: RetryPolicy = {
      max_attempts: 5,
      base_delay_ms: 1_000,
      max_delay_ms: 100_000,
      jitter_factor: 0,
    };
    const noJitter = () => 0.5;

    const delays: number[] = [];
    for (let attempt = 1; attempt <= 4; attempt++) {
      delays.push(calculateRetryDelay(attempt, policy, noJitter));
    }

    /* Each delay should be greater than the previous */
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it("retry timestamps are in the future", () => {
    const now = Date.now();
    const delay = calculateRetryDelay(1, DEFAULT_POLICY, () => 0.5);
    const retryAt = new Date(now + delay);
    expect(retryAt.getTime()).toBeGreaterThan(now);
  });
});
