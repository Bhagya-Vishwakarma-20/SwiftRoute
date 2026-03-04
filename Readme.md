 # ⚡ SwiftRoute — High-Performance URL Shortener

A production-grade URL shortening service built with an **event-driven microservices architecture**. The system cleanly separates the low-latency redirect API from heavy analytics processing, communicating through RabbitMQ — enabling each service to be scaled, deployed, and versioned independently.

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────────┐
                        │              Client Request                 │
                        └────────────────────┬────────────────────────┘
                                             │
                                             ▼
                        ┌────────────────────────────────────────────┐
                        │          Sliding Window Rate Limiter       │
                        │         (Redis ZADD — per IP window)       │
                        └────────────────────┬───────────────────────┘
                                             │
                                             ▼
               ┌─────────────────────────────────────────────────────────┐
               │                   Redirect API  (Express)               │
               │                                                         │
               │   POST /url          → Shorten a URL                    │
               │   GET  /url/:code    → Resolve & redirect (302)         │
               └──────┬────────────────────┬─────────────────┬───────────┘
                      │                    │                  │
        ┌─────────────▼──────┐  ┌─────────▼────────┐  ┌─────▼──────────────┐
        │     PostgreSQL     │  │   Redis Cache     │  │   RabbitMQ         │
        │  (Prisma ORM)      │  │  • URL cache      │  │  click_analytics   │
        │  • URLs            │  │  • Rate-limit     │  │  queue (durable)   │
        │  • Clicks          │  │    sorted sets    │  └─────┬──────────────┘
        │                    │  └───────────────────┘        │
        │                    │                               │ async consume
        └────────────────────┘                               ▼
                                                ┌────────────────────────┐
                                                │   Analytics Worker     │
                                                │   (Microservice)       │
                                                │                        │
                                                │  • Persists click data │
                                                │  • GeoIP → country    │
                                                │  • Independent deploy  │
                                                └────────────────────────┘

              ┌──────────────────────────────────────────────────────┐
              │                  Observability Layer                  │
              │                                                      │
              │   Winston  → structured logs (file + console)        │
              │   New Relic → APM, NRQL dashboards, log forwarding   │
              └──────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Event-Driven Analytics Decoupling

- Redirect API and analytics worker are **independently deployable microservices**
- On every redirect, a click event is published to a **durable RabbitMQ queue** → immediate `302` response, zero blocking
- Analytics worker **consumes asynchronously**, enriches with geo data, and persists
- Business analytics storage is separated from the observability pipeline — no coupling between product features and monitoring

### Multi-Layer Caching

- Short-link lookups hit **Redis first** before touching Postgres
- Cache TTLs derived from the link's expiry — expired links are never served stale
- Keeps p99 redirect latency low while Postgres handles the durable write path

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js (CommonJS) | Server runtime |
| **Framework** | Express 5 | HTTP routing, middleware pipeline |
| **Database** | PostgreSQL + Prisma ORM | Persistent storage, migrations, type-safe queries |
| **Cache / Rate-limit** | Redis | URL cache, sliding-window sorted sets |
| **Message Queue** | RabbitMQ (AMQP) | Async event delivery between services |
| **Geo** | geoip-lite + request-ip | Country-wise traffic analytics from IP |
| **Logging** | Winston | Structured JSON logs (file + console) |
| **APM** | New Relic + NRQL | Performance monitoring, custom dashboards & charts |
| **Testing** | Jest + Supertest | Unit tests with mocked dependencies |
| **CI/CD** | GitHub Actions + Jenkins | Gated pipelines — CD only after CI passes |
| **Containers** | Docker + Docker Compose | Multi-stage builds, service orchestration |

---

## Quick Start

### Docker Compose (recommended)

```bash
docker compose up -d
```

This spins up **four services** on an internal network:

| Service | Port | Description |
|---|---|---|
| `redirect` | 3000 | Redirect API |
| `analytics` | -- | Analytics worker |
| `redirect-redis` | 6379 | Redis |
| `redirect-rabbitmq` | 5672 / 15672 | RabbitMQ + Management UI |

### Manual (individual containers)

```bash
docker run -d --name redirect-redis -p 6379:6379 --network my-net redis
docker run -d --name redirect-rabbitmq -p 5672:5672 -p 15672:15672 --network my-net rabbitmq:3-management
docker run --name analytics-worker --network my-net bhagya888/analytics-worker
docker run --name redirect --network my-net -p 3000:3000 bhagya888/redirect
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/url` | Shorten a URL |
| `GET` | `/url/:code` | Redirect to target (rate-limited) |

---

## CI / CD

CI and CD are **separate workflows**. CD only triggers after CI passes — a failed test run means zero deploys.

```
  push / PR to main
        │
        ▼
  ┌──────────────┐       FAIL → stops here, deploy.yml never fires
  │  ci.yml      │
  │  Unit Tests  │
  └──────┬───────┘
         │ PASS  (push to main only)
         │
         │  workflow_run trigger
         ▼
  ┌──────────────┐
  │  deploy.yml  │
  │  Build →     │
  │  Push →      │
  │  SSH Deploy  │
  │  to EC2      │
  └──────────────┘

  PR builds ─── CI only, no deploy
```

### GitHub Actions

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| **CI** | `ci.yml` | push & PR to `main` | `npm ci` → `prisma generate` → `npm test` |
| **CD** | `deploy.yml` | `workflow_run` after CI succeeds on `main` | Docker build → push → SSH deploy to EC2 |


### Jenkins (`Jenkinsfile`)

| Stage Group | Gate | What it does |
|---|---|---|
| **CI** | always | Checkout → Install → Prisma Generate → Unit Tests |
| **CD** | CI passes + `main` branch | Docker Build → Docker Push |


### Running Tests Locally

```bash
npm install
npm test                 # runs all unit tests
npm test -- --coverage   # with coverage report
```

---

## Key Highlights

- **Microservices over monolith** — The redirect path and analytics processing are independently deployable, versioned, and scaled separately via CI/CD.
- **Zero-blocking redirects** — Click events are published fire-and-forget to RabbitMQ; the user gets a `302` instantly.
- **Production hardened** — Structured logging, APM integration, global error handling, Prisma error mapping, and durable message queues.
- **Multi-stage Docker builds** — Minimal Alpine images, `npm ci --only=production`, clean layer separation. 

