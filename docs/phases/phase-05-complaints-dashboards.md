# Phase 5 — Complaints, dashboards & go-live

Read `CLAUDE.md` first. Show me a plan before writing code.

## Goal
Tenants raise complaints; staff resolve them. Owner dashboard answers "What needs my attention today?".
Finish V1 Core and pass the go-live gate.

## Database (migration `0005_complaints.sql`)
- `complaints` (id, code `CMP-0001`, tenancy_id, category 'plumbing' | 'electrical' | 'water' | 'bathroom' | 'kitchen' | 'leakage' | 'door_lock' | 'appliance' | 'cleaning' | 'other',
  title, description, priority 'low' | 'normal' | 'urgent', status 'raised' | 'acknowledged' | 'assigned' | 'in_progress' | 'resolved' | 'tenant_confirmed' | 'closed',
  assigned_name, assigned_phone, resolution_note, resolution_cost_paise, reopened_count smallint default 0, resolved_at, created_at)
- `complaint_media` (id, complaint_id, path, kind 'image' | 'video') — video ≤ 50 MB, ≤ 60 s.
- `complaint_updates` (id, complaint_id, actor_id, from_status, to_status, note, created_at)
- `expenses` (id, property_id, house_id nullable, category, amount_paise, spent_on, description, receipt_path, complaint_id nullable, created_by)
  — resolution cost creates an expense; NEVER touches deposit.
- Job `auto_close_complaints()` daily: resolved > 7 days without tenant confirmation → closed.
- Tenant may reopen a resolved complaint once (reopened_count < 1) with a reason.
- RLS + pgTAP: tenant sees only own complaints; staff all in their property.

## Dashboards
- **Owner `/owner`** — action list in this order, each item linking to the action:
  1. Payment submissions waiting for approval
  2. Overdue rent/EB with days overdue
  3. Urgent or unacknowledged complaints
  4. Rent/EB due in next 7 days
  5. Tenants in notice period / agreements expiring (placeholder until Phase 6)
  6. Summary cards: houses total/occupied/vacant; this month rent expected/collected/pending
- **Tenant `/tenant`** — house, rent due + Pay button (QR), EB due, open complaint status, unread notifications.
- Use SQL views or RPC functions for dashboard queries; keep them fast.

## Audit & history
- Activity log screen for staff (filter by house, actor, date).
- House timeline (basic): tenancies, rent revisions, complaints.

## Search & filters
- Global search for staff: tenant name, phone, house, tenancy code, complaint code, UTR.

## Go-live gate (checklist in `docs/GO_LIVE.md`)
- [ ] Full RLS test suite passes; manual check with two real tenant test accounts on phones.
- [ ] Restore test done from a backup artifact into a fresh Supabase project.
- [ ] Owner and managers have 2FA on.
- [ ] Privacy notice text reviewed by brother (law student) in all 4 languages.
- [ ] Translations checked by a native speaker for ta/hi/ml.
- [ ] Error monitoring: free option only (e.g. Sentry free tier) or server logs.
- [ ] Production env vars set; no test data in production.

## Acceptance
- [ ] Complaint full lifecycle works, with photos; cost appears in expenses.
- [ ] Owner dashboard shows correct counts against test data.
- [ ] Go-live checklist complete. **V1 Core done.**
