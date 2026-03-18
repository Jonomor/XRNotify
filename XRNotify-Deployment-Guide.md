# XRNotify — Complete Deployment Guide

**From VS Code to Live Production**

This guide walks you through everything: assembling the project, running it locally, deploying to production, connecting to the XRPL, setting up payments, and getting your first customers.

---

## Table of Contents

1. Prerequisites — What You Need First
2. Assemble the Project in VS Code
3. Project Folder Structure
4. Install Dependencies
5. Run Locally with Docker
6. Verify Everything Works
7. Choose Your Hosting Platform
8. Deploy to Fly.io (Recommended)
9. Set Up Your Domains
10. Connect to the XRPL
11. Set Up Stripe for Payments
12. Launch Checklist
13. Cost Breakdown
14. After Launch — Getting Customers

---

## 1. Prerequisites — What You Need First

Before touching any code, make sure you have these installed on your computer:

### Required Software

| Tool | What It Does | Install |
|------|-------------|---------|
| **VS Code** | Code editor | https://code.visualstudio.com |
| **Node.js 20+** | Runs the backend and builds the frontend | https://nodejs.org (LTS version) |
| **Docker Desktop** | Runs Postgres, Redis, and Grafana locally | https://docker.com/products/docker-desktop |
| **Git** | Version control | https://git-scm.com |

### Accounts You'll Need

| Account | What For | URL |
|---------|----------|-----|
| **GitHub** | Code hosting + CI/CD | https://github.com |
| **Fly.io** | Production hosting | https://fly.io |
| **Stripe** | Payment processing | https://stripe.com |
| **Cloudflare** | DNS + docs hosting (free) | https://cloudflare.com |
| **Namecheap or similar** | Buy your domains | https://namecheap.com |

### Domains to Purchase

Buy these two domains (~$20-30 total per year):

- **xrnotify.io** — main site + API + dashboard
- **xrnotify.dev** — documentation site

You'll set up subdomains later:
- `api.xrnotify.io` → backend API
- `dashboard.xrnotify.io` → dashboard app
- `xrnotify.dev` → docs site

---

## 2. Assemble the Project in VS Code

### Step 1: Create the GitHub repo

```bash
# In your terminal
mkdir xrnotify
cd xrnotify
git init
```

### Step 2: Create the folder structure

Create these folders (empty for now — you'll drop files into them):

```bash
# Root config
mkdir -p .github/workflows
mkdir -p packages/shared/src

# Backend
mkdir -p apps/backend/src/{config,middleware,routes,services,workers,__tests__}
mkdir -p apps/backend/src/routes/{auth,webhooks,deliveries,api-keys,events,metrics}

# Dashboard
mkdir -p apps/dashboard/src/{app/{login,webhooks,deliveries,api-keys},components,lib}

# Docs
mkdir -p apps/docs/src/{app/docs,content}

# Ops
mkdir -p ops/{load/results,runbooks,grafana/dashboards}
```

### Step 3: Place the downloaded files

Take each file you downloaded from our sessions and place it in the correct path. The filename in the download → the actual file path.

Every file had its exact destination path listed when it was delivered. For example:
- `login-page.tsx` → `apps/dashboard/src/app/login/page.tsx`
- `webhooks-page.tsx` → `apps/dashboard/src/app/webhooks/page.tsx`
- `docs-landing-page.tsx` → `apps/docs/src/app/page.tsx`
- `docs-next.config.js` → `apps/docs/next.config.js`

Files with unique names (Nav.tsx, WebhookForm.tsx, etc.) go directly to their listed path.

### Step 4: Open in VS Code

```bash
code .
```

You should see the full project tree in the left sidebar.

---

## 3. Project Folder Structure

Here's what the complete structure looks like:

```
xrnotify/
├── .github/workflows/
│   ├── ci.yml                    # CI pipeline
│   └── deploy-flyio.yml          # Production deploy
├── apps/
│   ├── backend/                  # API + Worker + Listener
│   │   ├── src/
│   │   │   ├── config/           # Database, Redis, env config
│   │   │   ├── middleware/        # Auth, rate limiting, errors
│   │   │   ├── routes/           # REST API endpoints
│   │   │   ├── services/         # Business logic
│   │   │   ├── workers/          # Delivery worker, XRPL listener
│   │   │   └── __tests__/        # Test files
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── dashboard/                # Next.js dashboard app
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   ├── components/       # Shared components
│   │   │   └── lib/              # API client
│   │   └── package.json
│   └── docs/                     # Documentation site
│       ├── src/
│       │   ├── app/              # Pages
│       │   └── content/          # Markdown docs
│       └── package.json
├── ops/
│   ├── docker-compose.yml        # Local dev environment
│   ├── load/                     # k6 load tests
│   └── runbooks/                 # Operational guides
└── packages/
    └── shared/                   # Shared types and utilities
```

---

## 4. Install Dependencies

Open VS Code's terminal (Ctrl + backtick) and run:

```bash
# Install backend dependencies
cd apps/backend
npm install

# Install dashboard dependencies
cd ../dashboard
npm install

# Install docs dependencies
cd ../docs
npm install

# Back to root
cd ../..
```

---

## 5. Run Locally with Docker

This starts Postgres, Redis, and Grafana, then runs your backend, dashboard, and docs.

### Step 1: Start infrastructure

```bash
docker compose -f ops/docker-compose.yml up -d
```

This launches:
- **PostgreSQL 16** on port 5432
- **Redis 7** on port 6379
- **Grafana** on port 3001 (for monitoring dashboards)

### Step 2: Run database migrations

```bash
cd apps/backend
npm run migrate
```

This creates all the tables: tenants, webhooks, deliveries, api_keys, events, etc.

### Step 3: Start the backend

```bash
# Still in apps/backend
npm run dev
```

This starts:
- **API server** on http://localhost:4400
- **XRPL listener** (connects to public XRPL nodes)
- **Delivery worker** (processes webhook deliveries)

### Step 4: Start the dashboard (new terminal tab)

```bash
cd apps/dashboard
npm run dev
```

Dashboard runs on http://localhost:3000

### Step 5: Start the docs site (new terminal tab)

```bash
cd apps/docs
npm run dev
```

Docs site runs on http://localhost:3200

---

## 6. Verify Everything Works

### Check the API

```bash
# Health check
curl http://localhost:4400/healthz
# Expected: {"status":"ok"}

# Readiness (DB + Redis + XRPL connected)
curl http://localhost:4400/readyz
# Expected: {"status":"ready","postgres":"connected","redis":"connected","xrpl_listener":"connected"}
```

### Check the Dashboard

Open http://localhost:3000 in your browser. You should see the login page.

### Check the Docs

Open http://localhost:3200 in your browser. You should see the docs landing page.

### Create a Test Account

```bash
curl -X POST http://localhost:4400/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tenant",
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

You should get back a JWT token and tenant info. Use this to log into the dashboard.

---

## 7. Choose Your Hosting Platform

You have several options. Here's how they compare:

| Platform | Pros | Cons | Monthly Cost |
|----------|------|------|-------------|
| **Fly.io** (recommended) | Simple CLI deploys, global edge, built-in Postgres/Redis | No free tier for new orgs | ~$20-50/mo |
| **Railway** | Dead simple, great DX | Can get expensive at scale | ~$20-40/mo |
| **Render** | Free tier available, easy | Cold starts on free tier | ~$15-35/mo |
| **AWS (ECS/Fargate)** | Maximum control, scales infinitely | Complex setup, steep learning curve | ~$30-80/mo |
| **DigitalOcean App Platform** | Simple, predictable pricing | Less powerful than Fly | ~$20-40/mo |

**Recommendation: Start with Fly.io.** The deploy workflow we already built (file 105) is designed for it, and it handles Postgres + Redis as managed add-ons.

---

## 8. Deploy to Fly.io (Recommended)

### Step 1: Install the Fly CLI

```bash
# macOS
brew install flyctl

# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2: Sign up and authenticate

```bash
fly auth signup
# or if you already have an account:
fly auth login
```

### Step 3: Create the apps

```bash
# API server
fly launch --name xrnotify-api --no-deploy --region iad

# Worker (same codebase, different process)
fly launch --name xrnotify-worker --no-deploy --region iad

# Dashboard
fly launch --name xrnotify-dashboard --no-deploy --region iad

# Docs (or use Cloudflare Pages instead — free)
fly launch --name xrnotify-docs --no-deploy --region iad
```

Region codes: `iad` = US East (Virginia), `ord` = US Central, `sjc` = US West, `lhr` = London, `ams` = Amsterdam

### Step 4: Create managed Postgres

```bash
fly postgres create --name xrnotify-db --region iad
# Choose: Development (single node, included free)

# Attach to the API app (sets DATABASE_URL automatically)
fly postgres attach xrnotify-db --app xrnotify-api
```

### Step 5: Create managed Redis

```bash
fly redis create --name xrnotify-redis --region iad
# Note the connection URL it gives you
```

### Step 6: Set secrets (environment variables)

```bash
# API secrets
fly secrets set \
  REDIS_URL="redis://..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  NODE_ENV="production" \
  API_PORT="4400" \
  LOG_LEVEL="info" \
  XRPL_WSS_URL="wss://xrplcluster.com" \
  --app xrnotify-api

# Worker gets the same DB + Redis
fly secrets set \
  DATABASE_URL="postgres://..." \
  REDIS_URL="redis://..." \
  NODE_ENV="production" \
  --app xrnotify-worker

# Dashboard
fly secrets set \
  NEXT_PUBLIC_API_URL="https://api.xrnotify.io" \
  --app xrnotify-dashboard
```

### Step 7: Create fly.toml files

Create `apps/backend/fly.toml`:

```toml
app = "xrnotify-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "4400"
  NODE_ENV = "production"

[http_service]
  internal_port = 4400
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/healthz"
  timeout = "5s"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

Create `apps/backend/fly.worker.toml`:

```toml
app = "xrnotify-worker"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PROCESS_TYPE = "worker"

[processes]
  worker = "node dist/workers/delivery.js"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

### Step 8: Deploy

```bash
# Deploy API
cd apps/backend
fly deploy --app xrnotify-api

# Run migrations
fly ssh console --app xrnotify-api --command "cd /app && npm run migrate"

# Deploy worker
fly deploy --app xrnotify-worker --config fly.worker.toml

# Deploy dashboard
cd ../dashboard
fly deploy --app xrnotify-dashboard

# Verify
curl https://xrnotify-api.fly.dev/healthz
```

### Step 9: Set up GitHub Actions auto-deploy

```bash
# Get your Fly API token
fly auth token

# In GitHub → your repo → Settings → Secrets → Actions
# Add secret: FLY_API_TOKEN = (paste your token)
```

Now every push to `main` auto-deploys via the workflow we built in file 105.

---

## 9. Set Up Your Domains

### Step 1: Add domains to Cloudflare

1. Buy `xrnotify.io` and `xrnotify.dev` from your registrar
2. Sign up at cloudflare.com (free plan)
3. Add both domains to Cloudflare
4. Update nameservers at your registrar to Cloudflare's nameservers

### Step 2: Add DNS records

In Cloudflare DNS settings:

For xrnotify.io:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | api | xrnotify-api.fly.dev | DNS only (gray cloud) |
| CNAME | dashboard | xrnotify-dashboard.fly.dev | DNS only (gray cloud) |

For xrnotify.dev:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | @ | xrnotify-docs.fly.dev | DNS only (gray cloud) |

**Important:** Use "DNS only" (gray cloud icon) for Fly.io apps — Fly handles its own TLS certificates.

### Step 3: Add certificates on Fly.io

```bash
fly certs add api.xrnotify.io --app xrnotify-api
fly certs add dashboard.xrnotify.io --app xrnotify-dashboard
fly certs add xrnotify.dev --app xrnotify-docs
```

Fly issues Let's Encrypt certificates automatically. Check status:

```bash
fly certs show api.xrnotify.io --app xrnotify-api
```

### Alternative: Host docs on Cloudflare Pages (free + fast)

Instead of Fly for docs, use Cloudflare Pages:

1. Cloudflare dashboard → Pages → Create project
2. Connect your GitHub repo
3. Build settings:
   - Build command: `cd apps/docs && npm install && npm run build`
   - Build output: `apps/docs/out`
4. Add custom domain: `xrnotify.dev`

Free, global CDN, automatic deploys on push.

---

## 10. Connect to the XRPL

### IMPORTANT: You do NOT deploy anything to the XRPL

XRNotify is NOT a smart contract or on-chain application. Here's how it works:

```
┌─────────────┐   WebSocket    ┌──────────────┐   HTTP POST    ┌──────────────┐
│  XRP Ledger  │ ────────────→ │ YOUR SERVERS  │ ────────────→ │  CUSTOMER'S   │
│  (public     │  reads events │ (Fly.io)      │  delivers     │  ENDPOINTS    │
│   nodes)     │               │               │  webhooks     │              │
└─────────────┘               └──────────────┘               └──────────────┘
```

Your listener READS from the XRPL. It doesn't write to it, doesn't cost XRP, doesn't need a wallet.

### XRPL WebSocket Endpoints (Free, Public, No API Key)

```bash
# Mainnet (production — real transactions)
wss://xrplcluster.com

# Mainnet alternatives
wss://s1.ripple.com
wss://s2.ripple.com

# Testnet (development — fake transactions)
wss://s.altnet.rippletest.net:51233

# Devnet (testing — resets periodically)
wss://s.devnet.rippletest.net:51233
```

### Set the XRPL connection

For local development, create `apps/backend/.env`:
```
XRPL_WSS_URL=wss://s.altnet.rippletest.net:51233
```

For production:
```bash
fly secrets set XRPL_WSS_URL=wss://xrplcluster.com --app xrnotify-api
```

### What the listener does

The XRPL listener (already built in the backend files) does this:

1. Connects to the XRPL WebSocket endpoint
2. Subscribes to the `ledger` and `transactions` streams
3. Receives every validated transaction on the ledger in real-time
4. Normalizes each transaction into XRNotify's event schema (payment, nft.mint, etc.)
5. Pushes events into Redis streams
6. The worker picks up events from Redis and delivers them to customer webhook endpoints

No XRP wallet needed. No tokens. No gas fees. Just a WebSocket connection to free public infrastructure.

### Testing with Testnet

During development, use the XRPL Testnet to generate test transactions:

1. Go to https://xrpl.org/xrp-testnet-faucet.html
2. Generate a test wallet (free testnet XRP)
3. Send test payments between wallets
4. Your listener will pick them up and fire webhooks

---

## 11. Set Up Stripe for Payments

### Step 1: Create Stripe account

Go to https://dashboard.stripe.com/register and complete verification.

### Step 2: Create your products

In Stripe Dashboard → Products, create:

- **XRNotify Pro** — $49/month (or $99, your call), recurring
- **XRNotify Enterprise** — $499/month, recurring

### Step 3: Get your API keys

Stripe Dashboard → Developers → API Keys:
- `STRIPE_SECRET_KEY` (starts with `sk_live_...`)
- `STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_...`)

### Step 4: Create the Stripe webhook

Stripe Dashboard → Developers → Webhooks:
- Endpoint URL: `https://api.xrnotify.io/v1/billing/stripe-webhook`
- Events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copy the webhook signing secret (`whsec_...`).

### Step 5: Set Stripe secrets on Fly.io

```bash
fly secrets set \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_PUBLISHABLE_KEY="pk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRO_PRICE_ID="price_..." \
  STRIPE_ENTERPRISE_PRICE_ID="price_..." \
  --app xrnotify-api
```

### Step 6: Test with Stripe test mode first

Use test mode keys (`sk_test_...`) and test cards:
- `4242 4242 4242 4242` — always succeeds
- `4000 0000 0000 0002` — always declines

---

## 12. Launch Checklist

### Infrastructure
- [ ] API returns 200 on `https://api.xrnotify.io/healthz`
- [ ] API returns 200 on `https://api.xrnotify.io/readyz`
- [ ] Dashboard loads at `https://dashboard.xrnotify.io`
- [ ] Docs load at `https://xrnotify.dev`
- [ ] SSL certificates valid on all domains
- [ ] XRPL listener connected and receiving events

### Functionality
- [ ] Can register a new account
- [ ] Can log in to dashboard
- [ ] Can create a webhook endpoint
- [ ] Can see deliveries arriving for XRPL events
- [ ] Can create and revoke API keys
- [ ] Signature verification works
- [ ] Retry logic works (point webhook at a failing endpoint, watch retries)

### Payments
- [ ] Stripe products and prices created
- [ ] Stripe webhook receiving events
- [ ] Can upgrade from Starter to Pro
- [ ] Subscription shows correctly in dashboard
- [ ] Test payment succeeds

### Security
- [ ] JWT_SECRET is a random 64-character string
- [ ] API keys are hashed at rest
- [ ] SSRF protection blocks private IPs
- [ ] Rate limiting is active
- [ ] HTTPS enforced on all endpoints

### Monitoring
- [ ] Grafana dashboards accessible
- [ ] Prometheus metrics endpoint returning data

---

## 13. Cost Breakdown

### Minimum Viable Production (~$25-40/month)

| Service | Cost |
|---------|------|
| Fly.io API (shared-cpu-1x, 512MB) | ~$3-7/mo |
| Fly.io Worker (shared-cpu-1x, 512MB) | ~$3-7/mo |
| Fly.io Dashboard (shared-cpu-1x, 256MB) | ~$2-5/mo |
| Fly.io Postgres (Development, 1GB) | ~$0 (included) |
| Fly.io Redis (Free tier) | ~$0 |
| Cloudflare (DNS + Pages for docs) | Free |
| Domains (xrnotify.io + xrnotify.dev) | ~$25/year |
| Stripe fees | 2.9% + $0.30 per transaction |
| **Total** | **~$25-40/month** |

### Growth Stage (~$80-150/month)

| Service | Cost |
|---------|------|
| Fly.io API (2 instances, shared-cpu-2x) | ~$15-25/mo |
| Fly.io Worker (2 instances) | ~$15-25/mo |
| Fly.io Dashboard | ~$5-10/mo |
| Fly.io Postgres (Production HA) | ~$15-30/mo |
| Fly.io Redis (paid tier) | ~$10-15/mo |
| Monitoring (Grafana Cloud free tier) | Free |
| **Total** | **~$80-150/month** |

**You break even with 1-2 Pro customers at $49-99/month.**

---

## 14. After Launch — Getting Customers

### Week 1-2: Seed Users

1. Post on XRPL developer forums (Discord, Twitter, Reddit)
2. Write a launch post on your @NeutralBridge account
3. Submit to XRPL Grants — https://xrplgrants.org — they fund ecosystem tools
4. List on XRPL developer resources pages

### Week 3-4: Developer Content

5. Write tutorials: "How to build XRP payment notifications in 10 minutes"
6. Create integration guides: "Add XRPL webhooks to your Node.js app"
7. Build open-source example projects using XRNotify

### Month 2+: Growth

8. Partner with XRPL wallet teams — offer free Pro tier for integration
9. Speak at XRPL community events (you're already positioned for XRP Community Day)
10. Apply to XRPL accelerator programs

### The Neutral Bridge Angle

Your existing audience is your superpower. The people who follow your forensic analysis of Ripple's infrastructure are exactly the people who would want developer tools for the XRPL. Cross-promote XRNotify as the infrastructure layer for the infrastructure you've been writing about.

---

## Quick Reference: Daily Commands

```bash
# ---- Local Development ----
docker compose -f ops/docker-compose.yml up -d    # Start DB + Redis
cd apps/backend && npm run dev                      # Start API
cd apps/dashboard && npm run dev                    # Start dashboard
cd apps/docs && npm run dev                         # Start docs

# ---- Deploy to Production ----
git add . && git commit -m "your changes"
git push origin main                                # Auto-deploys via GitHub Actions

# ---- Manual Deploy (if needed) ----
cd apps/backend && fly deploy --app xrnotify-api
cd apps/dashboard && fly deploy --app xrnotify-dashboard

# ---- Check Production Health ----
curl https://api.xrnotify.io/healthz
curl https://api.xrnotify.io/readyz

# ---- View Production Logs ----
fly logs --app xrnotify-api
fly logs --app xrnotify-worker

# ---- SSH Into Production ----
fly ssh console --app xrnotify-api

# ---- Scale Up ----
fly scale count 2 --app xrnotify-api               # 2 API instances
fly scale vm shared-cpu-2x --app xrnotify-api       # Bigger VM
```
