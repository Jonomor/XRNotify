# XRNotify

**Real-Time XRPL Event & Webhook Notification Platform**

[![Build Status](https://github.com/xrnotify/xrnotify/actions/workflows/ci.yml/badge.svg)](https://github.com/xrnotify/xrnotify/actions)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)

XRNotify is a production-grade, enterprise-ready platform that streams XRP Ledger events in real-time and delivers them to your applications via secure webhooks. Built for reliability, security, and scale.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Supported Events](#supported-events)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Webhook Payload Format](#webhook-payload-format)
- [Verifying Webhook Signatures](#verifying-webhook-signatures)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Development](#development)
- [Testing](#testing)
- [Security](#security)
- [License](#license)

---

## Features

### Core Capabilities

- **Real-Time XRPL Streaming**: WebSocket connection to XRPL with automatic failover
- **Webhook Delivery**: HTTPS POST with HMAC-SHA256 signatures
- **Guaranteed Delivery**: Redis Streams with consumer groups, retries, and dead-letter queues
- **Event Replay**: Re-deliver historical events on demand
- **Multi-Tenant**: Isolated API keys and webhooks per tenant

### Reliability

- **Exactly-Once Semantics**: Idempotency keys prevent duplicate deliveries
- **Exponential Backoff**: Smart retry logic with jitter
- **Dead-Letter Queue**: Failed deliveries preserved for analysis
- **Cursor Persistence**: Resume from last processed ledger after restart
- **Graceful Shutdown**: In-flight deliveries complete before exit

### Security

- **API Key Authentication**: SHA-256 hashed keys stored at rest
- **Webhook Signatures**: HMAC-SHA256 with timestamp for replay protection
- **SSRF Protection**: Private IP blocking, DNS validation, HTTPS enforcement
- **Rate Limiting**: Redis-backed token bucket per API key
- **Input Validation**: Strict JSON Schema validation on all endpoints

### Observability

- **Prometheus Metrics**: Request latency, delivery success rates, queue depths
- **Structured Logging**: JSON logs with correlation IDs
- **Grafana Dashboards**: Pre-built dashboards for monitoring
- **Health Endpoints**: Kubernetes-ready liveness and readiness probes

---

## Architecture

