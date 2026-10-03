# Security checklist

What protects tenant data, and how each item is checked. ✅ = verified during development (3 Oct 2026);
items without ✅ must be done by a person on the live project. Re-check after every release.

## Who can see what (database)

- ✅ **Row Level Security on every table.** `supabase/tests/010-sweep.test.sql` fails if any table in `public`
  has RLS off, if the anonymous role can read any row, or if a tenant can read another tenancy's rows in any table.
- ✅ **Per-feature isolation tests** (pgTAP, 144 tests in total): tenants vs tenants, property vs property,
  former tenants (read-only settlement for 90 days, then signed out), guests, announcements, reports.
- ✅ **Staff need 2FA in the database too**, not only in the app: `is_staff()` / `is_property_staff()` require an
  AAL2 session, so a stolen password alone reads nothing.
- ✅ **State changes go through checked functions** (payments, agreements, move-out, deposits). Direct updates of
  status columns are blocked by triggers; the deposit ledger is locked once the statement is shared.
- ✅ **Activity log is insert-only**; every material action writes to it.
- ✅ **No full ID numbers** stored: only the last 4 digits (sweep test checks no column holds a full ID number).

## Files

- ✅ All buckets private. The browser never talks to Storage: the server checks access with the user's own RLS
  client, then uploads with the service role (`apps/web/lib/files.ts`: type sniffed from bytes, size limits,
  EXIF/GPS removed, images shrunk to 1600 px).
- ✅ Viewing goes through `/api/files`, which issues a **300-second** signed URL only if the user can read a row
  that references the file (e2e: a tenant cannot open another tenant's document).
- ✅ ID documents of former tenants and guests are deleted **12 months** after settlement / check-out
  (`Daily maintenance` workflow + `documents_due_for_purge`; an audit entry is kept).

## Secrets

- ✅ The service-role key is used only in server code. CI fails if it appears in `.next/static`.
- ✅ `.env*` and `.dev.vars` are git-ignored. Live secrets live only in Cloudflare secrets and GitHub secrets.
- ✅ `/api/cron/daily` needs `CRON_SECRET`; `/api/push/dispatch` needs `PUSH_DISPATCH_SECRET`. Both reject
  requests without them (e2e checks the cron route).
- ✅ The push dispatch URL and secret live in `app_settings`, which no app user can read.
- [ ] Rotate `CRON_SECRET` and `PUSH_DISPATCH_SECRET` if anyone who had them leaves the family team.

## Sign-in and sessions

- ✅ Public sign-up off; only invited emails get in.
- ✅ Staff must set up TOTP 2FA before any staff screen opens.
- ✅ "Sign out on all devices" (Profile) ends every session (`signOut({ scope: 'global' })`).
- ✅ Former tenants are disabled 90 days after settlement (`disable_former_tenants` daily job); starting a new
  tenancy re-enables them.
- ✅ **Rate limits on sign-in** come from Supabase Auth (Authentication → Rate Limits: 30 sign-ins per 5 minutes
  per IP, 30 emails per hour).
- [ ] **Uploads and payment submissions** have no separate limit. Each needs a signed-in user, has a size cap, and
  payments wait for staff approval. If abuse ever shows up, add the one free Cloudflare rate-limiting rule
  (Security → WAF → Rate limiting rules) on `POST` requests to the app.

## Browser protections (`apps/web/next.config.ts`)

- ✅ Content-Security-Policy: scripts only from the app itself; images, media and connections only to the app
  and Supabase; `frame-ancestors 'none'`.
- ✅ HSTS (2 years), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera for photos only).
- ✅ Web-push messages are end-to-end encrypted (RFC 8291) and contain only a short title and a link.

## Dependencies

- ✅ Dependabot is on (`.github/dependabot.yml`).
- ✅ CI runs `pnpm audit --prod` and shows the result; review it monthly.

## Reliability

- ✅ Restore drill done locally from an encrypted backup (`docs/RESTORE.md`).
- [ ] Restore drill repeated on the live project into a spare Supabase project.
- ✅ Free-tier usage warning on the owner dashboard (database > 80% of 500 MB or files > 80% of 1 GB), plus an
  alert when a daily job failed in the last 2 days.
- ✅ Cloudflare bundle 2.3 MB of the 3 MB free limit.

## Accessibility and speed

- ✅ All controls have labels in all 4 languages; chart colours checked for colour-blind safety, with values
  also shown as numbers.
- [ ] Lighthouse on a real phone for tenant home and rent screens (target ≥ 90 on mobile).
- [ ] Screen-reader check (TalkBack) of the rent payment flow.
