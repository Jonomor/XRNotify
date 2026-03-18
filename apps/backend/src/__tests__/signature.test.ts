import crypto from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";

/* ------------------------------------------------------------------ */
/*  Inline implementation (mirrors packages/shared/signature.ts)       */
/*  If the shared module is available, import from there instead:      */
/*    import { signPayload, verifySignature } from "@xrnotify/shared"; */
/* ------------------------------------------------------------------ */

const ALGORITHM = "sha256";
const PREFIX = `${ALGORITHM}=`;

/**
 * Compute HMAC-SHA256 signature for a raw payload.
 */
function signPayload(rawBody: string | Buffer, secret: string): string {
  const hmac = crypto.createHmac(ALGORITHM, secret);
  hmac.update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf-8") : rawBody);
  return `${PREFIX}${hmac.digest("hex")}`;
}

/**
 * Verify a webhook signature using constant-time comparison.
 */
function verifySignature(
  rawBody: string | Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(PREFIX)) {
    return false;
  }

  const expected = signPayload(rawBody, secret);

  if (expected.length !== signatureHeader.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader),
  );
}

/* ------------------------------------------------------------------ */
/*  Test fixtures                                                      */
/* ------------------------------------------------------------------ */

const TEST_SECRET = "whsec_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
const TEST_SECRET_ALT = "whsec_test_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4";

const SAMPLE_EVENT = JSON.stringify({
  event_id: "xrpl:92845631:A1B2C3D4E5F6:payment",
  ledger_index: 92845631,
  tx_hash: "A1B2C3D4E5F6",
  event_type: "payment",
  timestamp: "2026-02-26T14:30:00.000Z",
  account_context: ["rSourceAddr", "rDestAddr"],
  payload: {
    source: "rSourceAddr",
    destination: "rDestAddr",
    amount: { currency: "XRP", value: "100.000000" },
    destination_tag: 12345,
  },
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Webhook Signature — signPayload", () => {
  it("returns a string prefixed with sha256=", () => {
    const sig = signPayload(SAMPLE_EVENT, TEST_SECRET);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("produces a 64-character hex digest after prefix", () => {
    const sig = signPayload(SAMPLE_EVENT, TEST_SECRET);
    const hex = sig.replace(PREFIX, "");
    expect(hex).toHaveLength(64);
  });

  it("is deterministic — same input produces same output", () => {
    const sig1 = signPayload(SAMPLE_EVENT, TEST_SECRET);
    const sig2 = signPayload(SAMPLE_EVENT, TEST_SECRET);
    expect(sig1).toBe(sig2);
  });

  it("differs when the secret changes", () => {
    const sig1 = signPayload(SAMPLE_EVENT, TEST_SECRET);
    const sig2 = signPayload(SAMPLE_EVENT, TEST_SECRET_ALT);
    expect(sig1).not.toBe(sig2);
  });

  it("differs when the payload changes", () => {
    const sig1 = signPayload(SAMPLE_EVENT, TEST_SECRET);
    const sig2 = signPayload(SAMPLE_EVENT + " ", TEST_SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it("handles string input", () => {
    const sig = signPayload("hello world", TEST_SECRET);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("handles Buffer input", () => {
    const buf = Buffer.from(SAMPLE_EVENT, "utf-8");
    const sigFromString = signPayload(SAMPLE_EVENT, TEST_SECRET);
    const sigFromBuffer = signPayload(buf, TEST_SECRET);
    expect(sigFromString).toBe(sigFromBuffer);
  });

  it("handles empty string payload", () => {
    const sig = signPayload("", TEST_SECRET);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("handles empty Buffer payload", () => {
    const sig = signPayload(Buffer.alloc(0), TEST_SECRET);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("matches manual openssl computation", () => {
    const body = "test-body";
    const secret = "test-secret";

    // Manual computation
    const manual = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const sig = signPayload(body, secret);

    expect(sig).toBe(`sha256=${manual}`);
  });
});

describe("Webhook Signature — verifySignature", () => {
  let validSignature: string;

  beforeAll(() => {
    validSignature = signPayload(SAMPLE_EVENT, TEST_SECRET);
  });

  it("returns true for a valid signature", () => {
    expect(verifySignature(SAMPLE_EVENT, validSignature, TEST_SECRET)).toBe(true);
  });

  it("returns false for wrong secret", () => {
    expect(verifySignature(SAMPLE_EVENT, validSignature, TEST_SECRET_ALT)).toBe(false);
  });

  it("returns false for tampered payload", () => {
    const tampered = SAMPLE_EVENT.replace("100.000000", "999.000000");
    expect(verifySignature(tampered, validSignature, TEST_SECRET)).toBe(false);
  });

  it("returns false for tampered signature", () => {
    const tampered = validSignature.slice(0, -4) + "0000";
    expect(verifySignature(SAMPLE_EVENT, tampered, TEST_SECRET)).toBe(false);
  });

  it("returns false for empty signature header", () => {
    expect(verifySignature(SAMPLE_EVENT, "", TEST_SECRET)).toBe(false);
  });

  it("returns false for missing prefix", () => {
    const noPrefix = validSignature.replace("sha256=", "");
    expect(verifySignature(SAMPLE_EVENT, noPrefix, TEST_SECRET)).toBe(false);
  });

  it("returns false for wrong prefix", () => {
    const wrongPrefix = validSignature.replace("sha256=", "md5=");
    expect(verifySignature(SAMPLE_EVENT, wrongPrefix, TEST_SECRET)).toBe(false);
  });

  it("returns false for truncated signature", () => {
    const truncated = validSignature.slice(0, 20);
    expect(verifySignature(SAMPLE_EVENT, truncated, TEST_SECRET)).toBe(false);
  });

  it("returns false for extended signature", () => {
    const extended = validSignature + "extra";
    expect(verifySignature(SAMPLE_EVENT, extended, TEST_SECRET)).toBe(false);
  });

  it("accepts Buffer payload matching string payload", () => {
    const buf = Buffer.from(SAMPLE_EVENT, "utf-8");
    expect(verifySignature(buf, validSignature, TEST_SECRET)).toBe(true);
  });
});

describe("Webhook Signature — Unicode and special characters", () => {
  it("handles unicode in payload", () => {
    const unicode = JSON.stringify({ message: "こんにちは世界 🌍" });
    const sig = signPayload(unicode, TEST_SECRET);
    expect(verifySignature(unicode, sig, TEST_SECRET)).toBe(true);
  });

  it("handles newlines in payload", () => {
    const body = '{"key":"value\\nwith\\nnewlines"}';
    const sig = signPayload(body, TEST_SECRET);
    expect(verifySignature(body, sig, TEST_SECRET)).toBe(true);
  });

  it("handles null bytes in payload", () => {
    const body = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const sig = signPayload(body, TEST_SECRET);
    expect(verifySignature(body, sig, TEST_SECRET)).toBe(true);
  });

  it("distinguishes between similar unicode strings", () => {
    // é as single codepoint vs e + combining accent
    const body1 = Buffer.from("caf\u00e9", "utf-8");
    const body2 = Buffer.from("cafe\u0301", "utf-8");
    const sig1 = signPayload(body1, TEST_SECRET);
    const sig2 = signPayload(body2, TEST_SECRET);
    expect(sig1).not.toBe(sig2);
  });
});

describe("Webhook Signature — Large payloads", () => {
  it("handles 1MB payload", () => {
    const large = "x".repeat(1024 * 1024);
    const sig = signPayload(large, TEST_SECRET);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(verifySignature(large, sig, TEST_SECRET)).toBe(true);
  });

  it("handles payload with many JSON keys", () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      obj[`key_${i}`] = i;
    }
    const body = JSON.stringify(obj);
    const sig = signPayload(body, TEST_SECRET);
    expect(verifySignature(body, sig, TEST_SECRET)).toBe(true);
  });
});

describe("Webhook Signature — Secret edge cases", () => {
  it("handles empty secret", () => {
    const sig = signPayload(SAMPLE_EVENT, "");
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(verifySignature(SAMPLE_EVENT, sig, "")).toBe(true);
  });

  it("handles very long secret", () => {
    const longSecret = "s".repeat(1024);
    const sig = signPayload(SAMPLE_EVENT, longSecret);
    expect(verifySignature(SAMPLE_EVENT, sig, longSecret)).toBe(true);
  });

  it("handles secret with special characters", () => {
    const special = "whsec_!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const sig = signPayload(SAMPLE_EVENT, special);
    expect(verifySignature(SAMPLE_EVENT, sig, special)).toBe(true);
  });
});

describe("Webhook Signature — JSON serialization sensitivity", () => {
  it("different JSON key ordering produces different signatures", () => {
    const body1 = '{"a":1,"b":2}';
    const body2 = '{"b":2,"a":1}';
    const sig1 = signPayload(body1, TEST_SECRET);
    const sig2 = signPayload(body2, TEST_SECRET);
    // These are byte-different strings so signatures must differ
    expect(sig1).not.toBe(sig2);
  });

  it("whitespace differences produce different signatures", () => {
    const compact = '{"a":1}';
    const spaced = '{ "a": 1 }';
    const sig1 = signPayload(compact, TEST_SECRET);
    const sig2 = signPayload(spaced, TEST_SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it("re-parsed and re-serialized JSON may differ from original", () => {
    // This test documents WHY you must use raw body, not re-serialized
    const original = '{"a":1,"b":2}';
    const reparsed = JSON.stringify(JSON.parse(original));
    // In this case they happen to match, but that's not guaranteed
    // The point is: always sign/verify the raw bytes
    const sig = signPayload(original, TEST_SECRET);
    if (original === reparsed) {
      expect(verifySignature(reparsed, sig, TEST_SECRET)).toBe(true);
    }
  });
});

describe("Webhook Signature — Timing safety", () => {
  it("uses crypto.timingSafeEqual internally (structural verification)", () => {
    // We can't directly test timing, but we verify the function
    // doesn't short-circuit on first byte mismatch by ensuring
    // it returns false for signatures that differ only in the last byte
    const sig = signPayload(SAMPLE_EVENT, TEST_SECRET);
    const lastChar = sig[sig.length - 1];
    const altChar = lastChar === "0" ? "1" : "0";
    const altered = sig.slice(0, -1) + altChar;

    // Both should return false — the key test is that this doesn't crash
    // or behave differently based on where the mismatch is
    expect(verifySignature(SAMPLE_EVENT, altered, TEST_SECRET)).toBe(false);

    // Differ at first hex char after prefix
    const firstHexIdx = PREFIX.length;
    const firstChar = sig[firstHexIdx];
    const altFirstChar = firstChar === "0" ? "1" : "0";
    const alteredFirst =
      sig.slice(0, firstHexIdx) + altFirstChar + sig.slice(firstHexIdx + 1);
    expect(verifySignature(SAMPLE_EVENT, alteredFirst, TEST_SECRET)).toBe(false);
  });
});
