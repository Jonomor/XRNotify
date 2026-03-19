# XRNotify

**Production-grade XRPL Event & Webhook Notification Platform**

XRNotify is real-time webhook infrastructure for the XRP Ledger. It enables developers to subscribe to blockchain events and receive instant HTTP callbacks when those events occur — without running their own node infrastructure.

## Features

- **Real-time XRPL Event Ingestion** — WebSocket connection to XRPL nodes with automatic failover
- **Webhook Delivery** — HTTPS POST with HMAC-SHA256 signatures
- **Guaranteed Delivery** — Automatic retries with exponential backoff, dead-letter queue
- **Event Replay** — Reprocess historical events on demand
- **Multi-tenant** — Isolated tenants with API key authentication
- **Dashboard** — Full-featured UI for webhook management and delivery logs
- **Observability** — Prometheus metrics, structured logging, Grafana dashboards

## Supported Event Types

| Category | Events |
|----------|--------|
| **Payments** | XRP transfers, issued currency payments |
| **NFTs** | Mint, burn, create offer, accept offer, cancel offer |
| **DEX** | Offer create, offer cancel, offer fill |
| **Trust Lines** | Create, modify, delete |
| **Account** | Settings changes, deletions |
| **Escrow** | Create, finish, cancel |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   XRP Ledger    │────▶│  XRPL Listener  │────▶│  Redis Streams  │
│   (Mainnet)     │     │   (Worker)      │     │   (Queue)       │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │   PostgreSQL    │◀─────────────┤
                        │   (Events, etc) │              │
                        └────────┬────────┘              │
                                 │                       ▼
┌─────────────────┐     ┌────────┴────────┐     ┌─────────────────┐
│   Dashboard     │────▶│  Next.js API    │     │ Webhook Worker  │
│   (Next.js)     │     │  (Platform)     │     │ (Delivery)      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ Customer        │
                                                │ Endpoints       │
                                                └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development with Docker

```bash
# Clone the repository
git clone https://github.com/xrnotify/xrnotify.git
cd xrnotify

# Start infrastructure (PostgreSQL, Redis, Grafana, Prometheus)
docker compose -f ops/docker-compose.yml up -d

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start all services in development mode
pnpm dev:all
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Platform (API + Dashboard) | http://localhost:3000 | Main application |
| Prometheus | http://localhost:9090 | Metrics |
| Grafana | http://localhost:3001 | Dashboards |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Queue & Cache |

## Project Structure

```
xrnotify/
├── apps/
│   └── platform/          # Next.js app (API + Dashboard)
│       ├── src/
│       │   ├── app/       # Next.js App Router
│       │   │   ├── api/   # API Route Handlers
│       │   │   └── ...    # Dashboard pages
│       │   └── lib/       # Server-side libraries
├── workers/
│   ├── webhook-worker/    # Webhook delivery worker
│   └── xrpl-listener/     # XRPL event listener
├── packages/
│   └── shared/            # Shared types, utils, crypto
└── ops/
    ├── docker-compose.yml
    ├── docker/            # Dockerfiles
    ├── monitoring/        # Prometheus & Grafana config
    └── runbooks/          # Operational guides
```

## API Overview

### Authentication

All API requests require an API key in the header:

```bash
curl -H "X-XRNotify-Key: your_api_key" https://api.xrnotify.io/v1/webhooks
```

### Create a Webhook

```bash
curl -X POST https://api.xrnotify.io/v1/webhooks \
  -H "X-XRNotify-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourapp.com/webhook",
    "events": ["payment.xrp", "nft.minted"],
    "accounts": ["rYourWalletAddress"]
  }'
```

### Webhook Payload

```json
{
  "event_id": "xrpl:12345678:ABC123:payment.xrp",
  "event_type": "payment.xrp",
  "ledger_index": 12345678,
  "tx_hash": "ABC123...",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "account_context": ["rSender...", "rReceiver..."],
  "payload": {
    "sender": "rSender...",
    "receiver": "rReceiver...",
    "amount": "1000000",
    "currency": "XRP"
  }
}
```

### Verifying Signatures

Every webhook includes an `X-XRNotify-Signature` header:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

## Development

### Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start platform in dev mode
pnpm dev:all          # Start all services

# Build
pnpm build            # Build all packages
pnpm build:platform   # Build platform only

# Test
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix lint errors
pnpm typecheck        # TypeScript check
pnpm format           # Prettier format

# Database
pnpm db:migrate       # Run migrations
```

### Environment Variables

See [`.env.example`](.env.example) for all configuration options.

## Deployment

### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create apps
fly apps create xrnotify-platform
fly apps create xrnotify-worker
fly apps create xrnotify-listener

# Set secrets
fly secrets set DATABASE_URL=... --app xrnotify-platform
fly secrets set REDIS_URL=... --app xrnotify-platform
# ... (see ops/runbooks/DEPLOY_FLYIO.md)

# Deploy
fly deploy --app xrnotify-platform
```

See [`ops/runbooks/DEPLOY_FLYIO.md`](ops/runbooks/DEPLOY_FLYIO.md) for complete deployment guide.

## Monitoring

### Health Checks

- `GET /healthz` — Liveness probe
- `GET /readyz` — Readiness probe (checks DB, Redis, XRPL connection)
- `GET /metrics` — Prometheus metrics

### Key Metrics

- `xrnotify_webhook_deliveries_total` — Total deliveries by status
- `xrnotify_webhook_delivery_duration_seconds` — Delivery latency histogram
- `xrnotify_xrpl_events_total` — Events processed by type
- `xrnotify_queue_depth` — Current queue depth

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary — All rights reserved.

## Support

- **Documentation**: https://xrnotify.dev
- **Email**: support@xrnotify.io
- **Twitter**: [@xrnotify](https://twitter.com/xrnotify)
# 
