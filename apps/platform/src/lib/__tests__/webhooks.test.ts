// =============================================================================
// XRNotify Platform - Webhook Service Tests
// =============================================================================
// Tests for webhook CRUD, URL validation, and SSRF protection
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateWebhookUrl, 
  isPrivateIp, 
  isBlockedHost,
  normalizeUrl,
} from '../webhooks/urlPolicy';
import { EVENT_TYPES, type EventType } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// URL Validation Tests
// -----------------------------------------------------------------------------

describe('validateWebhookUrl', () => {
  describe('Protocol validation', () => {
    it('should accept HTTPS URLs', async () => {
      const result = await validateWebhookUrl('https://example.com/webhook');
      expect(result.valid).toBe(true);
    });

    it('should accept HTTP URLs in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const result = await validateWebhookUrl('http://example.com/webhook');
      expect(result.valid).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should reject HTTP URLs in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const result = await validateWebhookUrl('http://example.com/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should reject non-HTTP protocols', async () => {
      const invalidUrls = [
        'ftp://example.com/webhook',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<script>',
      ];

      for (const url of invalidUrls) {
        const result = await validateWebhookUrl(url);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('URL format validation', () => {
    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'example.com',
        '://missing-protocol.com',
        '',
        'https://',
        'https:///',
      ];

      for (const url of invalidUrls) {
        const result = await validateWebhookUrl(url);
        expect(result.valid).toBe(false);
      }
    });

    it('should accept URLs with paths', async () => {
      const result = await validateWebhookUrl('https://example.com/api/v1/webhooks');
      expect(result.valid).toBe(true);
    });

    it('should accept URLs with query strings', async () => {
      const result = await validateWebhookUrl('https://example.com/webhook?token=abc');
      expect(result.valid).toBe(true);
    });

    it('should accept URLs with ports', async () => {
      const result = await validateWebhookUrl('https://example.com:8443/webhook');
      expect(result.valid).toBe(true);
    });

    it('should accept URLs with subdomains', async () => {
      const result = await validateWebhookUrl('https://api.subdomain.example.com/webhook');
      expect(result.valid).toBe(true);
    });
  });
});

// -----------------------------------------------------------------------------
// Private IP Detection Tests
// -----------------------------------------------------------------------------

describe('isPrivateIp', () => {
  describe('IPv4 private ranges', () => {
    it('should detect 10.x.x.x as private', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
      expect(isPrivateIp('10.123.45.67')).toBe(true);
    });

    it('should detect 172.16-31.x.x as private', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('172.20.0.1')).toBe(true);
    });

    it('should NOT detect 172.32+ as private', () => {
      expect(isPrivateIp('172.32.0.1')).toBe(false);
      expect(isPrivateIp('172.15.0.1')).toBe(false);
    });

    it('should detect 192.168.x.x as private', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.100')).toBe(true);
    });

    it('should detect 127.x.x.x as private (loopback)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('should detect 169.254.x.x as private (link-local)', () => {
      expect(isPrivateIp('169.254.0.1')).toBe(true);
      expect(isPrivateIp('169.254.255.255')).toBe(true);
    });

    it('should NOT detect public IPs as private', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('93.184.216.34')).toBe(false);
      expect(isPrivateIp('203.0.113.50')).toBe(false);
    });
  });

  describe('IPv6 addresses', () => {
    it('should detect ::1 as private (loopback)', () => {
      expect(isPrivateIp('::1')).toBe(true);
    });

    it('should detect fc00::/7 as private (unique local)', () => {
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd00::1')).toBe(true);
    });

    it('should detect fe80::/10 as private (link-local)', () => {
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('should NOT detect public IPv6 as private', () => {
      expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid IP addresses', () => {
      expect(isPrivateIp('not-an-ip')).toBe(false);
      expect(isPrivateIp('')).toBe(false);
      expect(isPrivateIp('256.256.256.256')).toBe(false);
    });

    it('should detect 0.0.0.0 as private', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
    });
  });
});

// -----------------------------------------------------------------------------
// Blocked Host Tests
// -----------------------------------------------------------------------------

describe('isBlockedHost', () => {
  it('should block localhost', () => {
    expect(isBlockedHost('localhost')).toBe(true);
  });

  it('should block localhost variants', () => {
    expect(isBlockedHost('localhost.localdomain')).toBe(true);
    expect(isBlockedHost('LOCALHOST')).toBe(true);
  });

  it('should block common internal hostnames', () => {
    expect(isBlockedHost('internal')).toBe(true);
    expect(isBlockedHost('intranet')).toBe(true);
    expect(isBlockedHost('private')).toBe(true);
  });

  it('should block metadata endpoints', () => {
    expect(isBlockedHost('metadata.google.internal')).toBe(true);
    expect(isBlockedHost('169.254.169.254')).toBe(true);
  });

  it('should block AWS metadata', () => {
    expect(isBlockedHost('instance-data')).toBe(true);
  });

  it('should NOT block normal domains', () => {
    expect(isBlockedHost('example.com')).toBe(false);
    expect(isBlockedHost('api.stripe.com')).toBe(false);
    expect(isBlockedHost('hooks.slack.com')).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// URL Normalization Tests
// -----------------------------------------------------------------------------

describe('normalizeUrl', () => {
  it('should lowercase the hostname', () => {
    expect(normalizeUrl('https://EXAMPLE.COM/webhook')).toBe('https://example.com/webhook');
  });

  it('should remove default ports', () => {
    expect(normalizeUrl('https://example.com:443/webhook')).toBe('https://example.com/webhook');
    expect(normalizeUrl('http://example.com:80/webhook')).toBe('http://example.com/webhook');
  });

  it('should keep non-default ports', () => {
    expect(normalizeUrl('https://example.com:8443/webhook')).toBe('https://example.com:8443/webhook');
  });

  it('should remove trailing slashes from path', () => {
    expect(normalizeUrl('https://example.com/webhook/')).toBe('https://example.com/webhook');
  });

  it('should preserve query strings', () => {
    expect(normalizeUrl('https://example.com/webhook?token=abc')).toBe('https://example.com/webhook?token=abc');
  });

  it('should handle root path', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
  });
});

// -----------------------------------------------------------------------------
// Event Type Validation Tests
// -----------------------------------------------------------------------------

describe('Event Type Validation', () => {
  it('should have all expected event types', () => {
    const expectedTypes: EventType[] = [
      'payment.xrp',
      'payment.issued',
      'nft.minted',
      'nft.burned',
      'nft.offer_created',
      'nft.offer_accepted',
      'nft.offer_cancelled',
      'nft.transfer',
      'dex.offer_created',
      'dex.offer_filled',
      'dex.offer_partial',
      'dex.offer_cancelled',
      'trustline.created',
      'trustline.modified',
      'trustline.deleted',
      'escrow.created',
      'escrow.finished',
      'escrow.cancelled',
      'check.created',
      'check.cashed',
      'check.cancelled',
    ];

    for (const type of expectedTypes) {
      expect(EVENT_TYPES).toContain(type);
    }
  });

  it('should validate event type format', () => {
    for (const type of EVENT_TYPES) {
      // All event types should be category.action format
      expect(type).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it('should have consistent categories', () => {
    const categories = new Set(EVENT_TYPES.map(t => t.split('.')[0]));
    
    expect(categories.has('payment')).toBe(true);
    expect(categories.has('nft')).toBe(true);
    expect(categories.has('dex')).toBe(true);
    expect(categories.has('trustline')).toBe(true);
    expect(categories.has('escrow')).toBe(true);
    expect(categories.has('check')).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Webhook Matching Tests
// -----------------------------------------------------------------------------

describe('Webhook Event Matching', () => {
  const matchesEventType = (
    webhookEventTypes: string[],
    eventType: string
  ): boolean => {
    // Empty array means all events
    if (webhookEventTypes.length === 0) return true;
    return webhookEventTypes.includes(eventType);
  };

  const matchesAccountFilter = (
    webhookAccounts: string[],
    eventAccounts: string[]
  ): boolean => {
    // Empty array means all accounts
    if (webhookAccounts.length === 0) return true;
    // Check for any overlap
    return webhookAccounts.some(a => eventAccounts.includes(a));
  };

  describe('Event type matching', () => {
    it('should match when webhook has no event type filter', () => {
      expect(matchesEventType([], 'payment.xrp')).toBe(true);
      expect(matchesEventType([], 'nft.minted')).toBe(true);
    });

    it('should match when event type is in filter', () => {
      expect(matchesEventType(['payment.xrp'], 'payment.xrp')).toBe(true);
      expect(matchesEventType(['payment.xrp', 'nft.minted'], 'nft.minted')).toBe(true);
    });

    it('should NOT match when event type is not in filter', () => {
      expect(matchesEventType(['payment.xrp'], 'nft.minted')).toBe(false);
      expect(matchesEventType(['dex.offer_created'], 'payment.xrp')).toBe(false);
    });
  });

  describe('Account filter matching', () => {
    it('should match when webhook has no account filter', () => {
      expect(matchesAccountFilter([], ['rAccount1'])).toBe(true);
      expect(matchesAccountFilter([], ['rAccount1', 'rAccount2'])).toBe(true);
    });

    it('should match when any account overlaps', () => {
      expect(matchesAccountFilter(['rAccount1'], ['rAccount1', 'rAccount2'])).toBe(true);
      expect(matchesAccountFilter(['rAccount2'], ['rAccount1', 'rAccount2'])).toBe(true);
    });

    it('should NOT match when no accounts overlap', () => {
      expect(matchesAccountFilter(['rAccount1'], ['rAccount2'])).toBe(false);
      expect(matchesAccountFilter(['rAccount1', 'rAccount2'], ['rAccount3'])).toBe(false);
    });
  });

  describe('Combined matching', () => {
    const matchesWebhook = (
      webhook: { event_types: string[]; account_filters: string[] },
      event: { event_type: string; accounts: string[] }
    ): boolean => {
      return matchesEventType(webhook.event_types, event.event_type) &&
             matchesAccountFilter(webhook.account_filters, event.accounts);
    };

    it('should match with no filters', () => {
      const webhook = { event_types: [], account_filters: [] };
      const event = { event_type: 'payment.xrp', accounts: ['rAccount1'] };
      
      expect(matchesWebhook(webhook, event)).toBe(true);
    });

    it('should match with event type filter only', () => {
      const webhook = { event_types: ['payment.xrp'], account_filters: [] };
      
      expect(matchesWebhook(webhook, { event_type: 'payment.xrp', accounts: ['rAny'] })).toBe(true);
      expect(matchesWebhook(webhook, { event_type: 'nft.minted', accounts: ['rAny'] })).toBe(false);
    });

    it('should match with account filter only', () => {
      const webhook = { event_types: [], account_filters: ['rAccount1'] };
      
      expect(matchesWebhook(webhook, { event_type: 'payment.xrp', accounts: ['rAccount1'] })).toBe(true);
      expect(matchesWebhook(webhook, { event_type: 'payment.xrp', accounts: ['rAccount2'] })).toBe(false);
    });

    it('should require both filters to match', () => {
      const webhook = { event_types: ['payment.xrp'], account_filters: ['rAccount1'] };
      
      // Both match
      expect(matchesWebhook(webhook, { event_type: 'payment.xrp', accounts: ['rAccount1'] })).toBe(true);
      
      // Event type matches, account doesn't
      expect(matchesWebhook(webhook, { event_type: 'payment.xrp', accounts: ['rAccount2'] })).toBe(false);
      
      // Account matches, event type doesn't
      expect(matchesWebhook(webhook, { event_type: 'nft.minted', accounts: ['rAccount1'] })).toBe(false);
      
      // Neither matches
      expect(matchesWebhook(webhook, { event_type: 'nft.minted', accounts: ['rAccount2'] })).toBe(false);
    });
  });
});

// -----------------------------------------------------------------------------
// SSRF Protection Tests
// -----------------------------------------------------------------------------

describe('SSRF Protection', () => {
  it('should block internal network access', async () => {
    const internalUrls = [
      'https://10.0.0.1/webhook',
      'https://192.168.1.1/webhook',
      'https://172.16.0.1/webhook',
      'https://127.0.0.1/webhook',
      'https://localhost/webhook',
    ];

    for (const url of internalUrls) {
      const result = await validateWebhookUrl(url);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/private|internal|blocked/i);
    }
  });

  it('should block cloud metadata endpoints', async () => {
    const metadataUrls = [
      'https://169.254.169.254/latest/meta-data/',
      'https://metadata.google.internal/computeMetadata/v1/',
    ];

    for (const url of metadataUrls) {
      const result = await validateWebhookUrl(url);
      expect(result.valid).toBe(false);
    }
  });

  it('should allow legitimate external URLs', async () => {
    const validUrls = [
      'https://hooks.slack.com/services/xxx',
      'https://api.example.com/webhooks',
      'https://webhook.site/xxx',
    ];

    for (const url of validUrls) {
      const result = await validateWebhookUrl(url);
      expect(result.valid).toBe(true);
    }
  });
});
