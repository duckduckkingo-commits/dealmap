# DEALMAP — Don't overpay.

Know the real market price before you buy. Morocco-first price intelligence (MAD), deterministic market-based Deal Score — no AI required, no fake data, no fake payments.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill JWT_SECRET etc (dev only)
npm run db:seed              # loads clearly-marked DEMO catalog
npm run dev                  # http://localhost:3000
open /setup                  # create first OWNER (dev credentials only)
```

## Stack
- Next.js 14 App Router + React 18 + TypeScript (modular monolith)
- Auth: JWT httpOnly cookie + bcryptjs (Supabase Auth-compatible adapter interface; swap in production)
- Storage: local `data/db.json` for dev; Supabase Postgres via `supabase/migrations/*.sql` in production
- Validation: zod · Rate limiting: in-memory buckets (use Redis in multi-instance prod)

## Architecture
UI (`app/`, `components/`) → Server/API (`app/api/`) → Business logic (`lib/`: dealScore, market, auth, permissions, audit) → Database (`lib/db.ts` or Supabase).

## Owner first setup
1. Deploy, set `INITIAL_OWNER_SETUP_ENABLED=true` + strong `INITIAL_OWNER_SETUP_SECRET` (server-only).
2. Open `/setup`, create OWNER. Role assigned server-side; client `role` ignored.
3. Verify `/owner` works, `/setup` now returns 404.
4. Set `INITIAL_OWNER_SETUP_ENABLED=false`, redeploy. DB partial unique index `one_owner_only` blocks races even if left enabled.

## Recovery
- Password: `/auth/forgot-password` (generic response) → email link → `/auth/reset-password` (revokes sessions).
- Owner lockout: use password reset; if email lost, restore DB backup, or temporarily re-enable setup (still blocked while OWNER exists — delete/reassign via DB console with audit note).

## Env vars (names only)
`NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, INITIAL_OWNER_SETUP_ENABLED, INITIAL_OWNER_SETUP_SECRET, NEXT_PUBLIC_APP_URL, JWT_SECRET, EMAIL_PROVIDER, EMAIL_FROM, AI_ENABLED, PREMIUM_ENABLED, SELLER_TOOLS_ENABLED, MARKETPLACE_ENABLED, PUSH_NOTIFICATIONS_ENABLED, TWO_FACTOR_ENABLED`

## Git rules
Safe: `src/app/components/public/lib/services/hooks/types, package.json, configs, README, .env.example, migrations, tests`.
Never: `.env*, service-role keys, setup secrets, passwords, tokens, receipts, dumps`.

## Scripts
`dev, build, start, lint, typecheck, test, test:unit, test:e2e, db:migrate, db:seed`

## Product UI (reference implementation)

White/light mode is the default theme; dark navy mode (`dm_theme=dark` cookie or header toggle) mirrors every screen with glowing blue accents. Accent color is customizable (blue/green/purple/orange/teal/rose).

- **Brand**: blue-gradient price-tag logo (`public/logo.svg`) on splash, header, footer, onboarding, auth and empty states. Tagline “Don't overpay.”
- **App shell**: animated splash (logo pulse + load bar) → one-time onboarding (language → 3 value slides → Get Started) → Home. Bottom navigation (Home / Explore / Compare / Saved / Profile) with selection animation on all viewports; sticky blurred top bar + theme toggle on desktop.
- **Screens**: Home (search + categories + Trending + Under-4000 + how-it-works), Explore (chip filters + category tiles), Search (live suggestions, category / max-price / sort filters), Product detail (score ring + price analysis, market range, animated SVG price history, comparison table, similar products, Save/Compare/Watchlist/Alert/Contribute actions), Compare (up to 3, score rings, top-differences, spec table), Saved/Watchlist (guest on-device + server sync), Alerts (guest + server, pause/delete), Purchases, Warranties & Returns, Contribute, Dashboard, Profile (guest CTA + stats), Settings (language/theme/accent/notifications/password/security), Help & FAQ, Notifications, full Auth + Owner setup flows.
- **Robot assistant**: floating 🤖 button (bottom-right, above nav) with bounce-in, greeting tip, quick questions (scores/history/compare/alerts/save), minimize + dismiss (never nags). Keyboard accessible.
- **Motion**: card entrances (staggered), button ripples/press states, heart pop, score-ring sweep, animated chart line/area, bottom-sheet modals, toasts, skeleton shimmer. `prefers-reduced-motion` disables all animation.
- **i18n**: fr (default) / en / ar with full RTL layout, persisted in cookie + localStorage.

### Problems found & fixed (this pass)
1. Home / Explore / Product pages crashed on SSR (`digest` error boundary) — `catIcon()` was imported from a `"use client"` module and called during server render. Fixed by extracting `components/categoryIcons.ts` (server-safe) — verified 200 + content on all 3 pages.
2. Guests hitting Saved/Alerts/Profile were hard-redirected to login although the UI supports on-device guest mode — removed `/watchlist`, `/alerts`, `/profile` from middleware auth gate (server APIs stay auth-protected; guest data is local-only). `/purchases`, `/warranties`, `/dashboard`, `/contribute`, `/owner`, `/admin` remain login-gated.
3. `app/compare` implicit-`any[]` + `app/profile` wrong field (`createdBy` → `contributorId` + contributions) type errors — fixed, `tsc --noEmit` clean.
4. Search suggestions + saved/alerts now degrade gracefully offline/guest instead of dead-ending with “log in”.

### Verification (2026-09-10, production `next start`)
- `typecheck` clean · `lint` ok · `test` 14/14 pass · `next build` 42 routes ok.
- Live HTTP: 15/15 pages 200 with no error boundary; content markers present on Home/Explore/Search/Product/Compare/Saved/Alerts/Settings/Help/Notifications/Profile/Auth/Purchases/Warranties/Contribute/Dashboard.
- Live API: register→login→purchases→watchlist-add→alert-create→notifications all 200; dark cookie renders `data-theme="dark"`; `dm_lang=ar` renders `dir="rtl"` + Arabic strings.

### Run
`npm install` → `cp .env.example .env.local` → `npm run db:seed` → `npm run dev` (http://localhost:3000). A production server with this build is already running at http://localhost:3100.

### Remaining limitations
- Product imagery uses category emoji tiles (no licensed product photos shipped); swap `pcard-img` to real images when a catalog feed is connected.
- Email/push/2FA remain prepared-not-active per original backend (need `EMAIL_PROVIDER` etc.).
- Local JSON store is single-instance (use Supabase in prod); rate limiter in-memory.
- Email is log-only until `EMAIL_PROVIDER` configured; 2FA/passkeys/OAuth prepared, not activated (never faked); push prepared only.
- Seed catalog is DEMO-flagged and excluded from "verified" aggregates by quality filter.

## Next phase
Wire Supabase Auth + Postgres (migrations included), SMTP, then TOTP 2FA and partner feed ingestion.
