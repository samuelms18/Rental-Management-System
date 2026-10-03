# Phase 6 — Rental agreements (V1.5)

Read `CLAUDE.md` first. Start only after V1 has been in real use for about 2 months. Show me a plan first.

## Goal
Generate an agreement from a template, send it, collect acceptance/signature, store the final stamped copy, and remind before expiry.

## Database (migration `0006_agreements.sql`)
- `agreement_templates` (id, name, language, body_markdown with placeholders, version, is_active, reviewed_by_note)
- `agreements` (id, tenancy_id, template_id, status 'draft' | 'generated' | 'sent' | 'awaiting_signature' | 'signed' | 'approved' | 'active' | 'expired' | 'terminated',
  start_date, end_date, current_version_id, final_stamped_path, created_at)
- `agreement_versions` (id, agreement_id, version_no, rendered_pdf_path, data_snapshot jsonb, created_by, created_at)
- `signatures` (id, agreement_version_id, signer_role 'tenant' | 'owner', method 'drawn' | 'uploaded_pdf', image_path, signed_at, ip, user_agent)
- RLS + pgTAP: tenant sees only own agreements.

## Template
- Placeholders: `{{owner_name}}`, `{{tenant_name}}`, `{{property_address}}`, `{{house_unit}}`, `{{rent}}`, `{{rent_in_words}}`,
  `{{advance}}`, `{{start_date}}`, `{{end_date}}`, `{{notice_days}}`, `{{due_day}}`, `{{occupants}}`.
- Seed one English template; brother reviews it before use. Template editor for staff (markdown with preview).

## Flow
Create → Generate PDF → Preview → Send (notification + WhatsApp link) → Tenant reviews and draws signature or uploads signed PDF → Owner reviews/approves → Active on start date.
- Any edit after Generated creates a new version; signatures belong to a version.
- After approval, staff uploads the stamped/registered copy as `final_stamped_path` (shown as the official document).
- Tenancies activated in V1 via "Agreement signed offline" keep that scan; their next renewal goes through this flow.
- Brother to confirm Tamil Nadu rules before the template is used: whether the TN tenancy act (2017) requires every
  agreement to be registered with the Rent Authority, and any cap on the advance amount.
- Show a clear note: in-app signature is a record of acceptance; the stamped agreement is the legal copy.

## Reminders
- Expiry reminders at 90, 60, 30, 7 days (job). Renewal creates a new agreement linked to the same tenancy, plus a rent revision if rent changes.
- Fill the dashboard placeholder from Phase 5 with expiring agreements.

## Acceptance
- [ ] Agreement generated with correct data, signed by tenant on phone, approved, stamped copy uploaded.
- [ ] Editing after signing creates a new version and requires re-signing.
- [ ] Expiry reminders fire in tests.
