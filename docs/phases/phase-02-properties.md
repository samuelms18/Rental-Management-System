# Phase 2 — Properties & houses

Read `CLAUDE.md` first. Show me a plan before writing code.

## Goal
Staff can create properties and houses, upload house photos, and see occupancy at a glance.

## Database (migration `0002_houses.sql`)
- `houses` (id, property_id, unit_number, floor, unit_type, bedrooms, bathrooms, area_sqft,
  default_rent_paise bigint, default_advance_paise bigint, water_billing_enabled bool default false,
  status 'occupied' | 'vacant' | 'reserved' | 'under_maintenance' default 'vacant', notes, created_at)
  — unique (property_id, unit_number)
- `house_photos` (id, house_id, area 'exterior' | 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'balcony' | 'parking' | 'meter' | 'other',
  storage_path, caption, sort_order, uploaded_by, created_at)
- Storage bucket `house-photos` (private).
- RLS: staff of the property: full read/write; delete only for owner. Tenants: read their own current house (policy added in Phase 3 once tenancies exist — leave a TODO test).
- Activity log triggers on insert/update/delete of `houses`.
- pgTAP tests for each policy.

## Shared code
- Zod schemas: `propertySchema`, `houseSchema`, `housePhotoSchema` in `packages/validation`.
- `packages/api`: list/get/create/update functions for properties and houses.
- Image upload helper (reused later): client-side resize to max 1600px, convert to WebP, strip EXIF;
  server checks MIME and size (≤ 10 MB original); returns storage path. Signed-URL helper (300 s).

## Screens (`/owner/...`)
- Properties list → property detail with its houses.
- Add/edit property form.
- Add/edit house form (rent and advance entered in rupees, stored in paise).
- House detail: info, status badge, photo gallery grouped by area, upload, reorder, delete (owner only).
- Status chips: Occupied, Vacant, Reserved, Under Maintenance (manual change allowed for Reserved / Under Maintenance only; Occupied/Vacant are set automatically later).

## Acceptance
- [ ] I can enter all 5 houses with photos from my phone.
- [ ] Photos load via signed URLs; the raw storage URL does not work without auth.
- [ ] A manager cannot delete a house; the owner can.
- [ ] All text exists in en/ta/hi/ml.
- [ ] Lint, typecheck, unit and DB tests pass.
