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

### Sliding Window Rate Limiting (Redis Sorted Sets)

- Uses `ZADD` with timestamps as scores in a **sorted set per IP** — not a naive fixed-window counter
- Each request: trim expired entries (`ZREMRANGEBYSCORE`) → count remaining (`ZCARD`) → admit or reject
- Produces a **smooth, accurate throttle** with no burst-at-boundary edge cases

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

## Key Highlights

- **Microservices over monolith** — The redirect path and analytics processing are independently deployable, versioned, and scaled separately via CI/CD.
- **Zero-blocking redirects** — Click events are published fire-and-forget to RabbitMQ; the user gets a `302` instantly.
- **Production hardened** — Structured logging, APM integration, global error handling, Prisma error mapping, and durable message queues.
- **Multi-stage Docker builds** — Minimal Alpine images, `npm ci --only=production`, clean layer separation. 

