/**
 * @fileoverview XRNotify HTTP Client
 * HTTP client wrapper with timeouts, retries, and SSRF protection.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/core/http
 */

import { createModuleLogger, logError } from './logger.js';
import { getConfig } from './config.js';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { URL } from 'node:url';

// =============================================================================
// Types
// =============================================================================

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /**
   * Request method
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Request body (will be JSON stringified if object)
   */
  body?: string | object;

  /**
   * Request timeout in milliseconds
   */
  timeoutMs?: number;

  /**
   * Maximum redirects to follow
   */
  maxRedirects?: number;

  /**
   * Skip SSRF protection checks
   */
  skipSsrfCheck?: boolean;

  /**
   * Custom abort signal
   */
  signal?: AbortSignal;
}

/**
 * HTTP response
 */
export interface HttpResponse {
  /**
   * HTTP status code
   */
  status: number;

  /**
   * Status text
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Response body as text
   */
  body: string;

  /**
   * Request duration in milliseconds
   */
  durationMs: number;

  /**
   * Final URL after redirects
   */
  url: string;

  /**
   * Whether the request was successful (2xx)
   */
  ok: boolean;
}

/**
 * HTTP error
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly response?: HttpResponse
  ) {
    super(message);
    this.name = 'HttpError';
    Error.captureStackTrace(this, HttpError);
  }
}

/**
 * SSRF protection error
 */
export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
    Error.captureStackTrace(this, SsrfError);
  }
}

// =============================================================================
// Private IP Ranges (SSRF Protection)
// =============================================================================

const logger = createModuleLogger('http-client');

/**
 * Private and reserved IP ranges that should be blocked
 */
const BLOCKED_IP_RANGES = [
  // IPv4 private ranges
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // IPv4 loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // IPv4 link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // IPv4 localhost alternatives
  { start: '0.0.0.0', end: '0.255.255.255' },
  // IPv4 broadcast
  { start: '255.255.255.255', end: '255.255.255.255' },
  // IPv4 documentation ranges
  { start: '192.0.2.0', end: '192.0.2.255' },
  { start: '198.51.100.0', end: '198.51.100.255' },
  { start: '203.0.113.0', end: '203.0.113.255' },
  // IPv4 carrier-grade NAT
  { start: '100.64.0.0', end: '100.127.255.255' },
];

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'local',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
  'ip6-localnet',
  'ip6-mcastprefix',
  'ip6-allnodes',
  'ip6-allrouters',
  'kubernetes.default',
  'kubernetes.default.svc',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254', // AWS metadata service
]);

/**
 * Convert IP address to numeric value for comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0]! << 24) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0;
}

/**
 * Check if an IP address is in a blocked range
 */
function isBlockedIp(ip: string): boolean {
  // Handle IPv6 loopback
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) {
    return true;
  }

  // Handle IPv4
  if (isIP(ip) === 4) {
    const ipNum = ipToNumber(ip);
    for (const range of BLOCKED_IP_RANGES) {
      const startNum = ipToNumber(range.start);
      const endNum = ipToNumber(range.end);
      if (ipNum >= startNum && ipNum <= endNum) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  
  // Direct match
  if (BLOCKED_HOSTNAMES.has(lowerHostname)) {
    return true;
  }

  // Check if it's an IP address
  if (isIP(hostname)) {
    return isBlockedIp(hostname);
  }

  // Check for suspicious patterns
  if (lowerHostname.endsWith('.local') || 
      lowerHostname.endsWith('.internal') ||
      lowerHostname.endsWith('.localhost') ||
      lowerHostname.includes('metadata')) {
    return true;
  }

  return false;
}

/**
 * Validate a URL for SSRF protection
 *
 * @param url - URL to validate
 * @throws SsrfError if URL is blocked
 */
export async function validateUrlForSsrf(url: string): Promise<void> {
  const config = getConfig();

  if (!config.webhook.blockPrivateIps) {
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new SsrfError(`Invalid URL: ${url}`);
  }

  const hostname = parsedUrl.hostname;

  // Check protocol
  if (config.webhook.requireHttps && parsedUrl.protocol !== 'https:') {
    throw new SsrfError('HTTPS is required');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new SsrfError(`Invalid protocol: ${parsedUrl.protocol}`);
  }

  // Check blocked hostnames
  if (isBlockedHostname(hostname)) {
    throw new SsrfError(`Blocked hostname: ${hostname}`);
  }

  // If hostname is an IP, check directly
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new SsrfError(`Blocked IP address: ${hostname}`);
    }
    return;
  }

  // Resolve DNS and check resolved IPs
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.webhook.dnsResolutionTimeoutMs);

    try {
      const addresses = await lookup(hostname, { all: true });
      clearTimeout(timeoutId);

      for (const addr of addresses) {
        if (isBlockedIp(addr.address)) {
          throw new SsrfError(`Hostname ${hostname} resolves to blocked IP: ${addr.address}`);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof SsrfError) {
      throw error;
    }
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOTFOUND') {
      throw new SsrfError(`DNS resolution failed for: ${hostname}`);
    }
    if (err.name === 'AbortError') {
      throw new SsrfError(`DNS resolution timeout for: ${hostname}`);
    }
    throw new SsrfError(`DNS resolution error for ${hostname}: ${err.message}`);
  }
}

// =============================================================================
// HTTP Client
// =============================================================================

/**
 * Default request options
 */
const DEFAULT_OPTIONS: Required<Omit<HttpRequestOptions, 'body' | 'signal'>> = {
  method: 'GET',
  headers: {},
  timeoutMs: 10000,
  maxRedirects: 3,
  skipSsrfCheck: false,
};

/**
 * Make an HTTP request
 *
 * @param url - Request URL
 * @param options - Request options
 * @returns HTTP response
 *
 * @example
 * 