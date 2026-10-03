# Phase 1 — Foundation

Read `CLAUDE.md` first. Show me a plan before writing code.

## Goal
A working, deployed skeleton: monorepo, Next.js PWA, Supabase, sign-in, roles, RLS test harness,
4 languages, CI and weekly backup. No business features yet.

## Tasks
1. **Monorepo**
   - pnpm workspaces with `apps/web` and `packages/{types,validation,api,i18n,ui,config}`.
   - Shared tsconfig (strict), ESLint, Prettier.
   - Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:types`.
2. **Next.js app** (`apps/web`)
   - App Router, TypeScript, Tailwind, shadcn/ui.
   - PWA: web manifest (name "Family Property Manager", short name "FPM"), icons 192/512, service worker
     for offline shell, "Add to home screen" works on Android Chrome and iPhone Safari.
   - Layout: mobile bottom navigation, desktop sidebar.
3. **Supabase**
   - `supabase init`, local dev with `supabase start`.
   - Migration `0001_core.sql`:
     - `profiles` (id = auth.users.id, full_name, phone, email, preferred_language default 'en', app_role 'staff' | 'tenant', created_at)
     - `properties` (id, name, address_line, city, state, pin, description, notes, created_at)
     - `property_members` (property_id, user_id, role 'owner' | 'manager', created_at; PK property_id+user_id)
     - `activity_logs` (id, actor_id, property_id, action, table_name, record_id, before jsonb, after jsonb, created_at) — insert-only.
       `property_id` is required so the "staff of the related property" policy can be written.
   - Helper SQL functions (security definer, stable):
     - `is_property_staff(property_id)` — current user is owner or manager of that property **and** the session is AAL2
       (`auth.jwt()->>'aal' = 'aal2'`), so staff data cannot be read with a password alone
     - `is_property_owner(property_id)` — same AAL2 rule
   - RLS on all tables. `activity_logs`: staff of the related property can select; nobody can update/delete.
   - Trigger to create a `profiles` row on new auth user (default `app_role = 'tenant'`).
   - `profiles` RLS: a user may update only `full_name`, `phone`, `preferred_language` on their own row
     (column-level `grant update (...)`). `app_role` and `email` are changed only by server code with the service role.
     pgTAP test: a tenant trying to set their own `app_role = 'staff'` fails.
4. **Auth**
   - Email + password and Google sign-in only. No public sign-up page: accounts are created by staff (Phase 3 adds the tenant invite flow).
   - Bootstrap: a one-time seed script creates the first property, then the Owner (father) and two Managers
     from env vars, with their `property_members` rows (a member row needs the property to exist).
   - Password reset by email. Session in secure HTTP-only cookies (`@supabase/ssr`).
   - Email: configure Supabase Auth **custom SMTP** with a Gmail account + app password (free).
     Supabase's default mailer only delivers to project team members, so invites to tenants would fail without this.
   - Middleware redirects: signed-out → `/login`; staff → `/owner`; tenant → `/tenant`.
   - TOTP 2FA via Supabase MFA, required for owner and managers: enrol on first sign-in, enforce AAL2 on `/owner`
     routes in middleware **and** in the RLS helpers above. Optional for tenants.
5. **i18n**
   - next-intl with `en`, `ta`, `hi`, `ml`. Language switcher in profile; saved to `profiles.preferred_language`.
   - Load Noto Sans Tamil, Noto Sans Devanagari, Noto Sans Malayalam for correct rendering.
6. **RLS test harness**
   - pgTAP in `supabase/tests/`. Helper to impersonate a user (set `request.jwt.claims`).
   - First tests: a manager of property A cannot read property B; anonymous users read nothing;
     a staff session at AAL1 (no 2FA) reads nothing; a user cannot change their own `app_role`.
7. **CI** — `.github/workflows/ci.yml`: install, lint, typecheck, unit tests, `supabase test db`.
8. **Backup** — `.github/workflows/backup.yml`: weekly
   - `pg_dump` of the hosted DB using the Supabase **session pooler** connection string (the direct DB host is
     IPv6-only and GitHub runners cannot reach it). Install the `pg_dump` version matching the project's Postgres major version.
   - **Plus** a download of every Storage bucket (photos, ID documents, payment proofs, receipts) — `pg_dump` does not include files.
   - Both encrypted with `age` using a public key in secrets, uploaded as a GitHub Actions artifact (90-day retention).
   - Write `docs/RESTORE.md` with restore steps for the database and the buckets.
9. **Keep-alive** — `.github/workflows/keepalive.yml`: every 3 days, a small request to the Supabase REST API.
   Free projects pause after 7 days without activity; pg_cron jobs run inside the database and may not count.
10. **Deploy** — Cloudflare Workers via @opennextjs/cloudflare. `.env.example` lists every variable.
    Deploy a throwaway route that renders a one-page PDF with @react-pdf/renderer and check the bundle stays under
    the Workers free 3 MB limit. If not, plan receipts/agreements as a Supabase Edge Function instead and note it in CLAUDE.md.

## Acceptance
- [ ] I can sign in as Owner and as Manager; I land on `/owner`.
- [ ] Language switch changes all visible text in 4 languages.
- [ ] App installs to the home screen on Android and iPhone.
- [ ] `supabase test db` passes, including the cross-property isolation test.
- [ ] Owner and managers are forced to set up 2FA; a staff session without 2FA sees no data.
- [ ] A test invite email arrives at an outside Gmail address (custom SMTP works).
- [ ] CI is green on GitHub. Backup workflow runs manually once and produces an artifact containing both the DB dump and the bucket files.
- [ ] The test PDF route works on the deployed Cloudflare app.
- [ ] No secrets in the repo.
