# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SwiftRoute is a URL shortener split into two independently deployed Node.js (CommonJS) services:

- **Redirect API** (repo root) — Express 5 app that creates short codes and serves `302` redirects.
- **Analytics worker** ([SwiftRoute-Analytics-worker/](SwiftRoute-Analytics-worker/)) — RabbitMQ consumer that persists click events. It is a **separate git repo nested inside this one** and is gitignored by the parent; changes there are committed separately.

They share a PostgreSQL database (each has its own copy of the Prisma schema) and communicate only through the durable RabbitMQ queue `click_analytics`.

## Commands

```bash
npm run dev                      # watch-mode server on :3000, New Relic preloaded
npm test                         # jest --forceExit --detectOpenHandles --verbose
npx jest tests/unit/url.service.test.js     # single test file
npm test -- -t "should return cached URL"   # single test by name
npx prisma generate              # REQUIRED before dev/test — see below
npx prisma migrate dev --name <n> # create + apply a migration (root repo only)
npx prisma migrate deploy        # apply migrations (what the compose `migrate` service runs)
docker compose up -d             # postgres + redis + rabbitmq + migrate + redirect + analytics
```

There is no linter or build step.

## Prisma setup (Prisma 7, non-standard)

- The client is generated to `generated/prisma/` (gitignored). **A fresh clone will not run until `npx prisma generate`.** CI, Jenkins, and the Dockerfile all run it explicitly.
- `prisma/schema.prisma` has **no `url` in the datasource block** — the connection string comes from [prisma.config.ts](prisma.config.ts) (CLI) and from the `PrismaPg` driver adapter in [lib/prismaClient.js](lib/prismaClient.js) (runtime), both reading `DATABASE_URL`.
- **All app code imports the client via [utils/db.js](utils/db.js)**, never `lib/prismaClient` or `generated/prisma` directly. `tests/setup.js` mocks `utils/db`, so a direct import silently bypasses the test mocks.
- Migrations live only in the root repo. The worker has its own `prisma/schema.prisma` copy that has **drifted**: its `Click.id` is `@default(uuid())`, the root's is a bare `String @id`. The worker relies on that default when creating clicks. Keep both schemas in sync when touching models, and add the migration in the root repo.

## Request flow and conventions

- Routes mount in [routes/index.js](routes/index.js): `/` (renders `Readme.md` as HTML), `/auth`, `/api`, `/url`.
- Controllers live in **`controlllers/`** (three `l`s — the directory name is misspelled and is referenced that way in requires, jest coverage config, and the Dockerfile).
- **Error convention:** controllers `throw` an `Error` with a `.statusCode` property; Express 5 forwards async rejections to [middlewares/error.middleware.js](middlewares/error.middleware.js), which is the only place that shapes responses. Service-layer DB failures go through [utils/dbErrorHandler.js](utils/dbErrorHandler.js), which maps Prisma codes (`P2002` → 409, etc.) onto the error before rethrowing. Don't `res.status(...).json(...)` for errors in controllers.
- **Redirect path** ([services/url.service.js](services/url.service.js)): Redis `short_<code>` lookup first, then Postgres filtered on `isActive` + non-expired, then cache with a TTL derived from `expiresAt`. The `cache_hit`/`cache_miss` Winston events feed the New Relic dashboard — keep emitting them if you rewrite this.
- **Click events are fire-and-forget**: `handleClickEvent` in [controlllers/url.controller.js](controlllers/url.controller.js) is intentionally not awaited so the `302` isn't blocked. Note it currently passes the *target URL* as `linkId`. Each event carries `geoip-lite` city-level location (`country`, `region`, `city`, `latitude`, `longitude`, `timezone`, `accuracyRadius`); `country` falls back to `"India"` when the lookup fails, the rest to `null`.
- **Rate limiting** is a hand-rolled Redis sorted-set sliding window ([middlewares/rateLimiter.middleware.js](middlewares/rateLimiter.middleware.js), 200 req / 60s per IP), applied only to `GET /url/:code`. It fails open — a Redis error calls `next()`. `express-rate-limit` is a dependency but unused.
- Logging is Winston JSON with an `event` field per log line ([utils/logger.js](utils/logger.js)); New Relic forwards these. Keep the `{ event: "..." }` shape.

## Testing

Unit tests only, all external I/O mocked in [tests/setup.js](tests/setup.js) (newrelic, `config/redis.config`, `lib/rabbitmq`, `utils/db`) — **no database, Redis, or RabbitMQ is needed to run tests**. Test files also `require('../setup')` at the top in addition to jest's `setupFiles`. When adding a Prisma model, add its mock methods to `tests/setup.js` or tests touching it will fail with "cannot read property of undefined".

## Load testing

[loadtest/](loadtest/) holds a dependency-free harness (`node loadtest/seed.js` then `node loadtest/run.js`). Because the app sets `trust proxy`, the rate-limit bucket is keyed off `X-Forwarded-For`, so `--ips <n>` simulates n distinct clients from one machine. Use `--ips 1` to exercise the limiter and a large `--ips` to measure real redirect throughput — without that, results are just the 200 req/60s cap.

## Environment

Copy `.env.example` to `.env`. `DATABASE_URL`, `REDIS_URL`, `AMQP_URL` in that file point at `localhost` for `npm run dev`; docker-compose overrides them with service-name hosts (`postgres`, `redirect-redis`, `redirect-rabbitmq`). New Relic keys are optional — the agent no-ops without a license key.

## CI/CD

GitHub Actions `ci.yml` (npm ci → prisma generate → npm test) gates `deploy.yml`, which triggers on `workflow_run` success on `main` and does Docker build → push to Docker Hub → SSH `docker-compose up -d` on EC2. [Jenkinsfile](Jenkinsfile) mirrors the same stages. A failing test blocks all deploys.
