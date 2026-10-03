# Languages

The app ships in English (`en`), Tamil (`ta`), Hindi (`hi`) and Malayalam (`ml`). Each person picks a language
on the sign-in screen or in Profile; it is saved in a `NEXT_LOCALE` cookie and in `profiles.preferred_language`.

## Where the text lives

| What | Where |
|---|---|
| Every screen, button, error and notification | `packages/i18n/messages/<lang>.json` |
| WhatsApp reminder text | the `whatsapp.*` keys in the same files (sent in the tenant's language) |
| Receipts, settlement statements, report PDFs | English labels only (the PDF standard fonts have no Indian scripts); names and amounts print as entered |
| Agreement text | the agreement template (Owner → Agreements → Templates). One template per language |
| Privacy notice | the `privacy.*` keys |

`pnpm test` fails if any language is missing a key that English has, has an extra key, or drops a
`{placeholder}` (`packages/i18n/src/keys.test.ts`). CI runs it on every push.

## Changing a translation

1. Edit the value in `packages/i18n/messages/<lang>.json`. Keep `{name}`-style placeholders exactly as they are.
2. `pnpm test` → push. The change goes live with the next deploy.

The Tamil, Hindi and Malayalam texts were machine-drafted. **A native speaker must read every screen before go-live**
(listed in `docs/GO_LIVE.md`).

## Adding a new language (example: Telugu, `te`)

1. Copy `packages/i18n/messages/en.json` to `te.json` and translate the values (never the keys).
   Add `"te": "తెలుగు"` under `languages` in **every** language file.
2. `packages/i18n/src/index.ts`: add `'te'` to `locales` and a `case 'te'` in `loadMessages`.
3. `packages/i18n/src/keys.test.ts`: import `te.json` and add `['te', te]` to the list.
4. `apps/web/app/layout.tsx`: add a Google font for the script (e.g. `Noto_Sans_Telugu`) and its CSS variable,
   the same way Tamil, Devanagari and Malayalam are added.
5. Database: a new migration that widens the language checks:
   ```sql
   alter table public.profiles drop constraint profiles_preferred_language_check,
     add constraint profiles_preferred_language_check check (preferred_language in ('en','ta','hi','ml','te'));
   ```
   Do the same for `consents.language` and `agreement_templates.language`
   (`grep -n "'ml')" supabase/migrations` lists them), then `pnpm db:types`.
6. Add `'te'` to `locale` in `packages/validation/src/fields.ts` and to the consent language list in
   `apps/web/lib/actions/tenancy.ts`.
7. `pnpm lint && pnpm typecheck && pnpm test && supabase test db`, then check a few screens in the new language.
