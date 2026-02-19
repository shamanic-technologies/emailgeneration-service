# Project: emailgeneration-service

Microservice that generates personalized cold sales emails using Claude Sonnet 4.6, with BYOK support, PostgreSQL storage, and cost tracking via runs-service.

## Commands

- `pnpm test` — run all tests (Vitest)
- `pnpm test:unit` — run unit tests only
- `pnpm test:integration` — run integration tests only
- `pnpm run build` — compile TypeScript + generate OpenAPI spec
- `pnpm run dev` — local dev server (tsx watch)
- `pnpm run generate:openapi` — regenerate `openapi.json` from Zod schemas
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:migrate` — run database migrations
- `pnpm db:push` — push schema to database
- `pnpm db:studio` — open Drizzle Studio

## Architecture

- `src/schemas.ts` — Zod schemas + OpenAPI registry (source of truth for validation + OpenAPI)
- `src/routes/generate.ts` — POST /generate endpoint (email generation via Anthropic)
- `src/routes/stats.ts` — POST /stats and POST /stats/by-model endpoints
- `src/routes/health.ts` — GET /health endpoint
- `src/middleware/auth.ts` — Authentication middleware (X-Clerk-Org-Id header)
- `src/lib/anthropic-client.ts` — Anthropic SDK wrapper
- `src/lib/runs-client.ts` — Client for runs-service (cost tracking)
- `src/lib/key-client.ts` — Client for key-service (BYOK API key retrieval)
- `src/db/schema.ts` — Drizzle ORM database schema
- `src/db/index.ts` — Database connection
- `src/instrument.ts` — Sentry instrumentation
- `src/config.ts` — Environment config
- `tests/` — Test files (`*.test.ts`)
- `openapi.json` — Auto-generated from Zod schemas, do NOT edit manually
