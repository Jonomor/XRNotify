/**
 * @fileoverview XRNotify Me Routes
 * Current user/tenant information and usage statistics.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/me
 */

import { type FastifyPluginAsync, type FastifyRequest, type FastifyReply } from 'fastify';
import { createModuleLogger } from '../../core/logger.js';
import { queryOne, queryAll } from '../../core/db.js';
import {
  authenticateApiKey,
  getTenantId,
  type AuthContext,
} from '../../middleware/authApiKey.js';
import { createSuccessResponse, createErrorResponse } from '../index.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('me-routes');

/**
 * Tenant row from database
 */
interface TenantRow {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  events_this_period: string;
  events_limit: string;
  billing_period_start: Date;
  billing_period_end: Date;
  webhooks_limit: number;
  api_keys_limit: number;
  retention_days: number;
  replay_enabled: boolean;
  websocket_enabled: boolean;
  raw_events_enabled: boolean;
  active: boolean;
  created_at: Date;
}

/**
 * Usage daily row
 */
interface UsageDailyRow {
  date: Date;
  events_received: string;
  deliveries_total: string;
  deliveries_successful: string;
  deliveries_failed: string;
  api_requests: string;
}

/**
 * Webhook summary row
 */
interface WebhookSummaryRow {
  total: string;
  active: string;
  inactive: string;
}

/**
 * API key summary row
 */
interface ApiKeySummaryRow {
  total: string;
  active: string;
  revoked: string;
}

/**
 * Delivery stats row
 */
interface DeliveryStatsRow {
  total: string;
  delivered: string;
  failed: string;
  retrying: string;
  pending: string;
  avg_latency_ms: string | null;
}

/**
 * Me response
 */
interface MeResponse {
  tenant: {
    id: string;
    name: string;
    slug: string | null;
    plan: string;
    active: boolean;
    created_at: string;
  };
  api_key: {
    id: string;
    scopes: string[];
  };
  limits: {
    webhooks: {
      current: number;
      limit: number;
      unlimited: boolean;
    };
    api_keys: {
      current: number;
      limit: number;
      unlimited: boolean;
    };
    events: {
      current: number;
      limit: number;
      unlimited: boolean;
      period_start: string;
      period_end: string;
    };
  };
  features: {
    replay_enabled: boolean;
    websocket_enabled: boolean;
    raw_events_enabled: boolean;
    retention_days: number;
  };
}

/**
 * Usage response
 */
interface UsageResponse {
  current_period: {
    events_received: number;
    events_limit: number;
    usage_percent: number;
    period_start: string;
    period_end: string;
    days_remaining: number;
  };
  totals: {
    webhooks: number;
    api_keys: number;
    deliveries_total: number;
    deliveries_successful: number;
    deliveries_failed: number;
    success_rate: number;
  };
  daily_usage: Array<{
    date: string;
    events_received: number;
    deliveries_total: number;
    deliveries_successful: number;
    deliveries_failed: number;
    api_requests: number;
  }>;
  delivery_stats: {
    total: number;
    delivered: number;
    failed: number;
    retrying: number;
    pending: number;
    avg_latency_ms: number | null;
  };
}

/**
 * Query params for usage endpoint
 */
interface UsageQueryParams {
  days?: number;
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * Get current tenant/API key info
 */
async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const auth = request.auth as AuthContext;

  // Get tenant info
  const tenant = await queryOne<TenantRow>(
    'SELECT * FROM tenants WHERE id = $1',
    [tenantId]
  );

  if (!tenant) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Tenant not found', request.requestId)
    );
    return;
  }

  // Get current webhook count
  const webhookCount = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM webhooks WHERE tenant_id = $1 AND active = TRUE',
    [tenantId]
  );

  // Get current API key count
  const apiKeyCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM api_keys 
     WHERE tenant_id = $1 AND revoked = FALSE 
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [tenantId]
  );

  const response: MeResponse = {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      active: tenant.active,
      created_at: tenant.created_at.toISOString(),
    },
    api_key: {
      id: auth.apiKeyId,
      scopes: auth.scopes,
    },
    limits: {
      webhooks: {
        current: parseInt(webhookCount?.count ?? '0', 10),
        limit: tenant.webhooks_limit,
        unlimited: tenant.webhooks_limit === 0,
      },
      api_keys: {
        current: parseInt(apiKeyCount?.count ?? '0', 10),
        limit: tenant.api_keys_limit,
        unlimited: tenant.api_keys_limit === 0,
      },
      events: {
        current: parseInt(tenant.events_this_period, 10),
        limit: parseInt(tenant.events_limit, 10),
        unlimited: parseInt(tenant.events_limit, 10) === 0,
        period_start: tenant.billing_period_start.toISOString(),
        period_end: tenant.billing_period_end.toISOString(),
      },
    },
    features: {
      replay_enabled: tenant.replay_enabled,
      websocket_enabled: tenant.websocket_enabled,
      raw_events_enabled: tenant.raw_events_enabled,
      retention_days: tenant.retention_days,
    },
  };

  reply.send(createSuccessResponse(response, request.requestId));
}

/**
 * Get usage statistics
 */
async function getUsage(
  request: FastifyRequest<{ Querystring: UsageQueryParams }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { days = 30 } = request.query;

  // Validate days
  const safeDays = Math.min(Math.max(1, days), 90);

  // Get tenant info
  const tenant = await queryOne<TenantRow>(
    'SELECT * FROM tenants WHERE id = $1',
    [tenantId]
  );

  if (!tenant) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Tenant not found', request.requestId)
    );
    return;
  }

  // Get webhook count
  const webhookSummary = await queryOne<WebhookSummaryRow>(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE active = TRUE) as active,
      COUNT(*) FILTER (WHERE active = FALSE) as inactive
    FROM webhooks WHERE tenant_id = $1`,
    [tenantId]
  );

  // Get API key count
  const apiKeySummary = await queryOne<ApiKeySummaryRow>(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW())) as active,
      COUNT(*) FILTER (WHERE revoked = TRUE) as revoked
    FROM api_keys WHERE tenant_id = $1`,
    [tenantId]
  );

  // Get delivery stats
  const deliveryStats = await queryOne<DeliveryStatsRow>(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_latency_ms
    FROM deliveries 
    WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
    [tenantId]
  );

  // Get daily usage for the past N days
  const dailyUsage = await queryAll<UsageDailyRow>(
    `SELECT 
      date,
      events_received,
      deliveries_total,
      deliveries_successful,
      deliveries_failed,
      api_requests
    FROM usage_daily
    WHERE tenant_id = $1 AND date > CURRENT_DATE - $2::INTEGER
    ORDER BY date DESC`,
    [tenantId, safeDays]
  );

  // Calculate totals from daily usage
  const deliveryTotals = dailyUsage.reduce(
    (acc, day) => {
      acc.total += parseInt(day.deliveries_total, 10);
      acc.successful += parseInt(day.deliveries_successful, 10);
      acc.failed += parseInt(day.deliveries_failed, 10);
      return acc;
    },
    { total: 0, successful: 0, failed: 0 }
  );

  // Calculate days remaining in billing period
  const periodEnd = new Date(tenant.billing_period_end);
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate usage percent
  const eventsLimit = parseInt(tenant.events_limit, 10);
  const eventsCurrent = parseInt(tenant.events_this_period, 10);
  const usagePercent = eventsLimit === 0 
    ? 0 
    : Math.round((eventsCurrent / eventsLimit) * 100 * 100) / 100;

  // Calculate success rate
  const successRate = deliveryTotals.total === 0
    ? 100
    : Math.round((deliveryTotals.successful / deliveryTotals.total) * 100 * 100) / 100;

  const response: UsageResponse = {
    current_period: {
      events_received: eventsCurrent,
      events_limit: eventsLimit,
      usage_percent: usagePercent,
      period_start: tenant.billing_period_start.toISOString(),
      period_end: tenant.billing_period_end.toISOString(),
      days_remaining: daysRemaining,
    },
    totals: {
      webhooks: parseInt(webhookSummary?.active ?? '0', 10),
      api_keys: parseInt(apiKeySummary?.active ?? '0', 10),
      deliveries_total: deliveryTotals.total,
      deliveries_successful: deliveryTotals.successful,
      deliveries_failed: deliveryTotals.failed,
      success_rate: successRate,
    },
    daily_usage: dailyUsage.map(day => ({
      date: day.date.toISOString().split('T')[0]!,
      events_received: parseInt(day.events_received, 10),
      deliveries_total: parseInt(day.deliveries_total, 10),
      deliveries_successful: parseInt(day.deliveries_successful, 10),
      deliveries_failed: parseInt(day.deliveries_failed, 10),
      api_requests: parseInt(day.api_requests, 10),
    })),
    delivery_stats: {
      total: parseInt(deliveryStats?.total ?? '0', 10),
      delivered: parseInt(deliveryStats?.delivered ?? '0', 10),
      failed: parseInt(deliveryStats?.failed ?? '0', 10),
      retrying: parseInt(deliveryStats?.retrying ?? '0', 10),
      pending: parseInt(deliveryStats?.pending ?? '0', 10),
      avg_latency_ms: deliveryStats?.avg_latency_ms 
        ? Math.round(parseFloat(deliveryStats.avg_latency_ms))
        : null,
    },
  };

  reply.send(createSuccessResponse(response, request.requestId));
}

/**
 * Get event type breakdown
 */
async function getEventBreakdown(
  request: FastifyRequest<{ Querystring: UsageQueryParams }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { days = 30 } = request.query;

  const safeDays = Math.min(Math.max(1, days), 90);

  // Get event type breakdown from deliveries
  const eventBreakdown = await queryAll<{
    event_type: string;
    count: string;
    delivered: string;
    failed: string;
  }>(
    `SELECT 
      event_type,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM deliveries
    WHERE tenant_id = $1 AND created_at > NOW() - $2::INTEGER * INTERVAL '1 day'
    GROUP BY event_type
    ORDER BY count DESC`,
    [tenantId, safeDays]
  );

  const breakdown = eventBreakdown.map(row => ({
    event_type: row.event_type,
    total: parseInt(row.count, 10),
    delivered: parseInt(row.delivered, 10),
    failed: parseInt(row.failed, 10),
    success_rate: parseInt(row.count, 10) === 0 
      ? 100 
      : Math.round((parseInt(row.delivered, 10) / parseInt(row.count, 10)) * 100 * 100) / 100,
  }));

  reply.send(createSuccessResponse({
    period_days: safeDays,
    event_types: breakdown,
    total_event_types: breakdown.length,
  }, request.requestId));
}

/**
 * Get webhook health overview
 */
async function getWebhookHealth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);

  // Get webhook health from view
  const webhookHealth = await queryAll<{
    id: string;
    url: string;
    health_status: string;
    consecutive_failures: number;
    last_success_at: Date | null;
    last_failure_at: Date | null;
    last_failure_reason: string | null;
    success_rate_all_time: string | null;
    active: boolean;
  }>(
    `SELECT 
      w.id,
      w.url,
      CASE 
        WHEN w.consecutive_failures >= 50 THEN 'critical'
        WHEN w.consecutive_failures >= 10 THEN 'warning'
        WHEN w.consecutive_failures >= 1 THEN 'degraded'
        ELSE 'healthy'
      END as health_status,
      w.consecutive_failures,
      w.last_success_at,
      w.last_failure_at,
      w.last_failure_reason,
      CASE 
        WHEN w.total_deliveries > 0 
        THEN ROUND((w.successful_deliveries::NUMERIC / w.total_deliveries) * 100, 2)
        ELSE 100
      END as success_rate_all_time,
      w.active
    FROM webhooks w
    WHERE w.tenant_id = $1
    ORDER BY w.consecutive_failures DESC, w.created_at DESC`,
    [tenantId]
  );

  // Summarize health
  const summary = {
    total: webhookHealth.length,
    healthy: webhookHealth.filter(w => w.health_status === 'healthy').length,
    degraded: webhookHealth.filter(w => w.health_status === 'degraded').length,
    warning: webhookHealth.filter(w => w.health_status === 'warning').length,
    critical: webhookHealth.filter(w => w.health_status === 'critical').length,
    inactive: webhookHealth.filter(w => !w.active).length,
  };

  const webhooks = webhookHealth.map(w => ({
    id: w.id,
    url: w.url,
    health_status: w.health_status,
    active: w.active,
    consecutive_failures: w.consecutive_failures,
    last_success_at: w.last_success_at?.toISOString() ?? null,
    last_failure_at: w.last_failure_at?.toISOString() ?? null,
    last_failure_reason: w.last_failure_reason,
    success_rate: w.success_rate_all_time ? parseFloat(w.success_rate_all_time) : 100,
  }));

  reply.send(createSuccessResponse({
    summary,
    webhooks,
  }, request.requestId));
}

/**
 * Get plan details and upgrade options
 */
async function getPlanInfo(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);

  // Get tenant info
  const tenant = await queryOne<TenantRow>(
    'SELECT * FROM tenants WHERE id = $1',
    [tenantId]
  );

  if (!tenant) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Tenant not found', request.requestId)
    );
    return;
  }

  // Define plan details
  const plans = {
    free: {
      name: 'Free',
      price_monthly: 0,
      price_yearly: 0,
      events_limit: 10000,
      webhooks_limit: 3,
      api_keys_limit: 2,
      retention_days: 7,
      features: ['Basic event types', '7-day retention', 'Email support'],
    },
    starter: {
      name: 'Starter',
      price_monthly: 29,
      price_yearly: 290,
      events_limit: 100000,
      webhooks_limit: 10,
      api_keys_limit: 5,
      retention_days: 30,
      features: ['All event types', '30-day retention', 'Event replay', 'Priority support'],
    },
    pro: {
      name: 'Pro',
      price_monthly: 99,
      price_yearly: 990,
      events_limit: 1000000,
      webhooks_limit: 50,
      api_keys_limit: 20,
      retention_days: 90,
      features: ['All event types', '90-day retention', 'Event replay', 'WebSocket streaming', 'Raw event data', 'Dedicated support'],
    },
    enterprise: {
      name: 'Enterprise',
      price_monthly: null,
      price_yearly: null,
      events_limit: null,
      webhooks_limit: null,
      api_keys_limit: null,
      retention_days: 365,
      features: ['Unlimited everything', '365-day retention', 'Custom integrations', 'SLA', 'Dedicated account manager', 'On-premise option'],
    },
  };

  const currentPlan = plans[tenant.plan as keyof typeof plans] ?? plans.free;
  
  // Calculate upgrade recommendations
  const eventsUsage = parseInt(tenant.events_this_period, 10);
  const eventsLimit = parseInt(tenant.events_limit, 10);
  const usagePercent = eventsLimit > 0 ? (eventsUsage / eventsLimit) * 100 : 0;

  let recommendedUpgrade: string | null = null;
  let upgradeReason: string | null = null;

  if (usagePercent >= 80 && tenant.plan !== 'enterprise') {
    if (tenant.plan === 'free') {
      recommendedUpgrade = 'starter';
      upgradeReason = 'You\'re using 80%+ of your event limit. Upgrade to Starter for 10x more events.';
    } else if (tenant.plan === 'starter') {
      recommendedUpgrade = 'pro';
      upgradeReason = 'You\'re using 80%+ of your event limit. Upgrade to Pro for 10x more events.';
    } else if (tenant.plan === 'pro') {
      recommendedUpgrade = 'enterprise';
      upgradeReason = 'You\'re approaching your event limit. Contact us for Enterprise pricing.';
    }
  }

  reply.send(createSuccessResponse({
    current_plan: {
      type: tenant.plan,
      ...currentPlan,
    },
    usage: {
      events_used: eventsUsage,
      events_limit: eventsLimit,
      usage_percent: Math.round(usagePercent * 100) / 100,
    },
    available_plans: plans,
    upgrade_recommendation: recommendedUpgrade ? {
      plan: recommendedUpgrade,
      reason: upgradeReason,
    } : null,
  }, request.requestId));
}

/**
 * Get rate limit status
 */
async function getRateLimitStatus(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = request.auth as AuthContext;

  reply.send(createSuccessResponse({
    api_key_id: auth.apiKeyId,
    rate_limit: {
      max_requests: auth.rateLimitMax,
      window_ms: auth.rateLimitWindowMs,
      window_seconds: Math.round(auth.rateLimitWindowMs / 1000),
    },
    // Note: Actual current usage would require Redis lookup
    // This is just the configured limits
  }, request.requestId));
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Me routes plugin
 */
export const meRoutes: FastifyPluginAsync = async (server) => {
  // Get current tenant/API key info
  server.get(
    '/',
    {
      preHandler: [authenticateApiKey],
      schema: {
        description: 'Get current tenant and API key information',
        tags: ['Me'],
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
        },
      },
    },
    getMe
  );

  // Get usage statistics
  server.get<{ Querystring: UsageQueryParams }>(
    '/usage',
    {
      preHandler: [authenticateApiKey],
      schema: {
        description: 'Get usage statistics for the current tenant',
        tags: ['Me'],
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
          },
        },
      },
    },
    getUsage
  );

  // Get event type breakdown
  server.get<{ Querystring: UsageQueryParams }>(
    '/events',
    {
      preHandler: [authenticateApiKey],
      schema: {
        description: 'Get event type breakdown',
        tags: ['Me'],
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
          },
        },
      },
    },
    getEventBreakdown
  );

  // Get webhook health
  server.get(
    '/webhooks/health',
    {
      preHandler: [authenticateApiKey],
      schema: {
        description: 'Get webhook health overview',
        tags: ['Me'],
      },
    },
    getWebhookHealth
  );

  // Get plan info
  server.get(
    '/plan',
    {
      preHandler: [authenticateApiKey],
      schema: {
        description: 'Get current plan details and upgrade options',
        tags: ['Me'],
      },
    },
    getPlanInfo
  );

  // Get rate limit status
  server.get(
    '/rate-limit',
    {
      preHandler: [authenticateApiKey],
      schema: {
        description: 'Get current rate limit configuration',
        tags: ['Me'],
      },
    },
    getRateLimitStatus
  );

  logger.info('Me routes registered');
};

// =============================================================================
// Export
// =============================================================================

export default meRoutes;
