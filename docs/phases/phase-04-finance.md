# Phase 4 — Rent, payments, receipts, EB & reminders

Read `CLAUDE.md` first. Show me a plan before writing code. This is the most important phase; go slowly.

## Goal
Each month the app creates rent charges, shows the father's UPI QR, tenants submit UTR + screenshot,
a manager approves, a receipt PDF is issued, and EB bills (including reimbursements to the father) are tracked.

## Database (migration `0004_finance.sql`)
- `payee_settings` (single row per property: payee_name, upi_id, qr_path, updated_by, updated_at) — owner/manager write, tenant read (name, UPI ID, QR only).
- `charges` (id, tenancy_id, type 'rent' | 'eb' | 'eb_reimbursement' | 'water' | 'maintenance' | 'other',
  period_start date, period_end date, amount_paise, due_date, status 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled',
  source_id (e.g. eb_bill id), notes, created_at)
  - Partial unique index (tenancy_id, type, period_start) where type = 'rent' → makes generation idempotent.
- `payments` (id, tenancy_id, amount_paise, paid_on date, method 'upi' | 'cash' | 'bank_transfer' | 'other',
  utr_reference, proof_path, received_by text (for cash), status 'submitted' | 'approved' | 'rejected',
  rejection_reason, submitted_by, reviewed_by, reviewed_at, created_at)
  - UTR unique when not null **and status <> 'rejected'** (blocks duplicates, but a tenant can resubmit the same UTR after a rejection, e.g. wrong screenshot).
  - Tenant inserts: a trigger forces `status = 'submitted'`, `submitted_by = auth.uid()`, and nulls
    `reviewed_by`, `reviewed_at`, `rejection_reason`, `received_by`. Tenants cannot update payments after submitting.
- `payment_allocations` (payment_id, charge_id, amount_paise) — staff only. Sum per payment ≤ payment amount
  **and** sum per charge ≤ charge amount (no over-allocation). Both checked in a trigger.
- Function `recompute_charge_status(charge_id)` — paid / partially_paid / pending / overdue, counting **only allocations of approved payments**. Call from triggers.
- `receipt_counters` (year int primary key, last_no int) and `receipts` (id, number text unique `RCPT-YYYY-NNNN`, payment_id unique,
  pdf_path, issued_at, cancelled_at, cancel_reason, replaced_by). Numbers come from `receipt_counters` with `SELECT ... FOR UPDATE`
  inside the approval transaction: restarts each year, no gaps (a Postgres sequence does neither).
- `eb_accounts` (id, house_id unique, service_number, consumer_name, meter_number, billing_cycle 'bimonthly' | 'monthly' default 'bimonthly', default_paid_by 'tenant_direct' | 'owner_reimbursed')
- `eb_bills` (id, eb_account_id, tenancy_id, period_start, period_end, units, amount_paise, late_fee_paise default 0, bill_date, due_date,
  paid_by, owner_paid_on, status 'pending' | 'paid' | 'overdue', proof_path, created_by)
  - If `paid_by = tenant_direct`: an `eb` charge for the tenant (proof upload + verify).
  - If `owner_reimbursed`: when owner payment is recorded, create an `eb_reimbursement` charge for the tenant.
- `reminder_rules` (property_id, offsets int[] default '{-5,-2,0}', overdue_every_days default 3, quiet_start '21:00', quiet_end '08:00')
- `notifications` (id, user_id, kind, title_key, params jsonb, link, read_at, created_at) — in-app center.
- `scheduled_job_runs` (id, job, started_at, finished_at, ok, details jsonb)
- Storage: `payee` (QR image), `payment-proofs`, `receipts` — all private.
- RLS: tenants see/insert only their own payments (status forced to `submitted`), see own charges, receipts, EB bills. Only staff approve. pgTAP tests for all.

## Jobs (pg_cron — schedules are in **UTC**; business dates computed in Asia/Kolkata)
- `generate_rent_charges()` daily 01:00 IST = cron `30 19 * * *`: for each active/notice tenancy, create next month's rent charge 7 days before due date using `rent_for()`; pro-rate a partial last month by days. Idempotent.
- **First month:** the pro-rated first charge (move-in date → day before the next due date) is created when the tenancy is **activated**, not by the job. The job then takes over from the next 5th.
- `mark_overdue()` daily 01:05 IST = cron `35 19 * * *`.
- `queue_reminders()` daily 09:00 IST = cron `30 3 * * *`: create `notifications` for tenants per `reminder_rules` (5 and 2 days before, due day, every 3 days overdue). Compute reminder dates by subtracting from the actual due date (no hard-coded "31st"). Also build a staff digest **"WhatsApp reminders to send today"** with one-tap links, since WhatsApp messages are sent by a manager's tap. Respect quiet hours.
- Each job writes to `scheduled_job_runs`. (Keep-alive is handled by the GitHub Action from Phase 1, not by these jobs.)
- pgTAP/SQL tests: run generation twice → still one charge; partial month amount correct; overdue transitions correct.

## Receipts
- PDF rendered with @react-pdf/renderer (Next.js route handler, or the Supabase Edge Function fallback chosen in Phase 1): receipt number, owner (payee) name, tenant, house, period, amount in figures and words (Indian format), method, UTR, date received. Tenant's language for labels; amounts in en-IN.
- Generated automatically on approval, saved to `receipts` bucket. Cancel + reissue flow (owner/manager), old receipt marked cancelled, never deleted.

## WhatsApp share links
- `wa.me/<91phone>?text=<encoded>` with message templates per language in `packages/i18n`
  (rent reminder, overdue reminder, receipt link, EB reminder). Opened by a manager's tap; no API.

## Screens
- Staff: Payee settings (upload father's QR, UPI ID, payee name); Rent board for the month (per house: amount, status, days overdue, "Remind on WhatsApp"); Payment approvals queue (screenshot preview, approve/reject with reason, allocate to charges); Record cash payment (received by: owner / manager name); EB accounts per house; Enter EB bill; Record owner paid EB; Notification center.
- Tenant: Rent screen (amount due, QR image, UPI ID with copy button, "I have paid" form: amount, date, UTR, screenshot), Payment history with status and receipt download, EB screen (bills, upload proof), Notification center.

## Acceptance
- [ ] Manual run of jobs creates correct charges for all houses on the 5th cycle; re-running creates nothing new.
- [ ] Tenant submits UTR + screenshot; manager approves; charge becomes Paid; receipt PDF appears for tenant in their language.
- [ ] Duplicate UTR is rejected; the same UTR can be resubmitted after a rejection.
- [ ] Allocating more than a charge's amount fails; a tenant cannot set `status` or `reviewed_by` on their payment.
- [ ] Receipt numbers are consecutive with no gaps and restart at 0001 in a new year (test with a shifted date).
- [ ] Cron schedules fire at the right IST time (check `scheduled_job_runs` timestamps).
- [ ] Partial payment shows Partially Paid; second payment completes it.
- [ ] Owner-paid EB creates a reimbursement charge for the tenant.
- [ ] WhatsApp reminder opens with the right pre-filled text in the tenant's language.
- [ ] All tests pass; run one full rent cycle with test data before using real data.
