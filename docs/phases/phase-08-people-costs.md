# Phase 8 — Guests, domestic help, expenses, announcements & web push (V1.5)

Read `CLAUDE.md` first. Show me a plan first.

## Database (migration `0008_people.sql`)
- `guests` (id, tenancy_id, name, phone, relationship, purpose, check_in, expected_checkout, checked_out_at,
  status 'upcoming' | 'currently_staying' | 'checked_out', created_by)
  - **ID mandatory for every guest, even one night**: insert fails unless an `identity_documents` row (owner_type 'guest') with a front image is linked.
- `domestic_help` (id, tenancy_id, name, phone, address, role 'maid' | 'cook' | 'driver' | 'caretaker' | 'other', photo_path, start_date, end_date, active)
  — ID document via `identity_documents` (owner_type 'domestic_help').
- `announcements` (id, author_id, target 'all' | 'property' | 'house' | 'tenant', target_id, title, body, created_at)
  + per-language text optional; `announcement_reads` (announcement_id, user_id, read_at).
- `push_subscriptions` (id, user_id, endpoint, keys jsonb, created_at).
- RLS + pgTAP for all.

## Features
- Tenant: register guest (with ID photo), check guest out; manage domestic help.
- Staff: guest log per house (current guests highlighted), notification when a guest is registered.
- Expenses screen (from Phase 5 table): add/edit with receipt image; categories plumbing, electrical, painting, cleaning, appliance, repair, property_tax, other.
- Announcements: compose, choose target, see who has read it.
- Web Push (free): VAPID keys in env, service-worker push handler, opt-in prompt after first sign-in on installed PWA (iPhone requires the app to be added to the home screen first). Push sent for: payment submitted/approved/rejected, reminders, complaint updates, announcements. Respect quiet hours.

## Acceptance
- [ ] Guest cannot be saved without an ID image.
- [ ] Announcement to one house reaches only that tenant.
- [ ] Push arrives on an installed Android PWA and an iPhone home-screen app.
