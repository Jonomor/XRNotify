// =============================================================================
// XRNotify Platform - Configuration
// =============================================================================
// Centralized, validated configuration from environment variables
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Environment Schema
// -----------------------------------------------------------------------------

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  DASHBOARD_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1),
  DB_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
  DB_SSL: z.coerce.boolean().default(false),

  // Redis
  REDIS_URL: z.string().min(1),
  REDIS_KEY_PREFIX: z.string().default('xrnotify:'),

  // XRPL
  XRPL_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('mainnet'),
  XRPL_WS_URL: z.string().url().default('wss://xrplcluster.com'),
  XRPL_WS_URL_FALLBACK: z.string().url().default('wss://s1.ripple.com'),
  XRPL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  XRPL_RECONNECT_DELAY_MS: z.coerce.number().int().min(100).default(1000),
  XRPL_RECONNECT_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(10),
  XRPL_START_LEDGER_INDEX: z.string().default('validated'),

  // Security
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('xrnotify_session'),
  SESSION_MAX_AGE_MS: z.coerce.number().int().min(60000).default(604800000), // 7 days

  // Rate Limiting
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_BURST: z.coerce.number().int().min(1).default(10),

  // Webhook Delivery
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(30000),
  WEBHOOK_MAX_RETRIES: z.coerce.number().int().min(1).max(20).default(10),
  WEBHOOK_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(1000),
  WEBHOOK_ALLOW_LOCALHOST: z.coerce.boolean().default(false),
  WEBHOOK_ALLOW_PRIVATE_IPS: z.coerce.boolean().default(false),

  // Worker
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(10),
  WORKER_BATCH_SIZE: z.coerce.number().int().min(1).default(100),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(10).default(100),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_STARTER: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),

  // Metrics
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().int().min(1).max(65535).default(9090),

  // Feature Flags
  FEATURE_WEBSOCKET_STREAMING: z.coerce.boolean().default(false),
  FEATURE_RAW_EVENTS: z.coerce.boolean().default(false),
  FEATURE_BILLING: z.coerce.boolean().default(false),
});

// -----------------------------------------------------------------------------
// Configuration Type
// -----------------------------------------------------------------------------

export type Config = {
  env: 'development' | 'test' | 'production';
  port: number;
  apiBaseUrl: string;
  dashboardUrl: string;
  logLevel: string;

  database: {
    url: string;
    poolMin: number;
    poolMax: number;
    ssl: boolean;
  };

  redis: {
    url: string;
    keyPrefix: string;
  };

  xrpl: {
    network: 'mainnet' | 'testnet' | 'devnet';
    wsUrl: string;
    wsUrlFallback: string;
    connectionTimeoutMs: number;
    reconnectDelayMs: number;
    reconnectMaxAttempts: number;
    startLedgerIndex: string;
  };

  session: {
    secret: string;
    cookieName: string;
    maxAgeMs: number;
  };

  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    burst: number;
  };

  webhook: {
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    allowLocalhost: boolean;
    allowPrivateIps: boolean;
  };

  worker: {
    concurrency: number;
    batchSize: number;
    pollIntervalMs: number;
  };

  stripe: {
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
    priceIdStarter?: string;
    priceIdPro?: string;
  };

  metrics: {
    enabled: boolean;
    port: number;
  };

  features: {
    websocketStreaming: boolean;
    rawEvents: boolean;
    billing: boolean;
  };
};

// -----------------------------------------------------------------------------
// Configuration Singleton
// -----------------------------------------------------------------------------

let configInstance: Config | null = null;

/**
 * Parse and validate environment variables into typed config
 */
function parseConfig(): Config {
  const env = envSchema.parse(process.env);

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    apiBaseUrl: env.API_BASE_URL,
    dashboardUrl: env.DASHBOARD_URL,
    logLevel: env.LOG_LEVEL,

    database: {
      url: env.DATABASE_URL,
      poolMin: env.DB_POOL_MIN,
      poolMax: env.DB_POOL_MAX,
      ssl: env.DB_SSL,
    },

    redis: {
      url: env.REDIS_URL,
      keyPrefix: env.REDIS_KEY_PREFIX,
    },

    xrpl: {
      network: env.XRPL_NETWORK,
      wsUrl: env.XRPL_WS_URL,
      wsUrlFallback: env.XRPL_WS_URL_FALLBACK,
      connectionTimeoutMs: env.XRPL_CONNECTION_TIMEOUT_MS,
      reconnectDelayMs: env.XRPL_RECONNECT_DELAY_MS,
      reconnectMaxAttempts: env.XRPL_RECONNECT_MAX_ATTEMPTS,
      startLedgerIndex: env.XRPL_START_LEDGER_INDEX,
    },

    session: {
      secret: env.SESSION_SECRET,
      cookieName: env.SESSION_COOKIE_NAME,
      maxAgeMs: env.SESSION_MAX_AGE_MS,
    },

    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED,
      requestsPerMinute: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
      burst: env.RATE_LIMIT_BURST,
    },

    webhook: {
      timeoutMs: env.WEBHOOK_TIMEOUT_MS,
      maxRetries: env.WEBHOOK_MAX_RETRIES,
      retryDelayMs: env.WEBHOOK_RETRY_DELAY_MS,
      allowLocalhost: env.WEBHOOK_ALLOW_LOCALHOST,
      allowPrivateIps: env.WEBHOOK_ALLOW_PRIVATE_IPS,
    },

    worker: {
      concurrency: env.WORKER_CONCURRENCY,
      batchSize: env.WORKER_BATCH_SIZE,
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    },

    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      priceIdStarter: env.STRIPE_PRICE_ID_STARTER,
      priceIdPro: env.STRIPE_PRICE_ID_PRO,
    },

    metrics: {
      enabled: env.METRICS_ENABLED,
      port: env.METRICS_PORT,
    },

    features: {
      websocketStreaming: env.FEATURE_WEBSOCKET_STREAMING,
      rawEvents: env.FEATURE_RAW_EVENTS,
      billing: env.FEATURE_BILLING,
    },
  };
}

/**
 * Get the application configuration (singleton)
 * Validates environment variables on first call
 * 
 * @returns Validated configuration object
 * @throws ZodError if environment variables are invalid
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = parseConfig();
  }
  return configInstance;
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return getConfig().env === 'production';
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return getConfig().env === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return getConfig().env === 'test';
}

/**
 * Reset configuration (for testing only)
 */
export function resetConfig(): void {
  if (process.env['NODE_ENV'] === 'test') {
    configInstance = null;
  }
}

/**
 * Get Redis key with prefix
 */
export function redisKey(key: string): string {
  return `${getConfig().redis.keyPrefix}${key}`;
}

/**
 * Get database connection string with SSL if configured
 */
export function getDatabaseUrl(): string {
  return getConfig().database.url;
}
