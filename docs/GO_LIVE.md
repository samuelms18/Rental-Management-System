# Go-live gate (V1 Core)

No real tenant ID document or money record goes in until every box is ticked.
Items marked ✅ were verified during development (3 Oct 2026) and must be re-checked on the live project.

## Security
- [ ] `supabase test db` passes (80 tests: tenant/property isolation, 2FA enforcement, money rules) ✅ locally / in CI
- [ ] Manual check with **two test tenant accounts on two real phones**: each sees only their own house, rent, documents, complaints
- [ ] A tenant opening `/owner` lands back on their own home page ✅ (e2e test)
- [ ] Owner, Samuel and brother have **2FA on** (each signs in and is asked for a 6-digit code)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only as a Cloudflare secret and a GitHub secret — not in any file
- [ ] Supabase **sign-ups are off**; trying to sign up returns "Signups not allowed" ✅ locally

## Backups
- [ ] **Weekly backup** workflow ran by hand and produced an artifact
- [ ] **Restore drill** done into a spare Supabase project following `docs/RESTORE.md` ✅ (procedure tested locally)
- [ ] The age **private key** is in the password manager and printed

## People and text
- [ ] Privacy notice (Tenant → first sign-in) reviewed by brother in all 4 languages
- [ ] Tamil, Hindi and Malayalam screens + WhatsApp messages checked by a native speaker
- [ ] Payee name, UPI ID and QR code entered (Properties → Family Houses → Rent payee) and test-scanned with GPay

## Data
- [ ] All 5 houses entered with photos
- [ ] No test data in production (only real houses/tenants)
- [ ] Each current tenant onboarded with **"Agreement signed offline"** (scan of their paper agreement)
- [ ] **One full rent cycle** run with test tenants first: charge → tenant submits UTR → approve → receipt PDF ✅ (e2e test, also on the Cloudflare runtime)

## Monitoring (free)
- [ ] Cloudflare → Workers → family-property-manager → **Logs** enabled (observability is on in `wrangler.jsonc`)
- [ ] **Keep Supabase awake** workflow green
- [ ] Supabase → Database → **Cron Jobs**: `generate_rent_charges`, `mark_overdue`, `queue_reminders`, `auto_close_complaints` listed;
      table `scheduled_job_runs` shows `ok = true` rows the morning after go-live

When all boxes are ticked: **V1 Core is live.** Start V1.5 (agreements, move-out, guests) after about 2 months of real use.
