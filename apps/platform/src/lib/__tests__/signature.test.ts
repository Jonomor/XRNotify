// =============================================================================
// XRNotify Platform - Signature Tests
// =============================================================================
// Tests for HMAC signature generation and verification
// =============================================================================

import { describe, it, expect } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import {
  signPayload,
  verifySignature,
  generateSecret,
  generateApiKey,
  hashApiKey,
  API_KEY_PREFIX,
  WEBHOOK_SECRET_PREFIX,
} from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Test Data
// -----------------------------------------------------------------------------

const TEST_SECRET = 'whsec_dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdHM';
const TEST_PAYLOAD = JSON.stringify({
  event_id: 'xrpl:12345678:ABCD1234:payment.xrp',
  event_type: 'payment.xrp',
  timestamp: '2024-01-15T10:30:00.000Z',
  payload: {
    account: 'rTestAccount123456789012345678901',
    destination: 'rDestAccount123456789012345678901',
    amount: '1000000',
    currency: 'XRP',
  },
});

// -----------------------------------------------------------------------------
// signPayload Tests
// -----------------------------------------------------------------------------

describe('signPayload', () => {
  it('should generate a valid HMAC-SHA256 signature', () => {
    const signature = signPayload(TEST_PAYLOAD, TEST_SECRET);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should generate consistent signatures for same input', () => {
    const sig1 = signPayload(TEST_PAYLOAD, TEST_SECRET);
    const sig2 = signPayload(TEST_PAYLOAD, TEST_SECRET);
    
    expect(sig1).toBe(sig2);
  });

  it('should generate different signatures for different payloads', () => {
    const payload2 = JSON.stringify({ different: 'payload' });
    
    const sig1 = signPayload(TEST_PAYLOAD, TEST_SECRET);
    const sig2 = signPayload(payload2, TEST_SECRET);
    
    expect(sig1).not.toBe(sig2);
  });

  it('should generate different signatures for different secrets', () => {
    const secret2 = 'whsec_YW5vdGhlci10ZXN0LXNlY3JldA';
    
    const sig1 = signPayload(TEST_PAYLOAD, TEST_SECRET);
    const sig2 = signPayload(TEST_PAYLOAD, secret2);
    
    expect(sig1).not.toBe(sig2);
  });

  it('should handle empty payload', () => {
    const signature = signPayload('', TEST_SECRET);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should handle unicode characters in payload', () => {
    const unicodePayload = JSON.stringify({ message: '你好世界 🌍' });
    const signature = signPayload(unicodePayload, TEST_SECRET);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should match manual HMAC calculation', () => {
    const expectedHmac = createHmac('sha256', TEST_SECRET)
      .update(TEST_PAYLOAD)
      .digest('hex');
    
    const signature = signPayload(TEST_PAYLOAD, TEST_SECRET);
    
    expect(signature).toBe(`sha256=${expectedHmac}`);
  });
});

// -----------------------------------------------------------------------------
// verifySignature Tests
// -----------------------------------------------------------------------------

describe('verifySignature', () => {
  it('should verify valid signature', () => {
    const signature = signPayload(TEST_PAYLOAD, TEST_SECRET);
    const isValid = verifySignature(TEST_PAYLOAD, signature, TEST_SECRET);
    
    expect(isValid).toBe(true);
  });

  it('should reject invalid signature', () => {
    const isValid = verifySignature(
      TEST_PAYLOAD,
      'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      TEST_SECRET
    );
    
    expect(isValid).toBe(false);
  });

  it('should reject tampered payload', () => {
    const signature = signPayload(TEST_PAYLOAD, TEST_SECRET);
    const tamperedPayload = TEST_PAYLOAD.replace('1000000', '9999999');
    
    const isValid = verifySignature(tamperedPayload, signature, TEST_SECRET);
    
    expect(isValid).toBe(false);
  });

  it('should reject wrong secret', () => {
    const signature = signPayload(TEST_PAYLOAD, TEST_SECRET);
    const wrongSecret = 'whsec_d3JvbmctdGVzdC1zZWNyZXQ';
    
    const isValid = verifySignature(TEST_PAYLOAD, signature, wrongSecret);
    
    expect(isValid).toBe(false);
  });

  it('should reject malformed signature', () => {
    const isValid = verifySignature(TEST_PAYLOAD, 'not-a-valid-signature', TEST_SECRET);
    
    expect(isValid).toBe(false);
  });

  it('should reject signature without prefix', () => {
    const rawHmac = createHmac('sha256', TEST_SECRET)
      .update(TEST_PAYLOAD)
      .digest('hex');
    
    const isValid = verifySignature(TEST_PAYLOAD, rawHmac, TEST_SECRET);
    
    expect(isValid).toBe(false);
  });

  it('should be timing-safe (constant time comparison)', () => {
    // This test verifies the function uses timing-safe comparison
    // by checking it doesn't return early on first byte mismatch
    const signature = signPayload(TEST_PAYLOAD, TEST_SECRET);
    
    // Create signatures that differ at different positions
    const wrongSig1 = 'sha256=0' + signature.slice(8);
    const wrongSig2 = signature.slice(0, -1) + '0';
    
    // Both should take similar time (we can't easily measure this in a unit test,
    // but we verify both return false correctly)
    expect(verifySignature(TEST_PAYLOAD, wrongSig1, TEST_SECRET)).toBe(false);
    expect(verifySignature(TEST_PAYLOAD, wrongSig2, TEST_SECRET)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// generateSecret Tests
// -----------------------------------------------------------------------------

describe('generateSecret', () => {
  it('should generate secret with correct prefix', () => {
    const secret = generateSecret();
    
    expect(secret.startsWith(WEBHOOK_SECRET_PREFIX)).toBe(true);
  });

  it('should generate unique secrets', () => {
    const secrets = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      secrets.add(generateSecret());
    }
    
    expect(secrets.size).toBe(100);
  });

  it('should generate secrets of consistent length', () => {
    const secrets = Array.from({ length: 10 }, () => generateSecret());
    const lengths = new Set(secrets.map(s => s.length));
    
    expect(lengths.size).toBe(1);
  });

  it('should generate URL-safe base64 characters', () => {
    const secret = generateSecret();
    const base64Part = secret.slice(WEBHOOK_SECRET_PREFIX.length);
    
    // URL-safe base64 should not contain +, /, or =
    expect(base64Part).not.toMatch(/[+/=]/);
  });
});

// -----------------------------------------------------------------------------
// generateApiKey Tests
// -----------------------------------------------------------------------------

describe('generateApiKey', () => {
  it('should generate API key with correct prefix', () => {
    const apiKey = generateApiKey();
    
    expect(apiKey.startsWith(API_KEY_PREFIX)).toBe(true);
  });

  it('should generate unique API keys', () => {
    const keys = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey());
    }
    
    expect(keys.size).toBe(100);
  });

  it('should generate API keys of consistent length', () => {
    const keys = Array.from({ length: 10 }, () => generateApiKey());
    const lengths = new Set(keys.map(k => k.length));
    
    expect(lengths.size).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// hashApiKey Tests
// -----------------------------------------------------------------------------

describe('hashApiKey', () => {
  it('should generate SHA-256 hash with prefix', () => {
    const apiKey = generateApiKey();
    const hash = hashApiKey(apiKey);
    
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should generate consistent hash for same key', () => {
    const apiKey = generateApiKey();
    const hash1 = hashApiKey(apiKey);
    const hash2 = hashApiKey(apiKey);
    
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    
    const hash1 = hashApiKey(key1);
    const hash2 = hashApiKey(key2);
    
    expect(hash1).not.toBe(hash2);
  });

  it('should be irreversible (one-way function)', () => {
    // We can only verify the hash format is correct and consistent
    // The irreversibility is inherent to SHA-256
    const apiKey = generateApiKey();
    const hash = hashApiKey(apiKey);
    
    // Hash should not contain the original key
    expect(hash).not.toContain(apiKey);
    expect(hash).not.toContain(apiKey.slice(API_KEY_PREFIX.length));
  });
});

// -----------------------------------------------------------------------------
// Integration Tests
// -----------------------------------------------------------------------------

describe('Signature Integration', () => {
  it('should work end-to-end with generated secret', () => {
    const secret = generateSecret();
    const payload = JSON.stringify({ test: 'data', timestamp: Date.now() });
    
    const signature = signPayload(payload, secret);
    const isValid = verifySignature(payload, signature, secret);
    
    expect(isValid).toBe(true);
  });

  it('should handle realistic webhook payload', () => {
    const secret = generateSecret();
    const payload = JSON.stringify({
      event_id: `xrpl:${Date.now()}:${randomBytes(16).toString('hex')}:payment.xrp`,
      event_type: 'payment.xrp',
      timestamp: new Date().toISOString(),
      payload: {
        account: 'rN7n3473SaZBCG4dFL83w7a1RXtXtbk2D9',
        destination: 'rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w',
        amount: '1000000000',
        currency: 'XRP',
        delivered_amount: '1000000000',
        fee: '12',
        memos: [
          {
            memo_type: 'text/plain',
            memo_data: 'Payment for services',
          },
        ],
      },
    });
    
    const signature = signPayload(payload, secret);
    
    // Simulate webhook receiver verification
    const receivedPayload = payload; // In real scenario, this comes from request body
    const receivedSignature = signature; // From X-XRNotify-Signature header
    
    const isValid = verifySignature(receivedPayload, receivedSignature, secret);
    
    expect(isValid).toBe(true);
  });

  it('should detect any modification to payload', () => {
    const secret = generateSecret();
    const originalPayload = {
      event_id: 'xrpl:12345:abc123:payment.xrp',
      event_type: 'payment.xrp',
      timestamp: '2024-01-15T10:00:00.000Z',
      payload: {
        amount: '1000000',
      },
    };
    
    const signature = signPayload(JSON.stringify(originalPayload), secret);
    
    // Try various modifications
    const modifications = [
      { ...originalPayload, event_id: 'xrpl:12345:abc123:payment.issued' },
      { ...originalPayload, timestamp: '2024-01-15T10:00:01.000Z' },
      { ...originalPayload, payload: { amount: '1000001' } },
      { ...originalPayload, extra_field: 'injected' },
    ];
    
    for (const modified of modifications) {
      const isValid = verifySignature(JSON.stringify(modified), signature, secret);
      expect(isValid).toBe(false);
    }
  });
});
