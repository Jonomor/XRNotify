import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import crypto from "node:crypto";

/* ------------------------------------------------------------------ */
/*  Mock infrastructure                                                */
/* ------------------------------------------------------------------ */

/**
 * In-memory stores that simulate Postgres + Redis for isolated tests.
 * In a real CI pipeline you'd use testcontainers or a test DB.
 */

interface StoredWebhook {
  id: string;
  tenant_id: string;
  url: string;
  description: string;
  event_types: string[];
  active: boolean;
  secret_hash: string;
  secret_last4: string;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface StoredApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  scopes: string[];
  active: boolean;
}

const webhookStore: Map<string, StoredWebhook> = new Map();
const apiKeyStore: Map<string, StoredApiKey> = new Map();

const TEST_TENANT_ID = "tn_test_001";
const TEST_API_KEY = "xrn_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
const TEST_API_KEY_HASH = crypto.createHash("sha256").update(TEST_API_KEY).digest("hex");

/* ------------------------------------------------------------------ */
/*  Build test server                                                  */
/* ------------------------------------------------------------------ */

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  /* --- Auth middleware --- */
  app.addHook("preHandler", async (req, reply) => {
    const key = req.headers["x-xrnotify-key"] as string | undefined;
    if (!key) {
      return reply.status(401).send({ error: "unauthorized", message: "Missing API key" });
    }

    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const found = [...apiKeyStore.values()].find(
      (k) => k.key_hash === hash && k.active,
    );

    if (!found) {
      return reply.status(401).send({ error: "unauthorized", message: "Invalid API key" });
    }

    (req as any).tenantId = found.tenant_id;
    (req as any).scopes = found.scopes;
  });

  /* --- POST /v1/webhooks --- */
  app.post("/v1/webhooks", async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const body = req.body as any;

    /* Validation */
    if (!body || !body.url || typeof body.url !== "string") {
      return reply.status(400).send({ error: "validation_error", message: "url is required" });
    }

    if (!body.event_types || !Array.isArray(body.event_types) || body.event_types.length === 0) {
      return reply.status(400).send({ error: "validation_error", message: "event_types is required and must be a non-empty array" });
    }

    /* URL validation */
    let parsed: URL;
    try {
      parsed = new URL(body.url);
    } catch {
      return reply.status(400).send({ error: "validation_error", message: "Invalid URL format" });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return reply.status(400).send({ error: "validation_error", message: "URL must use http or https" });
    }

    /* SSRF protection */
    const host = parsed.hostname;
    const blocked = [
      "localhost", "127.0.0.1", "0.0.0.0", "::1",
    ];
    const blockedPrefixes = ["10.", "192.168.", "172.16.", "172.17.", "172.18.",
      "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
      "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."];

    if (blocked.includes(host) || blockedPrefixes.some((p) => host.startsWith(p))) {
      return reply.status(400).send({ error: "validation_error", message: "Private/localhost URLs are not allowed" });
    }

    /* Valid event types */
    const validTypes = new Set([
      "payment", "trustset", "nft.mint", "nft.burn", "nft.accept_offer",
      "offer.create", "offer.cancel", "account.set", "account.delete",
    ]);
    for (const t of body.event_types) {
      if (!validTypes.has(t)) {
        return reply.status(400).send({ error: "validation_error", message: `Invalid event type: ${t}` });
      }
    }

    /* Create */
    const id = `wh_${crypto.randomBytes(8).toString("hex")}`;
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex");
    const now = new Date().toISOString();

    const webhook: StoredWebhook = {
      id,
      tenant_id: tenantId,
      url: body.url,
      description: body.description ?? "",
      event_types: body.event_types,
      active: body.active !== false,
      secret_hash: secretHash,
      secret_last4: secret.slice(-4),
      metadata: body.metadata ?? {},
      created_at: now,
      updated_at: now,
    };

    webhookStore.set(id, webhook);

    return reply.status(201).send({
      id: webhook.id,
      url: webhook.url,
      description: webhook.description,
      event_types: webhook.event_types,
      active: webhook.active,
      secret,
      secret_last4: webhook.secret_last4,
      metadata: webhook.metadata,
      created_at: webhook.created_at,
      updated_at: webhook.updated_at,
    });
  });

  /* --- GET /v1/webhooks --- */
  app.get("/v1/webhooks", async (req) => {
    const tenantId = (req as any).tenantId;
    const query = req.query as any;
    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page ?? "50", 10)));

    const all = [...webhookStore.values()].filter((w) => w.tenant_id === tenantId);
    const start = (page - 1) * perPage;
    const slice = all.slice(start, start + perPage);

    return {
      webhooks: slice.map((w) => ({
        id: w.id,
        url: w.url,
        description: w.description,
        event_types: w.event_types,
        active: w.active,
        secret_last4: w.secret_last4,
        metadata: w.metadata,
        created_at: w.created_at,
        updated_at: w.updated_at,
      })),
      total: all.length,
      page,
      per_page: perPage,
    };
  });

  /* --- GET /v1/webhooks/:id --- */
  app.get("/v1/webhooks/:id", async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as any;
    const wh = webhookStore.get(id);

    if (!wh || wh.tenant_id !== tenantId) {
      return reply.status(404).send({ error: "not_found", message: "Webhook not found" });
    }

    return {
      id: wh.id,
      url: wh.url,
      description: wh.description,
      event_types: wh.event_types,
      active: wh.active,
      secret_last4: wh.secret_last4,
      metadata: wh.metadata,
      created_at: wh.created_at,
      updated_at: wh.updated_at,
    };
  });

  /* --- PATCH /v1/webhooks/:id --- */
  app.patch("/v1/webhooks/:id", async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as any;
    const body = req.body as any;
    const wh = webhookStore.get(id);

    if (!wh || wh.tenant_id !== tenantId) {
      return reply.status(404).send({ error: "not_found", message: "Webhook not found" });
    }

    if (body.url !== undefined) wh.url = body.url;
    if (body.description !== undefined) wh.description = body.description;
    if (body.event_types !== undefined) wh.event_types = body.event_types;
    if (body.active !== undefined) wh.active = body.active;
    if (body.metadata !== undefined) wh.metadata = body.metadata;
    wh.updated_at = new Date().toISOString();

    webhookStore.set(id, wh);

    return {
      id: wh.id,
      url: wh.url,
      description: wh.description,
      event_types: wh.event_types,
      active: wh.active,
      secret_last4: wh.secret_last4,
      metadata: wh.metadata,
      created_at: wh.created_at,
      updated_at: wh.updated_at,
    };
  });

  /* --- DELETE /v1/webhooks/:id --- */
  app.delete("/v1/webhooks/:id", async (req, reply) => {
    const tenantId = (req as any).tenantId;
    const { id } = req.params as any;
    const wh = webhookStore.get(id);

    if (!wh || wh.tenant_id !== tenantId) {
      return reply.status(404).send({ error: "not_found", message: "Webhook not found" });
    }

    webhookStore.delete(id);
    return reply.status(204).send();
  });

  return app;
}

/* ------------------------------------------------------------------ */
/*  Test suite                                                         */
/* ------------------------------------------------------------------ */

let app: FastifyInstance;

const headers = {
  "Content-Type": "application/json",
  "X-XRNotify-Key": TEST_API_KEY,
};

beforeAll(async () => {
  /* Seed API key */
  apiKeyStore.set("key_test_001", {
    id: "key_test_001",
    tenant_id: TEST_TENANT_ID,
    key_hash: TEST_API_KEY_HASH,
    scopes: ["webhooks:read", "webhooks:write"],
    active: true,
  });

  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  webhookStore.clear();
});

/* ================================================================== */
/*  Authentication                                                     */
/* ================================================================== */

describe("Authentication", () => {
  it("rejects requests without API key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/webhooks",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("unauthorized");
  });

  it("rejects requests with invalid API key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/webhooks",
      headers: { "X-XRNotify-Key": "xrn_invalid_key" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts requests with valid API key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/webhooks",
      headers,
    });
    expect(res.statusCode).toBe(200);
  });
});

/* ================================================================== */
/*  POST /v1/webhooks — Create                                        */
/* ================================================================== */

describe("POST /v1/webhooks", () => {
  const validPayload = {
    url: "https://example.com/webhook",
    event_types: ["payment"],
    description: "Test webhook",
  };

  it("creates a webhook and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: validPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toMatch(/^wh_/);
    expect(body.url).toBe(validPayload.url);
    expect(body.event_types).toEqual(["payment"]);
    expect(body.active).toBe(true);
    expect(body.description).toBe("Test webhook");
  });

  it("returns the signing secret only at creation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: validPayload,
    });

    const body = res.json();
    expect(body.secret).toMatch(/^whsec_/);
    expect(body.secret_last4).toHaveLength(4);

    /* GET should NOT return the secret */
    const getRes = await app.inject({
      method: "GET",
      url: `/v1/webhooks/${body.id}`,
      headers,
    });
    const getBody = getRes.json();
    expect(getBody.secret).toBeUndefined();
    expect(getBody.secret_last4).toBe(body.secret_last4);
  });

  it("defaults active to true", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook", event_types: ["payment"] },
    });
    expect(res.json().active).toBe(true);
  });

  it("allows setting active to false", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { ...validPayload, active: false },
    });
    expect(res.json().active).toBe(false);
  });

  it("accepts multiple event types", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: {
        ...validPayload,
        event_types: ["payment", "nft.mint", "offer.create"],
      },
    });
    expect(res.json().event_types).toEqual(["payment", "nft.mint", "offer.create"]);
  });

  it("accepts metadata", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { ...validPayload, metadata: { env: "production", team: "backend" } },
    });
    expect(res.json().metadata).toEqual({ env: "production", team: "backend" });
  });

  /* ---- Validation errors ---- */

  it("rejects missing url", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { event_types: ["payment"] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("validation_error");
  });

  it("rejects missing event_types", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects empty event_types array", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook", event_types: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid event type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook", event_types: ["invalid_type"] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("invalid_type");
  });

  it("rejects invalid URL format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "not-a-url", event_types: ["payment"] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects ftp:// URLs", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "ftp://example.com/hook", event_types: ["payment"] },
    });
    expect(res.statusCode).toBe(400);
  });
});

/* ================================================================== */
/*  SSRF Protection                                                    */
/* ================================================================== */

describe("SSRF Protection", () => {
  const ssrfPayload = (url: string) => ({
    url,
    event_types: ["payment"],
  });

  it("blocks localhost", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://localhost/hook"),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/private|localhost/i);
  });

  it("blocks 127.0.0.1", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://127.0.0.1/hook"),
    });
    expect(res.statusCode).toBe(400);
  });

  it("blocks 10.x.x.x", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://10.0.0.1/hook"),
    });
    expect(res.statusCode).toBe(400);
  });

  it("blocks 192.168.x.x", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://192.168.1.1/hook"),
    });
    expect(res.statusCode).toBe(400);
  });

  it("blocks 172.16.x.x", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://172.16.0.1/hook"),
    });
    expect(res.statusCode).toBe(400);
  });

  it("blocks 0.0.0.0", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://0.0.0.0/hook"),
    });
    expect(res.statusCode).toBe(400);
  });

  it("blocks ::1 (IPv6 loopback)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://[::1]/hook"),
    });
    expect(res.statusCode).toBe(400);
  });

  it("allows public URLs", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: ssrfPayload("https://api.example.com/webhook"),
    });
    expect(res.statusCode).toBe(201);
  });
});

/* ================================================================== */
/*  GET /v1/webhooks — List                                            */
/* ================================================================== */

describe("GET /v1/webhooks", () => {
  it("returns empty list when no webhooks exist", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/webhooks", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().webhooks).toEqual([]);
    expect(res.json().total).toBe(0);
  });

  it("returns created webhooks", async () => {
    /* Create 2 webhooks */
    await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://a.com/hook", event_types: ["payment"] },
    });
    await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://b.com/hook", event_types: ["nft.mint"] },
    });

    const res = await app.inject({ method: "GET", url: "/v1/webhooks", headers });
    expect(res.json().webhooks).toHaveLength(2);
    expect(res.json().total).toBe(2);
  });

  it("does not expose signing secret in list", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://a.com/hook", event_types: ["payment"] },
    });

    const res = await app.inject({ method: "GET", url: "/v1/webhooks", headers });
    const wh = res.json().webhooks[0];
    expect(wh.secret).toBeUndefined();
    expect(wh.secret_hash).toBeUndefined();
    expect(wh.secret_last4).toBeDefined();
  });

  it("paginates results", async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/v1/webhooks",
        headers,
        payload: { url: `https://example${i}.com/hook`, event_types: ["payment"] },
      });
    }

    const page1 = await app.inject({
      method: "GET",
      url: "/v1/webhooks?page=1&per_page=2",
      headers,
    });
    expect(page1.json().webhooks).toHaveLength(2);
    expect(page1.json().total).toBe(5);
    expect(page1.json().page).toBe(1);

    const page3 = await app.inject({
      method: "GET",
      url: "/v1/webhooks?page=3&per_page=2",
      headers,
    });
    expect(page3.json().webhooks).toHaveLength(1);
  });
});

/* ================================================================== */
/*  GET /v1/webhooks/:id — Get single                                  */
/* ================================================================== */

describe("GET /v1/webhooks/:id", () => {
  it("returns a webhook by ID", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook", event_types: ["payment"], description: "Test" },
    });
    const { id } = createRes.json();

    const res = await app.inject({ method: "GET", url: `/v1/webhooks/${id}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
    expect(res.json().description).toBe("Test");
  });

  it("returns 404 for nonexistent ID", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/webhooks/wh_nonexistent",
      headers,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_found");
  });
});

/* ================================================================== */
/*  PATCH /v1/webhooks/:id — Update                                    */
/* ================================================================== */

describe("PATCH /v1/webhooks/:id", () => {
  let webhookId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: {
        url: "https://example.com/hook",
        event_types: ["payment"],
        description: "Original",
        active: true,
      },
    });
    webhookId = res.json().id;
  });

  it("updates description", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/webhooks/${webhookId}`,
      headers,
      payload: { description: "Updated" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe("Updated");
  });

  it("updates url", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/webhooks/${webhookId}`,
      headers,
      payload: { url: "https://new-endpoint.com/hook" },
    });
    expect(res.json().url).toBe("https://new-endpoint.com/hook");
  });

  it("toggles active state", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/webhooks/${webhookId}`,
      headers,
      payload: { active: false },
    });
    expect(res.json().active).toBe(false);
  });

  it("updates event_types", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/webhooks/${webhookId}`,
      headers,
      payload: { event_types: ["payment", "nft.mint", "trustset"] },
    });
    expect(res.json().event_types).toEqual(["payment", "nft.mint", "trustset"]);
  });

  it("updates metadata", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/webhooks/${webhookId}`,
      headers,
      payload: { metadata: { env: "staging" } },
    });
    expect(res.json().metadata).toEqual({ env: "staging" });
  });

  it("returns 404 for nonexistent webhook", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/v1/webhooks/wh_nonexistent",
      headers,
      payload: { active: false },
    });
    expect(res.statusCode).toBe(404);
  });

  it("updates updated_at timestamp", async () => {
    const before = await app.inject({
      method: "GET",
      url: `/v1/webhooks/${webhookId}`,
      headers,
    });
    const beforeTime = before.json().updated_at;

    /* Small delay to ensure timestamp differs */
    await new Promise((r) => setTimeout(r, 10));

    await app.inject({
      method: "PATCH",
      url: `/v1/webhooks/${webhookId}`,
      headers,
      payload: { description: "Changed" },
    });

    const after = await app.inject({
      method: "GET",
      url: `/v1/webhooks/${webhookId}`,
      headers,
    });
    expect(after.json().updated_at).not.toBe(beforeTime);
  });
});

/* ================================================================== */
/*  DELETE /v1/webhooks/:id                                            */
/* ================================================================== */

describe("DELETE /v1/webhooks/:id", () => {
  it("deletes a webhook and returns 204", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook", event_types: ["payment"] },
    });
    const { id } = createRes.json();

    const delRes = await app.inject({
      method: "DELETE",
      url: `/v1/webhooks/${id}`,
      headers,
    });
    expect(delRes.statusCode).toBe(204);

    /* Verify it's gone */
    const getRes = await app.inject({
      method: "GET",
      url: `/v1/webhooks/${id}`,
      headers,
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("returns 404 for nonexistent webhook", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/webhooks/wh_nonexistent",
      headers,
    });
    expect(res.statusCode).toBe(404);
  });

  it("removes webhook from list", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://example.com/hook", event_types: ["payment"] },
    });
    const { id } = createRes.json();

    await app.inject({ method: "DELETE", url: `/v1/webhooks/${id}`, headers });

    const listRes = await app.inject({ method: "GET", url: "/v1/webhooks", headers });
    expect(listRes.json().webhooks).toHaveLength(0);
    expect(listRes.json().total).toBe(0);
  });
});

/* ================================================================== */
/*  Tenant isolation                                                   */
/* ================================================================== */

describe("Tenant isolation", () => {
  const OTHER_KEY = "xrn_test_other_tenant_key_z9y8x7w6v5u4";
  const OTHER_KEY_HASH = crypto.createHash("sha256").update(OTHER_KEY).digest("hex");

  beforeAll(() => {
    apiKeyStore.set("key_other_001", {
      id: "key_other_001",
      tenant_id: "tn_other_002",
      key_hash: OTHER_KEY_HASH,
      scopes: ["webhooks:read", "webhooks:write"],
      active: true,
    });
  });

  it("cannot see another tenant's webhooks", async () => {
    /* Tenant 1 creates a webhook */
    await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://tenant1.com/hook", event_types: ["payment"] },
    });

    /* Tenant 2 lists — should be empty */
    const res = await app.inject({
      method: "GET",
      url: "/v1/webhooks",
      headers: { ...headers, "X-XRNotify-Key": OTHER_KEY },
    });
    expect(res.json().webhooks).toHaveLength(0);
  });

  it("cannot access another tenant's webhook by ID", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://tenant1.com/hook", event_types: ["payment"] },
    });
    const { id } = createRes.json();

    const res = await app.inject({
      method: "GET",
      url: `/v1/webhooks/${id}`,
      headers: { ...headers, "X-XRNotify-Key": OTHER_KEY },
    });
    expect(res.statusCode).toBe(404);
  });

  it("cannot delete another tenant's webhook", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers,
      payload: { url: "https://tenant1.com/hook", event_types: ["payment"] },
    });
    const { id } = createRes.json();

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/webhooks/${id}`,
      headers: { ...headers, "X-XRNotify-Key": OTHER_KEY },
    });
    expect(res.statusCode).toBe(404);

    /* Still exists for original tenant */
    const getRes = await app.inject({
      method: "GET",
      url: `/v1/webhooks/${id}`,
      headers,
    });
    expect(getRes.statusCode).toBe(200);
  });
});
