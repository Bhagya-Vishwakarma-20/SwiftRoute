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

The redirect API and analytics worker are **independently deployable microservices** communicating through RabbitMQ. On every redirect, the API fires a click event onto a **durable queue** and immediately responds with a `302` — zero blocking. The analytics worker consumes these events asynchronously, enriches them with geo data, and persists them. Business analytics storage is deliberately separated from the observability pipeline to avoid coupling product features with monitoring infrastructure.

### Sliding Window Rate Limiting (Redis Sorted Sets)

Rather than a naive fixed-window counter, the rate limiter uses `ZADD` with timestamps as scores in a Redis sorted set per IP. On each request it trims entries outside the window (`ZREMRANGEBYSCORE`), counts remaining members (`ZCARD`), and either admits or rejects. This produces a smooth, accurate throttle — no burst-at-boundary edge cases.

### Multi-Layer Caching

Short-link lookups hit **Redis first** before touching Postgres. Cache TTLs are derived from the link's expiry, so expired links are never served stale. This keeps p99 redirect latency low while Postgres handles the durable write path.

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
| **Containers** | Docker + Docker Compose | Multi-stage builds, service orchestration |

---

## Project Structure

```
├── index.js                    # App entrypoint — Express bootstrap
├── newrelic.js                 # New Relic agent config
├── Dockerfile                  # Multi-stage production build
├── docker-compose.yml          # Full stack orchestration
│
├── routes/
│   ├── index.js                # Route aggregator
│   └── url.route.js            # POST / (shorten) · GET /:code (redirect)
│
├── controlllers/
│   └── url.controller.js       # Shorten + redirect logic, fires click events
│
├── services/
│   ├── url.service.js          # Code generation, Redis cache, DB lookup
│   └── analytics.service.js    # Publishes click events to RabbitMQ
│
├── middlewares/
│   ├── rateLimiter.middleware.js   # Sliding window (ZADD) rate limiter
│   └── error.middleware.js         # Global error handler + 404
│
├── lib/
│   ├── prismaClient.js         # Prisma singleton
│   └── rabbitmq.js             # AMQP channel + queue setup
│
├── config/
│   ├── redis.config.js         # Redis client
│   └── winston.config.js       # Log format + transports
│
├── utils/
│   ├── db.js                   # DB adapter export
│   ├── dbErrorHandler.js       # Prisma error → HTTP status mapper
│   ├── geo.js                  # IP → country resolver
│   └── logger.js               # Winston logger instance
│
└── prisma/
    └── schema.prisma           # URL, Click models
```

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
| `analytics` | 3001 | Analytics worker |
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

## Key Highlights

- **Microservices over monolith** — The redirect path and analytics processing are independently deployable, versioned, and scaled separately via CI/CD.
- **Zero-blocking redirects** — Click events are published fire-and-forget to RabbitMQ; the user gets a `302` instantly.
- **Production hardened** — Structured logging, APM integration, global error handling, Prisma error mapping, and durable message queues.
- **Multi-stage Docker builds** — Minimal Alpine images, `npm ci --only=production`, clean layer separation. 

