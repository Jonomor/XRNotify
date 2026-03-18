/**
 * @fileoverview XRNotify Backend Configuration
 * Loads and validates environment variables using Zod.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/core/config
 */

import { z } from 'zod';

// =============================================================================
// Environment Schema Definitions
// =============================================================================

/**
 * Service name/role
 */
const ServiceNameSchema = z.enum(['api', 'listener', 'worker']).default('api');

/**
 * Node environment
 */
const NodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

/**
 * Log level
 */
const LogLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info');

/**
 * Log format
 */
const LogFormatSchema = z.enum(['json', 'pretty']).default('json');

/**
 * Boolean from string
 */
const BooleanStringSchema = z
  .string()
  .transform((val) => val.toLowerCase() === 'true')
  .pipe(z.boolean())
  .or(z.boolean())
  .default(false);

/**
 * Positive integer from string
 */
const PositiveIntStringSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .pipe(z.number().int().positive())
  .or(z.number().int().positive());

/**
 * Non-negative integer from string
 */
const NonNegativeIntStringSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .pipe(z.number().int().nonnegative())
  .or(z.number().int().nonnegative());

/**
 * Duration string (e.g., "15m", "7d", "1h")
 */
const DurationStringSchema = z.string().regex(/^\d+[smhd]$/, 'Invalid duration format');

// =============================================================================
// Configuration Schema
// =============================================================================

const ConfigSchema = z.object({
  // ---------------------------------------------------------------------------
  // General
  // ---------------------------------------------------------------------------
  nodeEnv: NodeEnvSchema,
  serviceName: ServiceNameSchema,
  
  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------
  log: z.object({
    level: LogLevelSchema,
    format: LogFormatSchema,
  }),

  // ---------------------------------------------------------------------------
  // API Server
  // ---------------------------------------------------------------------------
  api: z.object({
    host: z.string().default('0.0.0.0'),
    port: PositiveIntStringSchema.default(3000),
    baseUrl: z.string().url().default('http://localhost:3000'),
    bodyLimit: PositiveIntStringSchema.default(1048576), // 1MB
    corsOrigins: z
      .string()
      .transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean))
      .default(''),
    trustProxy: BooleanStringSchema.default(true),
  }),

  // ---------------------------------------------------------------------------
  // Database
  // ---------------------------------------------------------------------------
  database: z.object({
    url: z.string().url(),
    poolMin: NonNegativeIntStringSchema.default(2),
    poolMax: PositiveIntStringSchema.default(10),
    idleTimeoutMs: PositiveIntStringSchema.default(30000),
    connectionTimeoutMs: PositiveIntStringSchema.default(10000),
    ssl: BooleanStringSchema.default(false),
  }),

  // ---------------------------------------------------------------------------
  // Redis
  // ---------------------------------------------------------------------------
  redis: z.object({
    url: z.string().url(),
    keyPrefix: z.string().default('xrnotify:'),
    maxRetries: PositiveIntStringSchema.default(3),
    retryDelayMs: PositiveIntStringSchema.default(1000),
  }),

  // ---------------------------------------------------------------------------
  // XRPL
  // ---------------------------------------------------------------------------
  xrpl: z.object({
    wsUrl: z.string().url().default('wss://s1.ripple.com'),
    wsUrlFallback: z.string().url().default('wss://s2.ripple.com'),
    network: z.enum(['mainnet', 'testnet', 'devnet']).default('mainnet'),
    reconnectDelayMs: PositiveIntStringSchema.default(5000),
    reconnectMaxAttempts: PositiveIntStringSchema.default(10),
    connectionTimeoutMs: PositiveIntStringSchema.default(15000),
    startLedgerIndex: z
      .string()
      .transform((val) => {
        if (val === 'latest' || val === 'validated') return val;
        const num = parseInt(val, 10);
        return isNaN(num) ? 'latest' : num;
      })
      .default('latest'),
  }),

  // ---------------------------------------------------------------------------
  // Authentication & Security
  // ---------------------------------------------------------------------------
  auth: z.object({
    apiKeyHashAlgorithm: z.string().default('sha256'),
    jwtSecret: z.string().min(32),
    jwtIssuer: z.string().default('xrnotify'),
    jwtAudience: z.string().default('xrnotify-dashboard'),
    jwtAccessTokenExpiry: DurationStringSchema.default('15m'),
    jwtRefreshTokenExpiry: DurationStringSchema.default('7d'),
    sessionCookieName: z.string().default('xrnotify_session'),
    sessionCookieSecure: BooleanStringSchema.default(false),
    sessionCookieDomain: z.string().optional(),
  }),

  // ---------------------------------------------------------------------------
  // Webhook Security
  // ---------------------------------------------------------------------------
  webhook: z.object({
    signatureAlgorithm: z.string().default('sha256'),
    signatureHeader: z.string().default('X-XRNotify-Signature'),
    timestampHeader: z.string().default('X-XRNotify-Timestamp'),
    timestampToleranceSeconds: PositiveIntStringSchema.default(300),
    deliveryTimeoutMs: PositiveIntStringSchema.default(10000),
    deliveryMaxRedirects: NonNegativeIntStringSchema.default(3),
    retryMaxAttempts: PositiveIntStringSchema.default(5),
    retryInitialDelayMs: PositiveIntStringSchema.default(1000),
    retryMaxDelayMs: PositiveIntStringSchema.default(300000),
    retryBackoffMultiplier: PositiveIntStringSchema.default(2),
    dlqEnabled: BooleanStringSchema.default(true),
    dlqRetentionHours: PositiveIntStringSchema.default(168), // 7 days
    blockPrivateIps: BooleanStringSchema.default(true),
    requireHttps: BooleanStringSchema.default(false),
    dnsResolutionTimeoutMs: PositiveIntStringSchema.default(5000),
  }),

  // ---------------------------------------------------------------------------
  // Rate Limiting
  // ---------------------------------------------------------------------------
  rateLimit: z.object({
    enabled: BooleanStringSchema.default(true),
    globalMax: PositiveIntStringSchema.default(1000),
    globalWindowMs: PositiveIntStringSchema.default(60000),
    apiKeyMax: PositiveIntStringSchema.default(100),
    apiKeyWindowMs: PositiveIntStringSchema.default(60000),
    webhookCreateMax: PositiveIntStringSchema.default(10),
    webhookCreateWindowMs: PositiveIntStringSchema.default(3600000),
  }),

  // ---------------------------------------------------------------------------
  // Queue / Redis Streams
  // ---------------------------------------------------------------------------
  stream: z.object({
    eventsName: z.string().default('xrnotify:events'),
    eventsMaxlen: PositiveIntStringSchema.default(100000),
    deliveriesName: z.string().default('xrnotify:deliveries'),
    deliveriesMaxlen: PositiveIntStringSchema.default(500000),
    dlqName: z.string().default('xrnotify:dlq'),
    dlqMaxlen: PositiveIntStringSchema.default(50000),
    replayName: z.string().default('xrnotify:replay'),
    replayMaxlen: PositiveIntStringSchema.default(100000),
    consumerGroupName: z.string().default('xrnotify-workers'),
    consumerBlockMs: PositiveIntStringSchema.default(5000),
    consumerBatchSize: PositiveIntStringSchema.default(10),
    consumerClaimIdleMs: PositiveIntStringSchema.default(60000),
  }),

  // ---------------------------------------------------------------------------
  // Worker
  // ---------------------------------------------------------------------------
  worker: z.object({
    concurrency: PositiveIntStringSchema.default(5),
    gracefulShutdownMs: PositiveIntStringSchema.default(30000),
  }),

  // ---------------------------------------------------------------------------
  // Listener
  // ---------------------------------------------------------------------------
  listener: z.object({
    healthCheckIntervalMs: PositiveIntStringSchema.default(30000),
    persistCursorIntervalMs: PositiveIntStringSchema.default(5000),
  }),

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------
  metrics: z.object({
    enabled: BooleanStringSchema.default(true),
    port: PositiveIntStringSchema.default(9090),
    path: z.string().default('/metrics'),
    pushGatewayUrl: z.string().url().optional().or(z.literal('')),
    pushIntervalMs: PositiveIntStringSchema.default(15000),
  }),

  // ---------------------------------------------------------------------------
  // Data Retention
  // ---------------------------------------------------------------------------
  retention: z.object({
    deliveriesDays: PositiveIntStringSchema.default(30),
    eventsDays: PositiveIntStringSchema.default(7),
    auditLogsDays: PositiveIntStringSchema.default(90),
    cleanupCron: z.string().default('0 3 * * *'),
  }),

  // ---------------------------------------------------------------------------
  // Billing (Optional)
  // ---------------------------------------------------------------------------
  billing: z.object({
    enabled: BooleanStringSchema.default(false),
    stripeSecretKey: z.string().optional(),
    stripeWebhookSecret: z.string().optional(),
    stripePublishableKey: z.string().optional(),
    planFreeEventLimit: NonNegativeIntStringSchema.default(10000),
    planStarterEventLimit: NonNegativeIntStringSchema.default(100000),
    planProEventLimit: NonNegativeIntStringSchema.default(1000000),
    planEnterpriseEventLimit: NonNegativeIntStringSchema.default(0), // 0 = unlimited
  }),

  // ---------------------------------------------------------------------------
  // Email (Optional)
  // ---------------------------------------------------------------------------
  email: z.object({
    enabled: BooleanStringSchema.default(false),
    provider: z.enum(['smtp', 'sendgrid', 'mailgun', 'ses']).default('smtp'),
    smtpHost: z.string().optional(),
    smtpPort: PositiveIntStringSchema.optional(),
    smtpSecure: BooleanStringSchema.default(false),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    fromAddress: z.string().email().default('notifications@xrnotify.io'),
    fromName: z.string().default('XRNotify'),
    sendgridApiKey: z.string().optional(),
  }),

  // ---------------------------------------------------------------------------
  // WebSocket Streaming (Optional)
  // ---------------------------------------------------------------------------
  ws: z.object({
    enabled: BooleanStringSchema.default(false),
    port: PositiveIntStringSchema.default(3003),
    path: z.string().default('/stream'),
    heartbeatIntervalMs: PositiveIntStringSchema.default(30000),
    maxConnectionsPerKey: PositiveIntStringSchema.default(5),
  }),

  // ---------------------------------------------------------------------------
  // External Services
  // ---------------------------------------------------------------------------
  sentry: z.object({
    dsn: z.string().optional(),
    environment: z.string().default('development'),
  }),

  // ---------------------------------------------------------------------------
  // Development & Testing
  // ---------------------------------------------------------------------------
  dev: z.object({
    testWebhookUrl: z.string().url().optional(),
    debugErrors: BooleanStringSchema.default(false),
    seedOnStartup: BooleanStringSchema.default(false),
  }),
});

// =============================================================================
// Configuration Type
// =============================================================================

export type Config = z.infer<typeof ConfigSchema>;

// =============================================================================
// Load Configuration
// =============================================================================

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): Config {
  const env = process.env;

  const rawConfig = {
    nodeEnv: env['NODE_ENV'],
    serviceName: env['SERVICE_NAME'],

    log: {
      level: env['LOG_LEVEL'],
      format: env['LOG_FORMAT'],
    },

    api: {
      host: env['API_HOST'],
      port: env['API_PORT'],
      baseUrl: env['API_BASE_URL'],
      bodyLimit: env['API_BODY_LIMIT'],
      corsOrigins: env['API_CORS_ORIGINS'],
      trustProxy: env['API_TRUST_PROXY'],
    },

    database: {
      url: env['DATABASE_URL'],
      poolMin: env['DATABASE_POOL_MIN'],
      poolMax: env['DATABASE_POOL_MAX'],
      idleTimeoutMs: env['DATABASE_IDLE_TIMEOUT_MS'],
      connectionTimeoutMs: env['DATABASE_CONNECTION_TIMEOUT_MS'],
      ssl: env['DATABASE_SSL'],
    },

    redis: {
      url: env['REDIS_URL'],
      keyPrefix: env['REDIS_KEY_PREFIX'],
      maxRetries: env['REDIS_MAX_RETRIES'],
      retryDelayMs: env['REDIS_RETRY_DELAY_MS'],
    },

    xrpl: {
      wsUrl: env['XRPL_WS_URL'],
      wsUrlFallback: env['XRPL_WS_URL_FALLBACK'],
      network: env['XRPL_NETWORK'],
      reconnectDelayMs: env['XRPL_RECONNECT_DELAY_MS'],
      reconnectMaxAttempts: env['XRPL_RECONNECT_MAX_ATTEMPTS'],
      connectionTimeoutMs: env['XRPL_CONNECTION_TIMEOUT_MS'],
      startLedgerIndex: env['XRPL_START_LEDGER_INDEX'],
    },

    auth: {
      apiKeyHashAlgorithm: env['API_KEY_HASH_ALGORITHM'],
      jwtSecret: env['JWT_SECRET'],
      jwtIssuer: env['JWT_ISSUER'],
      jwtAudience: env['JWT_AUDIENCE'],
      jwtAccessTokenExpiry: env['JWT_ACCESS_TOKEN_EXPIRY'],
      jwtRefreshTokenExpiry: env['JWT_REFRESH_TOKEN_EXPIRY'],
      sessionCookieName: env['SESSION_COOKIE_NAME'],
      sessionCookieSecure: env['SESSION_COOKIE_SECURE'],
      sessionCookieDomain: env['SESSION_COOKIE_DOMAIN'],
    },

    webhook: {
      signatureAlgorithm: env['WEBHOOK_SIGNATURE_ALGORITHM'],
      signatureHeader: env['WEBHOOK_SIGNATURE_HEADER'],
      timestampHeader: env['WEBHOOK_TIMESTAMP_HEADER'],
      timestampToleranceSeconds: env['WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS'],
      deliveryTimeoutMs: env['WEBHOOK_DELIVERY_TIMEOUT_MS'],
      deliveryMaxRedirects: env['WEBHOOK_DELIVERY_MAX_REDIRECTS'],
      retryMaxAttempts: env['WEBHOOK_RETRY_MAX_ATTEMPTS'],
      retryInitialDelayMs: env['WEBHOOK_RETRY_INITIAL_DELAY_MS'],
      retryMaxDelayMs: env['WEBHOOK_RETRY_MAX_DELAY_MS'],
      retryBackoffMultiplier: env['WEBHOOK_RETRY_BACKOFF_MULTIPLIER'],
      dlqEnabled: env['WEBHOOK_DLQ_ENABLED'],
      dlqRetentionHours: env['WEBHOOK_DLQ_RETENTION_HOURS'],
      blockPrivateIps: env['WEBHOOK_BLOCK_PRIVATE_IPS'],
      requireHttps: env['WEBHOOK_REQUIRE_HTTPS'],
      dnsResolutionTimeoutMs: env['WEBHOOK_DNS_RESOLUTION_TIMEOUT_MS'],
    },

    rateLimit: {
      enabled: env['RATE_LIMIT_ENABLED'],
      globalMax: env['RATE_LIMIT_GLOBAL_MAX'],
      globalWindowMs: env['RATE_LIMIT_GLOBAL_WINDOW_MS'],
      apiKeyMax: env['RATE_LIMIT_API_KEY_MAX'],
      apiKeyWindowMs: env['RATE_LIMIT_API_KEY_WINDOW_MS'],
      webhookCreateMax: env['RATE_LIMIT_WEBHOOK_CREATE_MAX'],
      webhookCreateWindowMs: env['RATE_LIMIT_WEBHOOK_CREATE_WINDOW_MS'],
    },

    stream: {
      eventsName: env['STREAM_EVENTS_NAME'],
      eventsMaxlen: env['STREAM_EVENTS_MAXLEN'],
      deliveriesName: env['STREAM_DELIVERIES_NAME'],
      deliveriesMaxlen: env['STREAM_DELIVERIES_MAXLEN'],
      dlqName: env['STREAM_DLQ_NAME'],
      dlqMaxlen: env['STREAM_DLQ_MAXLEN'],
      replayName: env['STREAM_REPLAY_NAME'],
      replayMaxlen: env['STREAM_REPLAY_MAXLEN'],
      consumerGroupName: env['CONSUMER_GROUP_NAME'],
      consumerBlockMs: env['CONSUMER_BLOCK_MS'],
      consumerBatchSize: env['CONSUMER_BATCH_SIZE'],
      consumerClaimIdleMs: env['CONSUMER_CLAIM_IDLE_MS'],
    },

    worker: {
      concurrency: env['WORKER_CONCURRENCY'],
      gracefulShutdownMs: env['WORKER_GRACEFUL_SHUTDOWN_MS'],
    },

    listener: {
      healthCheckIntervalMs: env['LISTENER_HEALTH_CHECK_INTERVAL_MS'],
      persistCursorIntervalMs: env['LISTENER_PERSIST_CURSOR_INTERVAL_MS'],
    },

    metrics: {
      enabled: env['METRICS_ENABLED'],
      port: env['METRICS_PORT'],
      path: env['METRICS_PATH'],
      pushGatewayUrl: env['METRICS_PUSH_GATEWAY_URL'],
      pushIntervalMs: env['METRICS_PUSH_INTERVAL_MS'],
    },

    retention: {
      deliveriesDays: env['RETENTION_DELIVERIES_DAYS'],
      eventsDays: env['RETENTION_EVENTS_DAYS'],
      auditLogsDays: env['RETENTION_AUDIT_LOGS_DAYS'],
      cleanupCron: env['RETENTION_CLEANUP_CRON'],
    },

    billing: {
      enabled: env['BILLING_ENABLED'],
      stripeSecretKey: env['STRIPE_SECRET_KEY'],
      stripeWebhookSecret: env['STRIPE_WEBHOOK_SECRET'],
      stripePublishableKey: env['STRIPE_PUBLISHABLE_KEY'],
      planFreeEventLimit: env['PLAN_FREE_EVENT_LIMIT'],
      planStarterEventLimit: env['PLAN_STARTER_EVENT_LIMIT'],
      planProEventLimit: env['PLAN_PRO_EVENT_LIMIT'],
      planEnterpriseEventLimit: env['PLAN_ENTERPRISE_EVENT_LIMIT'],
    },

    email: {
      enabled: env['EMAIL_ENABLED'],
      provider: env['EMAIL_PROVIDER'],
      smtpHost: env['SMTP_HOST'],
      smtpPort: env['SMTP_PORT'],
      smtpSecure: env['SMTP_SECURE'],
      smtpUser: env['SMTP_USER'],
      smtpPassword: env['SMTP_PASSWORD'],
      fromAddress: env['SMTP_FROM_ADDRESS'],
      fromName: env['SMTP_FROM_NAME'],
      sendgridApiKey: env['SENDGRID_API_KEY'],
    },

    ws: {
      enabled: env['WS_ENABLED'],
      port: env['WS_PORT'],
      path: env['WS_PATH'],
      heartbeatIntervalMs: env['WS_HEARTBEAT_INTERVAL_MS'],
      maxConnectionsPerKey: env['WS_MAX_CONNECTIONS_PER_KEY'],
    },

    sentry: {
      dsn: env['SENTRY_DSN'],
      environment: env['SENTRY_ENVIRONMENT'],
    },

    dev: {
      testWebhookUrl: env['TEST_WEBHOOK_URL'],
      debugErrors: env['DEBUG_ERRORS'],
      seedOnStartup: env['SEED_ON_STARTUP'],
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('❌ Configuration validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}

// =============================================================================
// Singleton Configuration Instance
// =============================================================================

let configInstance: Config | null = null;

/**
 * Get the configuration instance
 *
 * @returns Validated configuration object
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getConfig().nodeEnv === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getConfig().nodeEnv === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getConfig().nodeEnv === 'test';
}

/**
 * Get the current service name
 */
export function getServiceName(): 'api' | 'listener' | 'worker' {
  return getConfig().serviceName;
}

/**
 * Check if current service is API
 */
export function isApiService(): boolean {
  return getServiceName() === 'api';
}

/**
 * Check if current service is Listener
 */
export function isListenerService(): boolean {
  return getServiceName() === 'listener';
}

/**
 * Check if current service is Worker
 */
export function isWorkerService(): boolean {
  return getServiceName() === 'worker';
}

/**
 * Parse duration string to milliseconds
 *
 * @param duration - Duration string (e.g., "15m", "7d", "1h")
 * @returns Duration in milliseconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Get JWT access token expiry in milliseconds
 */
export function getJwtAccessTokenExpiryMs(): number {
  return parseDuration(getConfig().auth.jwtAccessTokenExpiry);
}

/**
 * Get JWT refresh token expiry in milliseconds
 */
export function getJwtRefreshTokenExpiryMs(): number {
  return parseDuration(getConfig().auth.jwtRefreshTokenExpiry);
}

// =============================================================================
// Export Configuration
// =============================================================================

export const config = getConfig();
