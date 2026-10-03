# Phase 3 — Tenants, tenancies, occupants & documents

Read `CLAUDE.md` first. Show me a plan before writing code.

## Goal
Staff can onboard tenants into houses with tenancies, rent revisions, occupants and ID documents.
Tenants can sign in and see only their own tenancy.

## Database (migration `0003_tenancy.sql`)
- `tenants` (id, user_id → profiles nullable until invite accepted, full_name, phone, email, photo_path,
  permanent_address, emergency_contact_name, emergency_contact_phone, status 'active' | 'former', created_at)
- `tenancies` (id, code text unique e.g. `H01-T002`, house_id, tenant_id, start_date, expected_end_date,
  actual_end_date, advance_paise, notice_period_days, rent_due_day smallint default 5 check 1–28,
  status 'draft' | 'pending_agreement' | 'active' | 'notice_period' | 'completed' | 'cancelled', created_at)
  - Partial unique index: one tenancy per house where status in ('active','notice_period').
  - Status transition check (trigger): draft → pending_agreement → active → notice_period → completed;
    cancelled only from draft or pending_agreement. No delete allowed (revoke + RLS).
  - Until Phase 6 adds in-app agreements, staff move pending_agreement → active with
    **"Agreement signed offline"**: upload a scan/photo of the existing paper agreement (`offline_agreement_path`,
    private bucket `agreements`). This is how the current 5 tenants are onboarded.
  - Trigger: activating sets house to `occupied`.
- `rent_revisions` (id, tenancy_id, amount_paise, effective_from date, reason, set_by, created_at)
  — unique (tenancy_id, effective_from). Function `rent_for(tenancy_id, month date)` returns the revision in effect.
- `occupants` (id, tenancy_id, name, relationship, age, phone, photo_path, start_date, end_date)
- `consents` (id, tenant_id, purpose, notice_version, language, accepted_at)
- `identity_documents` (id, owner_type 'tenant' | 'occupant' | 'guest' | 'domestic_help', owner_id, tenancy_id,
  doc_type 'aadhaar' | 'pan' | 'driving_licence' | 'passport' | 'voter_id' | 'student_id' | 'employee_id' | 'address_proof' | 'other',
  number_last4, front_path, back_path, verification 'pending' | 'verified' | 'rejected', rejection_reason,
  expiry_date, uploaded_by, created_at, purge_after date)
- Storage buckets (private): `tenant-photos`, `identity-docs`.
- RLS:
  - Staff of the house's property: full access.
  - Tenant: select own `tenants` row; select own tenancies; select/insert/update own occupants and documents
    while tenancy is draft, pending_agreement, active or notice_period (documents are uploaded during move-in,
    before activation). No access to other tenancies.
  - Add the deferred tenant policy on `houses`/`house_photos`: tenant reads their current house only.
- pgTAP: tenant A cannot see tenant B's tenancy, occupants, documents, or storage objects.
- Activity logs on all writes. Document **views** also logged (via the signed-URL server route).

## Tenant invite flow
- Staff creates tenant (name, phone, email) → server action uses service role to call
  `auth.admin.inviteUserByEmail` → tenant sets a password (or uses Google with the same email) → `tenants.user_id` linked.
- First sign-in: privacy notice in their language + consent checkbox → row in `consents`. Document upload is blocked until consent exists.

## ID rules
- Number input: user types full number, the client keeps only the last 4 digits before sending. Server rejects anything longer than 4.
- Show IDs as `XXXX-XXXX-1234`.
- Any ID type accepted; Aadhaar is never required.
- Aadhaar upload screen asks for a **masked Aadhaar** (downloadable from UIDAI) and explains why, in the tenant's language.
  Storing only the last 4 digits is pointless if the image shows the full number.

## Screens
- Staff: Tenants list (current/former filter), tenant detail, "New tenancy" wizard
  (house → tenant → dates, rent, advance, notice, due day → occupants → documents), tenancy detail with rent revisions, document verification (verify/reject with reason).
- Tenant: Home placeholder, My house, Occupants (add/end), My documents (upload front/back), Profile (language, password, sign out).

## Acceptance
- [ ] I can onboard a current tenant end to end; they receive an invite email and sign in.
- [ ] Tenant sees only their house, occupants and documents.
- [ ] A second test tenant cannot access the first one's data via UI, API or storage URL (tests prove it).
- [ ] Creating a second active tenancy on the same house fails.
- [ ] An existing tenant with a paper agreement can be activated via "Agreement signed offline".
- [ ] Rent revision with a future date does not change the current month's rent.
- [ ] All tests pass.
