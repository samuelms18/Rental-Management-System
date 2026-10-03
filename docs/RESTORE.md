# Restoring from a backup

The weekly **Backup** GitHub Action saves one encrypted file, `fpm-backup-YYYY-MM-DD.tar.gz.age`,
as a workflow artifact (kept 90 days). It contains:

- `backup/database.dump` — `pg_dump` of the `public`, `auth` and `storage` schemas (data + structure)
- `backup/storage/<bucket>/...` — every photo, ID document, payment screenshot, receipt and video

Do a **restore drill before go-live and every 3 months** (into a spare free Supabase project).
This procedure was tested on 3 Oct 2026 against the local stack: all rows, users (with working
passwords), audit entries and files came back.

## What you need

- The **age private key** (`AGE-SECRET-KEY-1…`) — kept off GitHub (password manager + a printed copy).
- `age`, PostgreSQL 17 client tools (`pg_restore`, `psql`), Node 20+, the Supabase CLI.

## 1. Download and decrypt

1. GitHub → Actions → **Weekly backup** → latest run → download the artifact (a zip).
2. Unzip, then:

```bash
age -d -i my-age-key.txt fpm-backup-2026-10-04.tar.gz.age | tar -xz
# → backup/database.dump and backup/storage/
```

## 2. Prepare the target project

Use a **fresh** Supabase project (or the drill project).

```bash
supabase link --project-ref <new-project-ref>
supabase db push          # creates all tables, policies and jobs from supabase/migrations
```

## 3. Restore the data

Use the **session pooler** connection string (Supabase → Connect → Session pooler).
`session_replication_role = replica` pauses triggers during the load, so audit logs and
status triggers don't fire again for old rows.

```bash
export DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'
pg_restore --data-only --schema=public --schema=auth --schema=storage -f data.sql backup/database.dump
(echo 'SET session_replication_role = replica;'; cat data.sql) | psql "$DB_URL" -v ON_ERROR_STOP=0
```

These errors are expected and harmless: `permission denied for table schema_migrations / migrations /
buckets_vectors / vector_indexes`, and `duplicate key … buckets_pkey` (the buckets already exist).
Anything else: stop and investigate.

## 4. Restore the files

```bash
SUPABASE_URL=https://<new-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service key> \
  node scripts/restore-storage.mjs backup/storage
```

## 5. Check

```sql
select (select count(*) from public.tenancies)  tenancies,
       (select count(*) from public.payments)   payments,
       (select count(*) from public.receipts)   receipts,
       (select count(*) from auth.users)        users,
       (select count(*) from storage.objects)   files;
```

Compare with the numbers from the live project, sign in as a manager and a tenant, and open a photo and a receipt.

## 6. Switch the app over (real disaster only)

Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in
Cloudflare, redeploy, and update the GitHub Action secrets (`SUPABASE_*`). Re-apply the Auth settings
from `docs/SETUP.md` (SMTP, URLs, email templates, Google, MFA) — they are project settings, not data.
