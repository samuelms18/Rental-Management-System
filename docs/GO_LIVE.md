# Go-live gate

No real tenant ID document or money record goes in until every box is ticked.
Items marked ✅ were verified during development (3 Oct 2026) and must be re-checked on the live project.

## Security
- [ ] `supabase test db` passes (144 tests: tenant/property isolation, 2FA enforcement, money, agreements, deposits, guests, reports, all-table sweep) ✅ locally / in CI
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

## V1.5 and V2 (built 3 Oct 2026; switch each on when the family is ready)

You can go live with everything at once, or use only rent/EB/complaints for the first couple of months.
Before using each feature with real tenants:

- [ ] **Agreement template reviewed by brother** (Owner → Agreements → Templates). The seeded 11-month English
      template is a **draft**: check the clauses, notice period, lock-in, deposit and maintenance wording against
      Tamil Nadu practice, then save. Add Tamil/other-language templates if tenants want them.
- [ ] One test agreement end to end: create → PDF → send → tenant signs on a phone → approve → upload the stamped copy ✅ (e2e)
- [ ] One test move-out with a test tenant: meter reading, photos, deductions → share statement → tenant
      acknowledges → settle; check the refund amount by hand ✅ (e2e, and the requirement's example in pgTAP)
- [ ] Phone notifications set up (`docs/SETUP.md` step 3a) and turned on on each family member's phone; an
      announcement to one test house arrives ✅ (e2e with an encrypted push)
- [ ] **Daily maintenance** workflow green (needs `APP_URL` and `CRON_SECRET` GitHub secrets)
- [ ] Supabase → Cron Jobs also lists `agreements_daily`, `disable_former_tenants`, `guests_daily`
- [ ] Reports: totals for one month match a hand count; CSV opens in Excel / Google Sheets with Tamil names intact ✅ (e2e)
- [ ] Security checklist in `docs/SECURITY.md`: all unticked items done

When all boxes are ticked: **the app is live.**
