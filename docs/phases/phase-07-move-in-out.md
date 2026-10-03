# Phase 7 — Move-in, move-out & deposit settlement (V1.5)

Read `CLAUDE.md` first. Show me a plan first.

## Goal
Guided move-in checklist; move-out with photo comparison, meter reading, itemized deposit settlement and refund record.

## Database (migration `0007_move.sql`)
- `move_in_records` (id, tenancy_id unique, checklist jsonb, meter_reading, advance_received_paise, advance_received_on, advance_method, completed_at, completed_by)
- `move_out_records` (id, tenancy_id unique, notice_date, move_out_date, meter_reading, inspection_notes, final_rent_paise, final_eb_paise, other_outstanding_paise,
  refund_paise, refund_date, refund_method, refund_reference, status 'draft' | 'shared_with_tenant' | 'acknowledged' | 'disputed' | 'settled', tenant_note, settled_at)
- `tenancy_photos` (id, tenancy_id, stage 'move_in' | 'move_out', area (same as house_photos), path, created_at)
- `meter_readings` (id, house_id, tenancy_id, reading, read_on, photo_path, stage 'move_in' | 'move_out' | 'regular')
- `deposit_transactions` (id, tenancy_id, type 'received' | 'deduction' | 'offset_rent' | 'offset_eb' | 'refund', amount_paise, reason, photo_path, created_by, created_at)
- Check: refund = received − deductions − offsets; computed, never typed.
- RLS + pgTAP.

## Move-in checklist (wizard, reuses Phase 3 screens)
Vacant house → tenant → tenancy → occupants → documents (with consent) → agreement → advance received → move-in photos + meter reading → activate.

## Move-out
- Notice: tenancy → notice_period with notice date; final charges planned.
- Move-out day: photos (side by side with move-in photos per area), meter reading → final EB share calculated, pro-rated final rent.
- Deductions: each with reason and optional photo. Complaint repair costs are NOT added automatically; staff may add one explicitly.
- Settlement statement PDF (tenant's language) shared in app + WhatsApp; tenant acknowledges or adds a dispute note.
- Settle: record refund date/method/reference → tenancy `completed`, house `vacant`, tenant `former`,
  set `purge_after = settled_at + 12 months` on all their identity documents and guest IDs.
- Former tenant keeps read-only access to the settlement statement for 90 days, then sign-in is disabled.

## Retention job
- `purge_expired_documents()` daily: deletes storage objects and document rows past `purge_after`, keeps an activity log entry.

## Acceptance
- [ ] Example: advance ₹80,000 − painting ₹2,000 − tap ₹500 − cleaning ₹500 = refund ₹77,000, computed correctly.
- [ ] After settlement the house is Vacant and a new tenancy can be created; old history stays intact.
- [ ] Purge job removes ID files after 12 months (test with a shifted clock).
