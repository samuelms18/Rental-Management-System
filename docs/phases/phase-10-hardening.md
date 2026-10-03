# Phase 10 — Languages, security review & hardening (V2)

Read `CLAUDE.md` first. Show me a plan first.

## Languages
- Audit: no hard-coded strings left; every key present in en/ta/hi/ml (add a CI check that fails on missing keys).
- Receipts, settlement statements, notifications and WhatsApp templates verified in all 4 languages.
- Document how to add a new language (copy `en.json`, translate, register locale).

## Security review
- Re-run and extend RLS tests: every table, every role, every storage bucket.
- Check: no service-role key in client bundle (search build output); no full ID numbers anywhere in DB or logs.
- Rate limiting on login, uploads, payment submission (Supabase settings + middleware).
- Dependency audit (`pnpm audit`), Dependabot enabled.
- Headers: CSP, HSTS, X-Frame-Options, Referrer-Policy.
- Session review: sign-out-all-devices works; former tenants are disabled after 90 days.

## Reliability
- Restore drill from the latest backup; update `docs/RESTORE.md`.
- Check free-tier usage (DB size, storage, bandwidth) and add a staff warning when storage passes 80%.
- Accessibility pass: contrast, labels, keyboard, screen reader on key flows.
- Performance: Lighthouse ≥ 90 on mobile for tenant home and rent screens.

## Acceptance
- [ ] Security checklist in `docs/SECURITY.md` complete.
- [ ] Restore drill done.
- [ ] CI enforces translation completeness.
