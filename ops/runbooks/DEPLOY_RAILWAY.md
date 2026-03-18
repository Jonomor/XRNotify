# XRNotify — Railway Deployment Guide

**From VS Code to Live Production on Railway**

This guide walks you through deploying XRNotify to Railway, connecting custom domains, and getting everything running in production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create Railway Project](#2-create-railway-project)
3. [Add Database Services](#3-add-database-services)
4. [Deploy the Web Service](#4-deploy-the-web-service)
5. [Deploy the Worker Service](#5-deploy-the-worker-service)
6. [Deploy the Listener Service](#6-deploy-the-listener-service)
7. [Set Environment Variables](#7-set-environment-variables)
8. [Run Database Migrations](#8-run-database-migrations)
9. [Configure Custom Domain](#9-configure-custom-domain)
10. [Verify Deployment](#10-verify-deployment)
11. [Cost Breakdown](#11-cost-breakdown)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### Required Accounts

| Account | Purpose | URL |
|---------|---------|-----|
| **GitHub** | Code hosting | https://github.com |
| **Railway** | Production hosting | https://railway.app |
| **Stripe** | Payment processing | https://stripe.com |
| **Domain registrar** | xrnotify.io domain | Any registrar |

### Required Software (for local development)

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js 20+ | Runtime | https://nodejs.org |
| pnpm | Package manager | `npm install -g pnpm` |
| Docker Desktop | Local Postgres/Redis | https://docker.com |

### Domain

Purchase `xrnotify.io` from any registrar (~$30/year for .io).

---

## 2. Create Railway Project

### Step 1: Sign in to Railway

Go to https://railway.app and sign in with GitHub.

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select **Jonomor/XRNotify**
4. Railway will create a project and start building

### Step 3: Name Your Project

- Project name: `xrnotify`
- This creates a project at `xrnotify.up.railway.app`

---

## 3. Add Database Services

### Add PostgreSQL

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway provisions a managed Postgres instance
4. The `DATABASE_URL` variable is automatically available

### Add Redis

1. Click **"+ New"** again
2. Select **"Database"** → **"Redis"**
3. Railway provisions a managed Redis instance
4. The `REDIS_URL` variable is automatically available

Your project now has:
- `web` service (from GitHub)
- `PostgreSQL` service
- `Redis` service

---

## 4. Deploy the Web Service

The web service is your Next.js platform (API + Dashboard).

### Configure Build Settings

1. Click on the web service
2. Go to **Settings** → **Build**
3. Set:
   - **Builder**: Nixpacks
   - **Build Command**: `pnpm install && pnpm --filter @xrnotify/shared build && pnpm --filter @xrnotify/platform build`
   - **Start Command**: `node apps/platform/.next/standalone/server.js`

### Configure Deploy Settings

1. Go to **Settings** → **Deploy**
2. Set:
   - **Port**: 3000
   - **Health Check Path**: `/api/health`

### Deploy

Click **"Deploy"** or push to your GitHub repo (auto-deploys on push).

---

## 5. Deploy the Worker Service

The worker service delivers webhooks to customer endpoints.

### Create Worker Service

1. In your project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repo: **Jonomor/XRNotify**
3. Name it: `worker`

### Configure Build Settings

1. Click on the worker service
2. Go to **Settings** → **Build**
3. Set:
   - **Build Command**: `pnpm install && pnpm --filter @xrnotify/shared build && pnpm --filter @xrnotify/webhook-worker build`
   - **Start Command**: `node workers/webhook-worker/dist/index.js`

### Configure Deploy Settings

1. Go to **Settings** → **Deploy**
2. **Do NOT set a port** — this is a background worker

---

## 6. Deploy the Listener Service

The listener service connects to XRPL and processes blockchain events.

### Create Listener Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the same repo: **Jonomor/XRNotify**
3. Name it: `listener`

### Configure Build Settings

1. Click on the listener service
2. Go to **Settings** → **Build**
3. Set:
   - **Build Command**: `pnpm install && pnpm --filter @xrnotify/shared build && pnpm --filter @xrnotify/xrpl-listener build`
   - **Start Command**: `node workers/xrpl-listener/dist/index.js`

### Configure Deploy Settings

1. Go to **Settings** → **Deploy**
2. **Do NOT set a port** — this is a background worker

---

## 7. Set Environment Variables

### Shared Variables (set on ALL services)

Railway auto-injects `DATABASE_URL` and `REDIS_URL` if you link the databases.

To link databases to each service:
1. Click on a service → **Variables**
2. Click **"Add Reference"**
3. Select `PostgreSQL` → `DATABASE_URL`
4. Select `Redis` → `REDIS_URL`

### Web Service Variables

Go to `web` service → **Variables** → **Raw Editor** and add:

```bash
# Auth
JWT_SECRET=<generate-64-random-hex-bytes>
ENCRYPTION_KEY=<generate-32-random-hex-bytes>

# App
NEXT_PUBLIC_APP_URL=https://xrnotify.io
NODE_ENV=production
LOG_LEVEL=info

# Stripe (add when ready)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Worker Service Variables

Go to `worker` service → **Variables** and add:

```bash
NODE_ENV=production
LOG_LEVEL=info
```

Plus link `DATABASE_URL` and `REDIS_URL` from databases.

### Listener Service Variables

Go to `listener` service → **Variables** and add:

```bash
XRPL_NODES=wss://xrplcluster.com,wss://s1.ripple.com
XRPL_NETWORK=mainnet
NODE_ENV=production
LOG_LEVEL=info
```

Plus link `DATABASE_URL` and `REDIS_URL` from databases.

### Generate Secrets

```bash
# Generate JWT_SECRET (64 bytes hex)
openssl rand -hex 64

# Generate ENCRYPTION_KEY (32 bytes hex)
openssl rand -hex 32
```

---

## 8. Run Database Migrations

### Option A: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run pnpm --filter @xrnotify/platform db:migrate
```

### Option B: Add Migration to Build

Add to web service build command:
```bash
pnpm install && pnpm --filter @xrnotify/shared build && pnpm --filter @xrnotify/platform build && pnpm --filter @xrnotify/platform db:migrate
```

This runs migrations on every deploy.

---

## 9. Configure Custom Domain

### Step 1: Add Domain in Railway

1. Go to `web` service → **Settings** → **Networking**
2. Click **"Generate Domain"** to get a `.railway.app` URL first
3. Click **"+ Custom Domain"**
4. Enter: `xrnotify.io`

### Step 2: Configure DNS

At your domain registrar, add these records:

| Type | Name | Value |
|------|------|-------|
| CNAME | @ | `<your-service>.up.railway.app` |
| CNAME | www | `<your-service>.up.railway.app` |

Or use an A record if your registrar doesn't support CNAME at root:
- Railway will show you the IP address to use

### Step 3: Wait for SSL

Railway automatically provisions SSL certificates via Let's Encrypt. This takes 1-5 minutes after DNS propagates.

### Step 4: Verify

```bash
curl https://xrnotify.io/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## 10. Verify Deployment

### Health Checks

```bash
# API health
curl https://xrnotify.io/api/health

# Prometheus metrics
curl https://xrnotify.io/api/metrics
```

### Check Service Logs

In Railway dashboard, click on any service → **Logs** to see real-time output.

### Verify XRPL Connection

Check listener logs for:
```
Connected to XRPL node: wss://xrplcluster.com
Subscribed to ledger stream
Processing ledger 12345678...
```

### Test the Dashboard

1. Go to https://xrnotify.io
2. Click "Sign Up"
3. Create an account
4. Create a webhook
5. Verify delivery logs populate

---

## 11. Cost Breakdown

### Railway Pricing (Usage-Based)

| Resource | Cost |
|----------|------|
| Compute | $0.000231/minute (~$10/mo for always-on) |
| Memory | $0.000231/GB/minute |
| PostgreSQL | $5/mo (starter) |
| Redis | $5/mo (starter) |
| Bandwidth | $0.10/GB after 100GB free |

### Estimated Monthly Costs

| Stage | Services | Estimate |
|-------|----------|----------|
| **MVP** | 3 services + Postgres + Redis | ~$30-50/mo |
| **Growth** | Scaled services | ~$80-150/mo |
| **Scale** | Multiple replicas | ~$200-400/mo |

**Break-even: 1 Pro customer at $99/mo covers infrastructure.**

---

## 12. Troubleshooting

### Build Fails

Check build logs in Railway. Common issues:
- Missing `pnpm-lock.yaml` — run `pnpm install` locally first
- TypeScript errors — fix locally before pushing
- Missing environment variables — add required vars

### Service Won't Start

1. Check **Logs** tab for errors
2. Verify `DATABASE_URL` and `REDIS_URL` are linked
3. Verify start command is correct

### Database Connection Fails

1. Ensure database service is running
2. Check variable reference is correct
3. Try redeploying after adding reference

### XRPL Listener Not Connecting

1. Check `XRPL_NODES` is set correctly
2. Try alternate node: `wss://s1.ripple.com`
3. Check listener logs for connection errors

### SSL Certificate Not Issued

1. Verify DNS records are correct
2. Wait 5-10 minutes for propagation
3. Check Railway dashboard for certificate status

---

## Quick Reference

### Railway CLI Commands

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Run command in service context
railway run <command>

# Open dashboard
railway open
```

### Useful URLs

| Resource | URL |
|----------|-----|
| Railway Dashboard | https://railway.app/dashboard |
| Railway Docs | https://docs.railway.app |
| Project URL | https://xrnotify.up.railway.app |
| Production URL | https://xrnotify.io |

---

## Next Steps After Deployment

1. ✅ Verify all services are running
2. ✅ Test webhook creation and delivery
3. ✅ Set up Stripe for payments
4. ✅ Submit sitemap to Google Search Console
5. ✅ Announce on XRPL developer channels
