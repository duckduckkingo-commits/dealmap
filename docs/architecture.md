# Architecture
Modular monolith (Next.js App Router). Layers: UI → Server/API → lib services → DB adapter.
Services: auth, products, pricing/market, dealScore (v1.2.0 deterministic), watchlist, alerts, purchases, receipts, warranties, contributions, notifications, admin/owner, security/audit, analytics.
# Database
See `supabase/migrations/001_core.sql`, `002_security.sql`. Local dev: `data/db.json` via `lib/db.ts` atomic read-modify-write + mutex.
Tables: profiles, user_roles (partial unique OWNER), categories, brands, products, product_variants, price_observations, watchlists, alerts, purchases, warranties, returns, contributions, reports, notifications, audit/owner_security_events, admin_actions, system_settings, notification_preferences, analytics, sessions, receipts.
# Security
RBAC server-side (`lib/permissions.ts` + API checks + middleware). RLS in migration 002. Zod validation, rate limits, private receipt storage (5MB, jpeg/png/webp/pdf), sanitized names, audit without secrets, security headers in `next.config.js`.
# Deployment
Frontend → Vercel; DB/Auth/Storage → Supabase; repo → GitHub. Env vars in host dashboard, never `.env.local` in git. Run migrations, seed only dev, create OWNER via `/setup`, then disable.
# Owner setup
Flow: verify enabled → verify no OWNER → verify secret → validate → create auth account + profile → assign OWNER server-side → unique-constraint check → audit OWNER_CREATED → session → redirect /owner. Concurrent requests collapse to one OWNER via atomic updateDB + partial unique index.
# Contributing
Conventional commits (`feat:`, `fix:`, `test:`). No secrets, no fake data/AI/payments. Run typecheck + tests + build before PR.
