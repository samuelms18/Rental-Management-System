# Family Property Manager — Claude Code project guide

Read this file at the start of every session. Requirements source: `docs/REQUIREMENTS.md` (v1.2.1).

## What we are building
A free, secure web app (installable PWA) for one family to manage 5 rental houses:
tenants, tenancies, rent, EB bills, documents, complaints, agreements, move-in/out,
deposit settlement, notifications and full property history.

## People and roles
- **Owner** — the father. Name appears on agreements and receipts. His UPI QR receives rent.
  Only Owner can delete records or remove a manager.
- **Manager** — Samuel and his brother. Do all day-to-day work.
- **Tenant** — sees ONLY their own tenancy. Never another tenant's data.
- Owner/Manager access is per property via `property_members(role: 'owner' | 'manager')`.
- `profiles.app_role` ('staff' | 'tenant') is set only by server code with the service role.
  Users can never change their own `app_role` (RLS + column grants).
- Owner and Managers must use TOTP 2FA. Enforce it in the database too: staff RLS helpers
  require `auth.jwt()->>'aal' = 'aal2'`, not only the Next.js middleware.

## Hard constraint: zero cost
Use free tiers only. Do NOT add: SMS/OTP providers, payment gateways, WhatsApp Business API,
paid e-sign, native app-store apps, any paid SaaS. If a feature seems to need a paid service, stop and ask.

## Stack
- Next.js (App Router) + TypeScript (strict) — `apps/web`, installable PWA
- Tailwind CSS + shadcn/ui
- Supabase: Postgres, Auth (email+password and Google only), Storage (private buckets), pg_cron, Edge Functions
- Zod schemas in `packages/validation`, shared client + server
- next-intl — languages: `en` (default), `ta`, `hi`, `ml`
- PDFs: **pdf-lib** with the built-in PDF fonts, in a Next.js route handler (`/api/receipts/[id]`).
  Chosen over @react-pdf/renderer: smaller bundle and works on Workers. Standard PDF fonts cannot shape
  Tamil/Hindi/Malayalam, so PDF labels are English; the in-app screens are translated.
- Cloudflare Workers free plan limits the bundle to 3 MB gzipped. Build with `next build --webpack` (Turbopack makes
  OpenNext bundle an unused 1.4 MB image engine) and `"minify": true`. Measured 2.1 MB on 3 Oct 2026.
  Check after each phase: `npx wrangler deploy --dry-run --outdir /tmp/cf`.
- Email: Gmail SMTP with an app password, set as Supabase Auth custom SMTP and used for app alerts
  (free, ~500/day). Not Resend: its free tier needs a paid custom domain to email tenants.
  Supabase's default mailer only sends to project team members, so custom SMTP is required.
- Hosting: Cloudflare Workers via @opennextjs/cloudflare (free, commercial use allowed)
- Backups: weekly GitHub Action: `pg_dump` (via the Supabase **session pooler** URL; the direct
  DB host is IPv6-only and unreachable from GitHub runners) **plus** a copy of all Storage buckets
- Keep-alive: GitHub Action pings the Supabase API every 3 days (pg_cron runs inside the DB and may
  not count as project activity on the free tier)
- pnpm workspaces monorepo

## Repo layout
```
apps/web/                  Next.js PWA
packages/types/            generated Supabase types (supabase gen types)
packages/validation/       Zod schemas
packages/api/              typed data-access functions
packages/i18n/             messages/en.json, ta.json, hi.json, ml.json
packages/ui/               design tokens
packages/config/           eslint, tsconfig, tailwind presets
supabase/migrations/       SQL migrations (one per change, never edit an applied one)
supabase/functions/        Edge Functions
supabase/tests/            RLS tests (pgTAP)
supabase/seed/             seed.sql with fake data only
.github/workflows/         ci.yml, backup.yml
```

## Non-negotiable rules
1. **House is permanent; tenancy is per tenant.** Never delete or overwrite old tenancies. Close and create new.
2. Only one tenancy with status `active` or `notice_period` per house (partial unique index).
3. **RLS on every table**, written in the same migration that creates the table. No table without policies.
4. Every new table gets pgTAP tests in `supabase/tests/` proving a tenant cannot read/write another tenancy's rows.
5. **Money = integer paise** (`bigint`), never float. Format with `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`.
6. Timezone `Asia/Kolkata` for all business dates. Store timestamps as `timestamptz`, dates as `date`.
   **pg_cron schedules are in UTC**: 01:00 IST = `30 19 * * *`, 09:00 IST = `30 3 * * *`.
7. Rent is a **charge** in the `charges` ledger (type: rent | eb | eb_reimbursement | water | maintenance | other).
   A charge is `paid` only when approved payments cover it.
8. Files: private buckets only, served by signed URLs that expire in 300 seconds after an auth check.
   Validate type and size server-side. Strip EXIF/GPS from images. Compress images to max 1600px.
9. ID numbers stored **masked** (last 4 only). Never log or export full ID numbers.
   Ask for a masked Aadhaar image (from UIDAI) on upload, since a full image defeats the masked number.
10. Never store UPI PINs, bank passwords, OTPs, card data, or the TNEB website password.
11. Secrets only in env vars. Service-role key only in Edge Functions / server code, never in the client.
12. Every material action writes to `activity_logs` (actor, property_id, action, table, record_id, before, after, at). Logs are insert-only.
13. All user-facing text goes through next-intl. No hard-coded strings in components. Add keys to all 4 locale files.
14. Mobile-first UI: design for 375px width first. Touch targets ≥ 44px.
15. Validate all input server-side with the shared Zod schema.

## Business defaults
- Rent due day: 5th of every month (field `rent_due_day` on tenancy, default 5). Rent paid in advance for current month.
- Rent charges generated 7 days before due date by a daily job. Idempotent.
- Reminders: 5 days before, 2 days before, on due day, then every 3 days while overdue. Quiet hours 21:00–08:00 IST.
- Mid-month move-in: pro-rated by days, then joins the 5th cycle.
- EB: one meter per house, bimonthly (TNEB). Bills entered manually by a manager.
  `paid_by`: 'tenant_direct' | 'owner_reimbursed' (owner pays → reimbursement charge for tenant).
- Former tenant ID documents (and guest IDs) deleted 12 months after settlement.
- Guest ID image mandatory for every guest, even one night.

## Implementation notes (V1 Core, built 3 Oct 2026)
- Files never touch Storage from the browser. Server actions check access with the user's RLS client, then upload
  with the service role (`lib/files.ts`: type sniffed from bytes, size limits, EXIF/GPS stripped). Viewing goes through
  `/api/files`, which only signs a 300 s URL if the user's own client can read a row referencing the file.
- Payments change only through security-definer functions (`approve_payment`, `reject_payment`, `reverse_payment`,
  `record_cash_payment`). Allocations count only approved payments; over-allocation is blocked by a trigger.
- Tenancy codes (`H01-T002`) are unique per house. Pro-rated rent is rounded to whole rupees.
- PostgREST: `payments` reaches `charges` two ways — embed with `charges!payments_charge_id_fkey(...)`.
- `[auth.email] enable_signup` must stay **true** (false disables email login); public sign-up is off via `[auth] enable_signup = false`.
- Tests: `supabase test db` (pgTAP, `tests.seed_world()` fixture), `pnpm test` (vitest), `apps/web/e2e` (Playwright, full month).

## Implementation notes (V1.5 + V2, built 3 Oct 2026)
- Agreements: `agreement_versions` bodies are immutable; status changes only via RPCs (`send_agreement`, `sign_agreement`,
  `approve_agreement`, …). Placeholders filled by `lib/agreement-text.ts`. PDFs use pdf-lib standard fonts, so
  PDF labels are English; pass user text through `pdfSafe` (`lib/pdf-text.ts`).
- Deposits are a ledger (`deposit_transactions`); deductions lock once the settlement is shared. Unpaid charges are
  cleared with `method = 'deposit'` payments (no receipt). `settle_move_out` sets `purge_after` = +12 months.
- Web push: DB trigger `notifications_push` → `pg_net` POST to `/api/push/dispatch` (URL + secret in `app_settings`)
  → `lib/webpush.ts` (VAPID + aes128gcm on WebCrypto, works on Workers). `PUSH_QUIET_HOURS=off` only for tests.
- Storage deletions (retention purge) run from `/api/cron/daily`, called by `.github/workflows/daily.yml`.
- Reports are security-invoker SQL functions (`report_*`, `house_timeline`, `meter_history`); charts are server SVG
  (`components/charts.tsx`, palette `--fpm-series-*`).
- Forms use `ActionForm` (manual submit + `startTransition`) so React 19 doesn't reset fields after a server error.
- Build with webpack (`next build --webpack`): Turbopack output is too big for the 3 MB Workers limit.
- `docs/SECURITY.md` is the checklist; `docs/LANGUAGES.md` explains adding a language.

## Working style
- Work one phase at a time. Read the phase file in `docs/phases/` before starting.
- Before writing code, show a short plan (files, migrations, screens) and wait for my OK.
- After each phase: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `supabase test db` and the Playwright e2e suite; all must pass.
- Commit in small logical commits with clear messages. Never commit `.env*` files.
- If something in the requirements is unclear or conflicts, ask instead of guessing.
