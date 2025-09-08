#!/usr/bin/env bash
# setup.sh — installs deps, seeds envs, and (optionally) runs the first migration
# Usage examples:
#   bash setup.sh --db-url "postgresql://user:pass@host:5432/db"
#   DATABASE_URL=postgresql://... bash setup.sh
#   SUPABASE_PROJECT_REF=xyz SUPABASE_ACCESS_TOKEN=... bash setup.sh --link-supabase

set -euo pipefail

# --- helpers ---
red()  { printf "\033[31m%s\033[0m\n" "$*"; }
grn()  { printf "\033[32m%s\033[0m\n" "$*"; }
info() { printf "\033[36m› %s\033[0m\n" "$*"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

DB_URL="${DATABASE_URL:-}"
LINK_SUPABASE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url)
      DB_URL="$2"; shift 2 ;;
    --link-supabase)
      LINK_SUPABASE=true; shift ;;
    -h|--help)
      echo "setup.sh [--db-url <postgres-url>] [--link-supabase]"; exit 0 ;;
    *) red "Unknown arg: $1"; exit 1 ;;
  esac
done

# --- locate repo root ---
if [[ -f "README.md" && -d "apps" && -d "packages" ]]; then
  ROOT=$(pwd)
else
  # try to find the scaffolded folder
  if [[ -d "foodie-finder" ]]; then cd foodie-finder; ROOT=$(pwd); else red "Run this from the repo root (where README.md is)"; exit 1; fi
fi

info "Repo: $ROOT"

# --- check required tools ---
for bin in node pnpm deno supabase psql; do
  if ! command_exists "$bin"; then red "Missing $bin. Install it first (e.g., brew install $bin)."; MISSING=true; fi
done
if [[ "${MISSING:-false}" = true ]]; then exit 1; fi

# --- Node version check ---
NODE_MAJOR=$(node -p "process.versions.node.split('.') [0]")
if (( NODE_MAJOR < 18 )); then red "Node >= 18 required"; exit 1; fi

# --- install owner portal deps ---
info "Installing Next.js owner portal deps (pnpm i) ..."
pushd apps/owner-portal >/dev/null
pnpm i
popd >/dev/null

grnn() { grn "$*"; }

# --- env files ---
info "Creating .env files (if missing) ..."
# Owner portal
OP_ENV="apps/owner-portal/.env.local"
if [[ ! -f "$OP_ENV" ]]; then
  cat > "$OP_ENV" <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
STRIPE_PUBLIC_KEY=pk_test_xxx
EOF
  grn "Created $OP_ENV (fill in real values)"
else
  info "$OP_ENV exists, leaving it as-is"
fi

# Edge functions env example
EDGE_ENV_EX="packages/edge/.env.example"
mkdir -p packages/edge
cat > "$EDGE_ENV_EX" <<'EOF'
# Copy to packages/edge/.env for local dev (do not commit secrets)
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
CF_IMAGES_ACCOUNT_ID=
CF_IMAGES_API_TOKEN=
HIVE_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OFFER_JWT_FALLBACK_KEY=CHANGE_ME
EOF

grn "Wrote $EDGE_ENV_EX"

# --- optional: supabase link ---
if $LINK_SUPABASE; then
  if [[ -z "${SUPABASE_PROJECT_REF:-}" || -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    red "To link, set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN env vars."; exit 1
  fi
  info "Linking Supabase project $SUPABASE_PROJECT_REF ..."
  supabase link --project-ref "$SUPABASE_PROJECT_REF" || red "Link failed (ensure access token is valid)"
fi

# --- run initial migration ---
MIG="packages/sql/migrations/0001_init.sql"
if [[ -n "$DB_URL" ]]; then
  info "Running initial migration via psql ..."
  PGPASSWORD="$(echo "$DB_URL" | sed -n 's/.*:\/\/[A-Za-z0-9_]*:\([^@]*\)@.*/\1/p')" \
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$MIG" && grn "Migration applied"
else
  info "DATABASE_URL not provided. Skipping migration. Provide with --db-url or env var to run now."
  echo "Example: bash setup.sh --db-url 'postgresql://USER:PASSWORD@HOST:5432/postgres'"
fi

# --- final messages ---
cat <<'NOTE'

✅ Setup complete (deps + env templates).

Next steps:
1) Fill in real env values:
   - apps/owner-portal/.env.local → NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
   - packages/edge/.env (copy from .env.example) → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MUX/CF/HIVE/STRIPE keys
2) If you skipped migration: rerun with a DATABASE_URL once you have it.
3) Start the owner portal:
   cd apps/owner-portal && pnpm dev

Optional:
- Deploy Edge functions once env is set: supabase functions deploy --project-ref <ref>
- Create TestFlight build from Xcode for the iOS app shell.
NOTE
