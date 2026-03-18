// =============================================================================
// XRNotify Platform - Webhook URL Policy
// =============================================================================
// SSRF protection, private IP blocking, DNS validation, URL security checks
// =============================================================================

import { resolve4, resolve6 } from 'dns/promises';
import { getConfig } from '../config';
import { createModuleLogger, logSecurityEvent } from '../logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: UrlValidationErrorCode;
  resolvedIps?: string[];
}

export type UrlValidationErrorCode = 
  | 'INVALID_URL'
  | 'INVALID_PROTOCOL'
  | 'PRIVATE_IP'
  | 'LOCALHOST'
  | 'RESERVED_IP'
  | 'DNS_RESOLUTION_FAILED'
  | 'BLOCKED_DOMAIN'
  | 'INVALID_PORT';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Private IP ranges (RFC 1918, RFC 4193, RFC 6598)
const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Carrier-grade NAT (RFC 6598)
  { start: '100.64.0.0', end: '100.127.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Documentation/example ranges
  { start: '192.0.2.0', end: '192.0.2.255' },
  { start: '198.51.100.0', end: '198.51.100.255' },
  { start: '203.0.113.0', end: '203.0.113.255' },
  // Broadcast
  { start: '255.255.255.255', end: '255.255.255.255' },
  // Current network
  { start: '0.0.0.0', end: '0.255.255.255' },
];

// Localhost and loopback patterns
const LOCALHOST_PATTERNS = [
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '[::1]',
  '[0:0:0:0:0:0:0:1]',
];

// Blocked TLDs and patterns
const BLOCKED_DOMAINS = [
  'internal',
  'local',
  'localhost',
  'localdomain',
  'intranet',
  'corp',
  'home',
  'lan',
  'private',
];

// Allowed ports (standard HTTPS ports)
const ALLOWED_PORTS = [443, 8443, 8080, 80];

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('url-policy');

// -----------------------------------------------------------------------------
// IP Utilities
// -----------------------------------------------------------------------------

/**
 * Convert IPv4 address to integer for comparison
 */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] ?? 0) << 24) + ((parts[1] ?? 0) << 16) + ((parts[2] ?? 0) << 8) + (parts[3] ?? 0);
}

/**
 * Check if an IPv4 address is in a private range
 */
function isPrivateIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  
  for (const range of PRIVATE_IP_RANGES) {
    const startInt = ipv4ToInt(range.start);
    const endInt = ipv4ToInt(range.end);
    
    if (ipInt >= startInt && ipInt <= endInt) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if an IPv6 address is private/local
 */
function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  
  // Loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }
  
  // Link-local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || 
      normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  
  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  
  // IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  if (normalized.startsWith('::ffff:')) {
    const ipv4 = normalized.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ipv4)) {
      return isPrivateIpv4(ipv4);
    }
  }
  
  return false;
}

/**
 * Check if an IP address is private
 */
function isPrivateIp(ip: string): boolean {
  // Check if IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    return isPrivateIpv4(ip);
  }
  
  // Assume IPv6
  return isPrivateIpv6(ip);
}

// -----------------------------------------------------------------------------
// URL Validation
// -----------------------------------------------------------------------------

/**
 * Validate a webhook URL against security policies
 */
export async function validateWebhookUrl(url: string): Promise<UrlValidationResult> {
  const config = getConfig();
  
  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
      errorCode: 'INVALID_URL',
    };
  }
  
  // Check protocol
  const allowHttp = config.env !== 'production' && config.webhook.allowLocalhost;
  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    return {
      valid: false,
      error: 'URL must use HTTPS protocol',
      errorCode: 'INVALID_PROTOCOL',
    };
  }
  
  // Check for localhost patterns
  const hostname = parsed.hostname.toLowerCase();
  
  if (LOCALHOST_PATTERNS.includes(hostname)) {
    if (!config.webhook.allowLocalhost) {
      logSecurityEvent(logger, 'blocked_request', { 
        url, 
        reason: 'Localhost not allowed',
      });
      return {
        valid: false,
        error: 'Localhost URLs are not allowed',
        errorCode: 'LOCALHOST',
      };
    }
    
    // Allow localhost in dev mode
    logger.debug({ url }, 'Allowing localhost URL in development mode');
    return { valid: true };
  }
  
  // Check for blocked domains/TLDs
  const domainParts = hostname.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  if (tld && BLOCKED_DOMAINS.includes(tld)) {
    logSecurityEvent(logger, 'blocked_request', { 
      url, 
      reason: 'Blocked TLD',
      tld,
    });
    return {
      valid: false,
      error: `Domain ending in .${tld} is not allowed`,
      errorCode: 'BLOCKED_DOMAIN',
    };
  }
  
  // Check port
  if (parsed.port) {
    const port = parseInt(parsed.port, 10);
    if (!ALLOWED_PORTS.includes(port) && config.env === 'production') {
      return {
        valid: false,
        error: `Port ${port} is not allowed. Use standard HTTPS ports.`,
        errorCode: 'INVALID_PORT',
      };
    }
  }
  
  // Skip DNS resolution for IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('[')) {
    const ip = hostname.replace(/^\[|\]$/g, '');
    
    if (isPrivateIp(ip) && !config.webhook.allowPrivateIps) {
      logSecurityEvent(logger, 'blocked_request', { 
        url, 
        reason: 'Private IP address',
        ip,
      });
      return {
        valid: false,
        error: 'Private IP addresses are not allowed',
        errorCode: 'PRIVATE_IP',
      };
    }
    
    return { valid: true, resolvedIps: [ip] };
  }
  
  // DNS resolution check
  try {
    const resolvedIps = await resolveHostname(hostname);
    
    if (resolvedIps.length === 0) {
      return {
        valid: false,
        error: 'Could not resolve hostname',
        errorCode: 'DNS_RESOLUTION_FAILED',
      };
    }
    
    // Check if any resolved IP is private
    if (!config.webhook.allowPrivateIps) {
      for (const ip of resolvedIps) {
        if (isPrivateIp(ip)) {
          logSecurityEvent(logger, 'blocked_request', { 
            url, 
            reason: 'Resolved to private IP',
            ip,
            hostname,
          });
          return {
            valid: false,
            error: 'URL resolves to a private IP address',
            errorCode: 'PRIVATE_IP',
          };
        }
      }
    }
    
    logger.debug({ url, resolvedIps }, 'URL validated successfully');
    return { valid: true, resolvedIps };
    
  } catch (error) {
    logger.warn({ error, url }, 'DNS resolution failed');
    return {
      valid: false,
      error: 'Could not resolve hostname',
      errorCode: 'DNS_RESOLUTION_FAILED',
    };
  }
}

/**
 * Resolve hostname to IP addresses
 */
async function resolveHostname(hostname: string): Promise<string[]> {
  const ips: string[] = [];
  
  // Try IPv4
  try {
    const ipv4s = await resolve4(hostname);
    ips.push(...ipv4s);
  } catch {
    // No IPv4 records
  }
  
  // Try IPv6
  try {
    const ipv6s = await resolve6(hostname);
    ips.push(...ipv6s);
  } catch {
    // No IPv6 records
  }
  
  return ips;
}

// -----------------------------------------------------------------------------
// Quick Validation (No DNS)
// -----------------------------------------------------------------------------

/**
 * Perform quick URL validation without DNS resolution
 * Use this for input validation before storing
 */
export function validateWebhookUrlSync(url: string): UrlValidationResult {
  const config = getConfig();
  
  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
      errorCode: 'INVALID_URL',
    };
  }
  
  // Check protocol
  const allowHttp = config.env !== 'production' && config.webhook.allowLocalhost;
  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    return {
      valid: false,
      error: 'URL must use HTTPS protocol',
      errorCode: 'INVALID_PROTOCOL',
    };
  }
  
  // Check for localhost patterns
  const hostname = parsed.hostname.toLowerCase();
  
  if (LOCALHOST_PATTERNS.includes(hostname) && !config.webhook.allowLocalhost) {
    return {
      valid: false,
      error: 'Localhost URLs are not allowed',
      errorCode: 'LOCALHOST',
    };
  }
  
  // Check for blocked domains/TLDs
  const domainParts = hostname.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  if (tld && BLOCKED_DOMAINS.includes(tld)) {
    return {
      valid: false,
      error: `Domain ending in .${tld} is not allowed`,
      errorCode: 'BLOCKED_DOMAIN',
    };
  }
  
  // Check for direct IP input
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith('[')) {
    const ip = hostname.replace(/^\[|\]$/g, '');
    
    if (isPrivateIp(ip) && !config.webhook.allowPrivateIps) {
      return {
        valid: false,
        error: 'Private IP addresses are not allowed',
        errorCode: 'PRIVATE_IP',
      };
    }
  }
  
  return { valid: true };
}

// -----------------------------------------------------------------------------
// URL Sanitization
// -----------------------------------------------------------------------------

/**
 * Sanitize URL for logging (remove auth, query params)
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

/**
 * Extract host from URL
 */
export function extractHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
