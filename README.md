# Family Property Manager

A free, secure, mobile-first web app (installable on Android and iPhone) for one family to run 5 rental houses:
tenants, rent by UPI QR with receipts, EB bills, ID documents, complaints and full property history.

- **Requirements:** [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- **Go live (one-time setup):** [`docs/SETUP.md`](docs/SETUP.md) → then [`docs/GO_LIVE.md`](docs/GO_LIVE.md)
- **Restore a backup:** [`docs/RESTORE.md`](docs/RESTORE.md)
- **Working with Claude Code:** [`CLAUDE.md`](CLAUDE.md), phase guides in [`docs/phases/`](docs/phases)

## Status

| Release | Phases | State |
|---|---|---|
| V1 Core | 1–5: foundation, properties, tenants, rent/EB/receipts, complaints & dashboards | **Built and tested** — needs the setup in `docs/SETUP.md` |
| V1.5 | 6–8: agreements, move-out & deposit settlement, guests, web push | After ~2 months of real use |
| V2 | 9–10: reports, more languages, hardening | Later |

## Stack (all free tiers)

Next.js 16 (PWA) on Cloudflare Workers · Supabase (Postgres + Row Level Security, Auth with TOTP 2FA,
private Storage, pg_cron) · Gmail SMTP · WhatsApp share links · pnpm monorepo.

## Run it on your laptop

Needs Node 22, pnpm, Docker and the Supabase CLI.

```bash
pnpm install
supabase start                      # local database, auth, storage, mail catcher (http://127.0.0.1:54324)
cp apps/web/.env.example apps/web/.env.local
# fill NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from `supabase status`
pnpm dev                            # http://localhost:3000
```

Sign in with the fake seed accounts (password `password123`): `samuel@example.com` (manager),
`owner@example.com` (owner), `ravi@example.com` / `priya@example.com` (tenants).
Staff are asked to set up 2FA with any authenticator app on first sign-in.

## Tests

```bash
pnpm lint && pnpm typecheck
pnpm test                           # unit tests: money, validation, file checks, translation completeness
supabase test db                    # 80 database tests: isolation between tenants/properties, 2FA, rent, payments, receipts
pnpm build && (cd apps/web && pnpm start) &
(cd apps/web && npx playwright test)   # one full month end to end in a real browser
```

## Layout

```
apps/web/              Next.js PWA (owner/manager screens under /owner, tenant screens under /tenant)
packages/validation/   Zod schemas shared by forms and server actions
packages/api/          money (integer paise), India-time dates, masked IDs, WhatsApp links
packages/i18n/         en / ta / hi / ml message files
packages/types/        generated database types (pnpm db:types)
packages/ui/           design tokens
supabase/migrations/   schema + RLS policies + jobs (one file per phase)
supabase/tests/        pgTAP security and business-rule tests
supabase/seed/         fake local data only
scripts/               bootstrap staff, backup/restore storage
.github/workflows/     CI, weekly encrypted backup, keep-alive
```
