#!/usr/bin/env bash
# One command to put the latest version live: get the code, update the database, build and deploy.
# Run from anywhere inside the project:  pnpm release
# It stops at the first error and tells you which step failed.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mFAILED at: %s\033[0m\nCopy the red lines above and send them to whoever helps you.\n' "$1"; exit 1; }

step "1/4 Getting the latest code"
git pull --ff-only || fail "git pull (local changes? run: git status)"
git log --oneline -1

step "2/4 Updating the database (Supabase)"
supabase db push --yes || fail "supabase db push"

step "3/4 Installing packages"
pnpm install || fail "pnpm install"

step "4/4 Building and deploying to Cloudflare (3–5 minutes)"
(cd apps/web && pnpm cf:deploy) || fail "pnpm cf:deploy"

VERSION=$(grep -o "'[0-9.-]*'" apps/web/lib/version.ts | tr -d "'")
printf '\n\033[1;32mDone. Live version: %s\033[0m\nOpen the app, go to More (phone) or the bottom of the menu (laptop) and check it shows this version.\n' "$VERSION"
