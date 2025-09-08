# Foodie Finder — MVP Starter

This repo scaffold complements the **SPEC-001-Foodie Finder** document in your project canvas.

## Quick start
```bash
# 1) Create files
bash scaffold.sh

# 2) Open owner portal (Next.js)
cd apps/owner-portal && pnpm i && pnpm dev

# 3) Supabase (optional – after you create a project)
#    Paste your connection/env in apps later, then run migrations
cd ../../packages/sql && psql "$DATABASE_URL" -f migrations/0001_init.sql
```

## Structure
- `apps/ios/` — SwiftUI shell (you'll create the Xcode project and drop these files in)
- `apps/owner-portal/` — Next.js minimal portal
- `packages/edge/` — Supabase Edge Functions (Deno/TS) skeletons
- `packages/sql/` — DB migrations (Postgres + PostGIS)
- `.github/ISSUE_TEMPLATE/` — Issue templates; `pull_request_template.md`

See the full SPEC in your canvas for details on data model and flows.
