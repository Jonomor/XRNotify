# XRNotify — Complete Build Documentation

## Product Overview

**XRNotify** is a production-grade, real-time webhook notification platform for the XRP Ledger (XRPL). It enables developers to subscribe to blockchain events and receive instant HTTP callbacks without running their own node infrastructure.

### Core Value Proposition
- **For developers**: Replace 3-6 months of custom infrastructure work with a single API call
- **For businesses**: Reliable, scalable event delivery with enterprise-grade guarantees
- **Market position**: "The Stripe Webhooks of the XRP Ledger" — first purpose-built webhook infrastructure for XRPL

### Domains
- **Marketing/Dashboard**: xrnotify.io
- **Developer/API/Docs**: xrnotify.dev

---

## Complete File Tree (105 Files)

```
xrnotify/
├── .editorconfig                                    # Editor formatting rules
├── .env.example                                     # Environment variables template
├── .gitignore                                       # Git ignore patterns
├── .github/
│   └── workflows/
│       ├── ci.yml                                   # CI pipeline (lint, test, build, docker)
│       └── deploy-flyio.yml                         # Fly.io deployment workflow
├── README.md                                        # Project documentation
├── package.json                                     # Root workspace package
├── pnpm-workspace.yaml                              # pnpm workspace configuration
├── tsconfig.base.json                               # Shared TypeScript config
│
├── apps/
│   └── platform/                                    # Next.js 14 Application
│       ├── middleware.ts                            # Auth middleware (session/API key)
│       ├── next.config.mjs                          # Next.js configuration
│       ├── package.json                             # Platform dependencies
│       ├── postcss.config.js                        # PostCSS for Tailwind
│       ├── tailwind.config.ts                       # Tailwind CSS configuration
│       ├── tsconfig.json                            # Platform TypeScript config
│       └── src/
│           ├── app/                                 # Next.js App Router
│           │   ├── layout.tsx                       # Root layout with providers
│           │   ├── page.tsx                         # Landing page
│           │   ├── login/
│           │   │   └── page.tsx                     # Login page
│           │   ├── signup/
│           │   │   └── page.tsx                     # Signup page
│           │   ├── dashboard/
│           │   │   ├── page.tsx                     # Dashboard overview
│           │   │   ├── webhooks/
│           │   │   │   └── page.tsx                 # Webhook management
│           │   │   ├── deliveries/
│           │   │   │   └── page.tsx                 # Delivery logs
│           │   │   └── api-keys/
│           │   │       └── page.tsx                 # API key management
│           │   └── api/                             # API Routes
│           │       ├── health/
│           │       │   └── route.ts                 # GET /api/health (liveness)
│           │       ├── metrics/
│           │       │   └── route.ts                 # GET /api/metrics (Prometheus)
│           │       └── v1/
│           │           ├── auth/
│           │           │   └── session/
│           │           │       └── route.ts         # POST login, DELETE logout
│           │           ├── me/
│           │           │   └── route.ts             # GET current user/tenant
│           │           ├── api-keys/
│           │           │   ├── route.ts             # GET list, POST create
│           │           │   └── [id]/
│           │           │       └── route.ts         # GET, DELETE by ID
│           │           ├── webhooks/
│           │           │   ├── route.ts             # GET list, POST create
│           │           │   └── [id]/
│           │           │       ├── route.ts         # GET, PATCH, DELETE by ID
│           │           │       └── deliveries/
│           │           │           └── route.ts     # GET deliveries for webhook
│           │           ├── deliveries/
│           │           │   ├── route.ts             # GET list all deliveries
│           │           │   └── [id]/
│           │           │       └── route.ts         # GET delivery by ID
│           │           ├── events/
│           │           │   └── route.ts             # GET list events
│           │           └── replay/
│           │               └── route.ts             # POST replay events
│           ├── components/                          # React Components
│           │   ├── Nav.tsx                          # Navigation sidebar
│           │   ├── WebhookForm.tsx                  # Webhook create/edit form
│           │   ├── WebhookTable.tsx                 # Webhook listing table
│           │   ├── DeliveryTable.tsx                # Delivery logs table
│           │   └── MetricCards.tsx                  # Dashboard metric cards
│           ├── lib/                                 # Platform Libraries
│           │   ├── config.ts                        # Environment configuration
│           │   ├── logger.ts                        # Pino structured logging
│           │   ├── db.ts                            # PostgreSQL connection pool
│           │   ├── redis.ts                         # Redis client + streams
│           │   ├── metrics.ts                       # Prometheus metrics
│           │   ├── auth/
│           │   │   ├── apiKey.ts                    # API key auth (X-XRNotify-Key)
│           │   │   └── session.ts                   # JWT session management
│           │   ├── webhooks/
│           │   │   ├── service.ts                   # Webhook CRUD operations
│           │   │   └── urlPolicy.ts                 # SSRF protection, URL validation
│           │   ├── deliveries/
│           │   │   └── service.ts                   # Delivery logging & queries
│           │   ├── rate-limit/
│           │   │   └── tokenBucket.ts               # Redis token bucket rate limiter
│           │   ├── xrpl/
│           │   │   ├── normalize.ts                 # Event normalization
│           │   │   └── parsers/
│           │   │       ├── payment.ts               # Payment transaction parser
│           │   │       ├── nft.ts                   # NFT transaction parser
│           │   │       ├── dex.ts                   # DEX transaction parser
│           │   │       └── trustline.ts             # Trustline transaction parser
│           │   ├── db/
│           │   │   ├── migrate.ts                   # Migration runner
│           │   │   └── migrations/
│           │   │       ├── 001_initial.sql          # Tenants, API keys
│           │   │       ├── 002_webhooks.sql         # Webhooks table
│           │   │       ├── 003_events.sql           # Events table
│           │   │       ├── 004_deliveries.sql       # Deliveries table
│           │   │       ├── 005_usage.sql            # Usage tracking
│           │   │       └── 006_indexes.sql          # Performance indexes
│           │   └── __tests__/
│           │       ├── signature.test.ts            # HMAC signature tests
│           │       └── webhooks.test.ts             # Webhook URL/SSRF tests
│           └── styles/
│               └── globals.css                      # Tailwind global styles
│
├── packages/
│   └── shared/                                      # Shared Package
│       ├── package.json                             # Shared dependencies
│       ├── tsconfig.json                            # Shared TypeScript config
│       └── src/
│           ├── index.ts                             # Public exports
│           ├── types/
│           │   └── index.ts                         # XrplEvent, EventType, API types
│           ├── crypto/
│           │   └── index.ts                         # HMAC signing, API key hashing
│           ├── validation/
│           │   └── index.ts                         # Zod schemas for all inputs
│           └── utils/
│               └── index.ts                         # ID generation, time utilities
│
├── workers/
│   ├── webhook-worker/                              # Webhook Delivery Worker
│   │   ├── package.json                             # Worker dependencies
│   │   ├── tsconfig.json                            # Worker TypeScript config
│   │   └── src/
│   │       ├── index.ts                             # Main entry point
│   │       ├── consumer.ts                          # Redis Streams consumer
│   │       ├── deliver.ts                           # HTTP delivery with signing
│   │       ├── retry.ts                             # Exponential backoff + queue
│   │       ├── dlq.ts                               # Dead letter queue
│   │       ├── idempotency.ts                       # Exactly-once delivery
│   │       ├── sign.ts                              # HMAC signature utilities
│   │       └── metrics.ts                           # Prometheus worker metrics
│   │
│   └── xrpl-listener/                               # XRPL Event Listener
│       ├── package.json                             # Listener dependencies
│       ├── tsconfig.json                            # Listener TypeScript config
│       └── src/
│           ├── index.ts                             # Main entry point
│           ├── client.ts                            # XRPL WebSocket client
│           ├── cursor.ts                            # Ledger cursor management
│           ├── normalize.ts                         # Transaction normalization
│           └── parsers/
│               ├── payment.ts                       # Payment parser
│               ├── nft.ts                           # NFT parser
│               ├── dex.ts                           # DEX parser
│               └── trustline.ts                     # Trustline parser
│
└── ops/                                             # Operations & Infrastructure
    ├── docker-compose.yml                           # Local dev environment
    ├── docker/
    │   ├── Dockerfile.web                           # Platform container
    │   ├── Dockerfile.worker                        # Webhook worker container
    │   ├── Dockerfile.listener                      # XRPL listener container
    │   └── init-db.sql                              # Database initialization
    ├── monitoring/
    │   ├── prometheus.yml                           # Prometheus configuration
    │   └── grafana/
    │       ├── dashboards/
    │       │   └── xrnotify-overview.json           # Grafana dashboard
    │       └── provisioning/
    │           ├── dashboards/
    │           │   └── dashboards.yml               # Dashboard provisioning
    │           └── datasources/
    │               └── datasource.yml               # Prometheus datasource
    └── runbooks/
        ├── DEPLOY_FLYIO.md                          # Fly.io deployment guide
        └── INCIDENT_RESPONSE.md                     # Incident response procedures
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              XRNotify Platform                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │   XRP Ledger     │                                                        │
│  │   (Mainnet)      │                                                        │
│  └────────┬─────────┘                                                        │
│           │ WebSocket                                                        │
│           ▼                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     │
│  │  XRPL Listener   │────▶│   Redis Streams  │────▶│  Webhook Worker  │────▶│ Customer
│  │  (xrpl.js)       │     │   (Event Queue)  │     │  (HTTP Delivery) │     │ Endpoints
│  └──────────────────┘     └──────────────────┘     └──────────────────┘     │
│           │                        │                        │                │
│           │                        │                        │                │
│           ▼                        ▼                        ▼                │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                     PostgreSQL Database                            │      │
│  │  • tenants  • api_keys  • webhooks  • events  • deliveries        │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     │
│  │   Next.js API    │     │  Next.js Dashboard│    │   Prometheus     │     │
│  │   (REST + Auth)  │     │  (React UI)       │    │   + Grafana      │     │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React, Tailwind CSS | Dashboard UI |
| **API** | Next.js Route Handlers | REST API endpoints |
| **Database** | PostgreSQL 16 | Persistent storage |
| **Queue** | Redis Streams | Event queue, consumer groups |
| **Cache** | Redis | Rate limiting, sessions, idempotency |
| **Blockchain** | xrpl.js | XRPL WebSocket connection |
| **Auth** | JWT + bcrypt | Sessions and API keys |
| **Monitoring** | Prometheus + Grafana | Metrics and dashboards |
| **Logging** | Pino | Structured JSON logs |
| **Validation** | Zod | Runtime type validation |
| **Deployment** | Docker + Fly.io | Containerized deployment |

---

## Supported XRPL Event Types

| Category | Event Types | Description |
|----------|-------------|-------------|
| **Payments** | `payment.xrp`, `payment.issued` | XRP and token transfers |
| **NFTs** | `nft.minted`, `nft.burned`, `nft.offer_created`, `nft.offer_accepted`, `nft.offer_cancelled`, `nft.transfer` | Full NFT lifecycle |
| **DEX** | `dex.offer_created`, `dex.offer_filled`, `dex.offer_partial`, `dex.offer_cancelled` | Decentralized exchange |
| **Trustlines** | `trustline.created`, `trustline.modified`, `trustline.deleted` | Token trust settings |
| **Escrow** | `escrow.created`, `escrow.finished`, `escrow.cancelled` | Time-locked payments |
| **Checks** | `check.created`, `check.cashed`, `check.cancelled` | Deferred payments |

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| **API Key Storage** | SHA-256 hashed at rest, never stored in plaintext |
| **Webhook Signing** | HMAC-SHA256 with per-webhook secrets |
| **SSRF Protection** | Block private IPs, localhost, metadata endpoints |
| **Rate Limiting** | Redis token bucket per API key |
| **Input Validation** | Zod schemas on all public endpoints |
| **Session Security** | httpOnly cookies, secure flag, same-site strict |
| **HTTPS Enforcement** | Required in production for webhook URLs |

---

## Reliability Features

| Feature | Implementation |
|---------|----------------|
| **Exactly-Once Delivery** | `(webhook_id, event_id)` idempotency |
| **Automatic Retries** | Exponential backoff with ±25% jitter |
| **Dead Letter Queue** | Failed deliveries preserved for inspection |
| **Event Replay** | Re-deliver historical events on demand |
| **Ledger Cursor** | Resume from last processed ledger after restart |
| **Consumer Groups** | Horizontal scaling with Redis Streams |
| **Graceful Shutdown** | Clean connection termination |

---

## Comparison: xrnotify1 vs xrnotify (New Build)

### What's in xrnotify1 (Original) that's NOT in the new build:

| Item | Status | Recommendation |
|------|--------|----------------|
| `Dockerfile` (root) | ❌ Missing | Use `ops/docker/Dockerfile.*` instead (more specific) |
| `docker-compose.yml` (root) | ❌ Missing | Use `ops/docker-compose.yml` instead |
| `migrations/` (root) | ❌ Missing | Now in `apps/platform/src/lib/db/migrations/` |
| `monitoring/` (root) | ❌ Missing | Now in `ops/monitoring/` |
| `src/` (root) | ❌ Missing | Was likely old Fastify backend — replaced by Next.js in `apps/platform/` |
| `tsconfig.json` (root) | ❌ Missing | Use `tsconfig.base.json` (workspaces extend it) |
| `XRNotify-DeploymentGuide.md` | ❌ Missing | Use `ops/runbooks/DEPLOY_FLYIO.md` instead |
| `cleanup-duplicates.sh` | ❌ Missing | Utility script — add if needed |

### What's NEW in xrnotify (New Build):

| Item | Description |
|------|-------------|
| `workers/` directory | Separate worker processes (webhook-worker, xrpl-listener) |
| `.github/workflows/` | CI/CD pipelines for GitHub Actions |
| `ops/runbooks/` | Operational documentation |
| Modular worker files | `consumer.ts`, `deliver.ts`, `retry.ts`, `dlq.ts`, `idempotency.ts`, `sign.ts`, `metrics.ts` |
| Modular listener files | `client.ts`, `cursor.ts`, `normalize.ts`, `parsers/*` |
| Test files | `__tests__/signature.test.ts`, `__tests__/webhooks.test.ts` |

---

## Recommendations

### 1. **Merge from xrnotify1** (Consider keeping)

```bash
# If you have custom deployment guides
cp xrnotify1/XRNotify-DeploymentGuide.md xrnotify/ops/runbooks/

# If you have utility scripts
cp xrnotify1/cleanup-duplicates.sh xrnotify/scripts/
```

### 2. **Add Missing Files** (Recommended additions)

| File | Purpose |
|------|---------|
| `fly.web.toml` | Fly.io config for web service |
| `fly.worker.toml` | Fly.io config for webhook worker |
| `fly.listener.toml` | Fly.io config for XRPL listener |
| `apps/platform/src/app/docs/page.tsx` | Documentation page |
| `apps/platform/src/app/pricing/page.tsx` | Pricing page |
| `apps/platform/src/app/api/v1/billing/route.ts` | Stripe billing integration |
| `apps/platform/src/app/api/v1/usage/route.ts` | Usage stats endpoint |
| `apps/platform/src/lib/billing/stripe.ts` | Stripe service |
| `packages/shared/src/sdk/` | Customer SDK (Node.js, Python, Go) |

### 3. **Production Checklist**

- [ ] Set up Fly.io apps: `xrnotify-web`, `xrnotify-worker`, `xrnotify-listener`
- [ ] Provision PostgreSQL (Fly Postgres or Supabase)
- [ ] Provision Redis (Upstash or Fly Redis)
- [ ] Configure DNS for xrnotify.io and xrnotify.dev
- [ ] Set up Stripe for billing
- [ ] Configure Cloudflare for DDoS protection
- [ ] Set up error tracking (Sentry)
- [ ] Set up log aggregation (Logtail, Datadog)
- [ ] Create customer documentation site

### 4. **Before First Deploy**

```bash
# 1. Install dependencies
cd xrnotify
pnpm install

# 2. Build shared package first
pnpm --filter @xrnotify/shared build

# 3. Run migrations locally
docker compose -f ops/docker-compose.yml up -d postgres redis
pnpm --filter @xrnotify/platform db:migrate

# 4. Start development
pnpm dev

# 5. Run tests
pnpm test
```

### 5. **Environment Variables Needed**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/xrnotify

# Redis  
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=<random-64-bytes-hex>
ENCRYPTION_KEY=<random-32-bytes-hex>

# XRPL
XRPL_NODES=wss://xrplcluster.com,wss://s1.ripple.com
XRPL_NETWORK=mainnet

# Stripe (when ready)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
SENTRY_DSN=https://...
LOG_LEVEL=info
```

---

## Summary

The new `xrnotify` build is a **clean, modular, production-ready** implementation that follows the SPEC_ANCHOR_ID: XRNOTIFY-SPEC-V1 exactly. It replaces the older monolithic structure with:

1. **Proper monorepo structure** with pnpm workspaces
2. **Separated concerns** (platform, workers, shared)
3. **Modular worker code** (easier to maintain and test)
4. **CI/CD pipelines** ready for GitHub Actions
5. **Operational runbooks** for deployment and incidents

The main things to consider from `xrnotify1`:
- Any custom deployment documentation you wrote
- Any utility scripts you created
- Your existing `pnpm-lock.yaml` (if you want to preserve exact versions)

**Recommendation**: Use the new `xrnotify` as your base and selectively merge any custom content from `xrnotify1`.
