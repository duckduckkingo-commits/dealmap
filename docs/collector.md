# DEALMAP — Real Data Collector + Smart Deal Engine

Additive module. **No existing file was modified** except 4 one-line navigation
wires (Header link, bottom-nav tab, nav grid columns, Home hero button).

## What it does

- **Analyze a Product Link** (`/analyze`): paste any product URL → extraction
  (JSON-LD/OpenGraph/meta + spec regexes) → tiered matching
  (EAN → model → brand+model+specs → fuzzy) → market evidence from the existing
  engine → multi-factor Smart Deal Score (/100) with verdict
  (Excellent/Good/Fair/Expensive/Very Expensive) and recommendation
  (BUY / GOOD DEAL / CONSIDER / AVOID) + alternatives.
- **Honesty first**: every fact is labeled Verified / Reported / Estimated /
  Unknown. Missing data shows “Unknown / Not available”. Problems are only
  shown when explicitly mentioned (“No issue reported in the available listing.”
  otherwise). Prices are “Live” only when checked within 60 minutes.
- **User submissions**: anyone can submit a deal (rate-limited); ADMIN/OWNER
  verifies before it counts.
- **Scheduler**: no in-process cron (serverless-safe). An admin presses
  “Run update now” in `/admin/collector`, or any external cron pings
  `POST /api/collector/runs {action:"tick"}`. Only stores flagged
  `allowRecheck` with a source URL are re-fetched; the rest count as skipped.
  Every run logs checked/updated/skipped/failed/errors (ledger).
- **Weights**: all 14 factor weights editable in `/admin/collector`
  (GET open, PUT admin-only), normalized to 100 at scoring time.
- **Storage**: local dev uses separate `data/collector.json` (never touches
  `data/db.json`). Production uses Postgres via `supabase/migrations/003_collector.sql`
  (8 tables) through zero-dependency PostgREST calls when
  `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set.

## Setup

1. Nothing to install — zero new dependencies.
2. Apply `supabase/migrations/003_collector.sql` only when using Postgres.
3. (Optional) External cron every 6h → `POST /api/collector/runs`
   with an admin session to keep prices fresh.

## Testing

```bash
npm run typecheck
node --test tests/collector.test.js tests/smartdeal.test.js
npm test   # full suite (14 existing + must stay green)
```

Manual: open `/analyze`, paste a real product link, confirm Unknown labels for
missing data, submit a deal, verify it in `/admin/collector`, press
“Run update now”, change a weight and re-analyze.
