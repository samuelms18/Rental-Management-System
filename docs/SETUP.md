# Going live: one-time setup

Everything here is free. Total time: about 1–2 hours. Do the steps in order.
You need a laptop with Node 22, pnpm, Git and the Supabase CLI (`npm i -g supabase`).

```bash
git clone https://github.com/samuelms18/Rental-Management-System.git
cd Rental-Management-System
pnpm install
```

---

## 1. Supabase project (database, logins, files)

1. Sign up at <https://supabase.com> → **New project**.
   - Name: `family-property-manager`, Region: **Mumbai (ap-south-1)**, generate a strong DB password and save it in your password manager.
2. Put the schema in it:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>     # the ref is in the project URL
   supabase db push                                    # creates all tables, security rules and daily jobs
   ```
3. **Project Settings → API**: copy the **Project URL**, the **anon / publishable key** and the **service_role key**.
   The service_role key is a master key: never put it in the app's public settings, chats or GitHub files.

### 1a. Auth settings (Authentication in the dashboard)

| Where | Setting |
|---|---|
| Sign In / Providers → **Allow new users to sign up** | **Off** (only invited people get in) |
| Sign In / Providers → **Email** | **On** (do not turn this off — it disables password login) |
| URL Configuration → **Site URL** | your app URL from step 3, e.g. `https://family-property-manager.<you>.workers.dev` |
| URL Configuration → **Redirect URLs** | `https://family-property-manager.<you>.workers.dev/**` |
| Multi-Factor → **TOTP (App Authenticator)** | **Enabled** (free) |
| Emails → Templates → **Invite user** | paste `supabase/templates/invite.html` |
| Emails → Templates → **Reset password** | paste `supabase/templates/recovery.html` |
| Passwords | minimum length **8** |

### 1b. Email sending with Gmail (free)

Supabase's built-in mailer only emails your own team, so tenant invites need your own SMTP.

1. Use a Gmail account for the app (e.g. the family's Gmail). Turn on **2-Step Verification** (myaccount.google.com → Security).
2. Security → **App passwords** → create one named "FPM". Copy the 16-letter password.
3. Supabase → Authentication → Emails → **SMTP Settings** → enable custom SMTP:
   - Host `smtp.gmail.com`, Port `465`, Username = the Gmail address, Password = the app password
   - Sender email = the same Gmail address, Sender name `Family Property Manager`
4. Set the **email rate limit** (Authentication → Rate Limits) to about 30 per hour.

Gmail allows ~500 emails a day, far more than 5 houses need.

### 1c. Google sign-in (optional)

1. <https://console.cloud.google.com> → new project → **APIs & Services → OAuth consent screen** (External, app name "Family Property Manager").
2. **Credentials → Create OAuth client ID → Web application**.
   Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → **Google** → paste the Client ID and Secret → enable.
4. In step 3 below set `NEXT_PUBLIC_GOOGLE_SIGN_IN=true`.

Because sign-ups are off, Google only works for emails a manager has already invited.

---

## 2. Bootstrap the family accounts

Creates the property and emails the father, Samuel and his brother a set-password link:

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service key> \
SITE_URL=https://family-property-manager.<you>.workers.dev \
PROPERTY_NAME="Family Houses" PROPERTY_CITY=Chennai \
OWNER_EMAIL=father@gmail.com OWNER_NAME="Father's full name" \
MANAGER_EMAILS="samuel@gmail.com,brother@gmail.com" MANAGER_NAMES="Samuel,Brother's name" \
node scripts/bootstrap-staff.mjs
```

(Do step 3 first if you want the email links to open the live app; you can re-run this script safely.)

---

## 3. Deploy the app to Cloudflare (free)

1. Sign up at <https://dash.cloudflare.com>. Then:
   ```bash
   cd apps/web
   npx wrangler login
   ```
2. Create `apps/web/.env.production.local` with the **public** values only (this file is git-ignored):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   NEXT_PUBLIC_SITE_URL=https://family-property-manager.<you>.workers.dev
   NEXT_PUBLIC_GOOGLE_SIGN_IN=false
   ```
   Add the **public** push key too (step 3a makes it):
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<from step 3a>
   ```
3. Store the server-only values as encrypted Cloudflare secrets (never in a file):
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put CRON_SECRET            # any long random text, e.g. `openssl rand -hex 32`
   npx wrangler secret put PUSH_DISPATCH_SECRET   # another long random text
   npx wrangler secret put VAPID_PRIVATE_KEY      # from step 3a
   npx wrangler secret put VAPID_SUBJECT          # mailto:<the family Gmail address>
   ```
4. Deploy:
   ```bash
   pnpm cf:deploy
   ```
   The first deploy prints your URL (`https://family-property-manager.<you>.workers.dev`).
   If it differs from what you put in Supabase (step 1a) or `.env.production.local`, fix those and deploy again.

The app uses about **2.3 MB of the 3 MB** Workers free-plan limit (checked 3 Oct 2026 with all releases built, using Next's
webpack build + minify). Check again before each release: `npx wrangler deploy --dry-run --outdir /tmp/cf`.

### 3a. Phone notifications (web push, free)

1. Make the push key pair once, on your laptop:
   ```bash
   node scripts/vapid-keys.mjs
   ```
   It prints `NEXT_PUBLIC_VAPID_PUBLIC_KEY=…` (public, goes in `.env.production.local`) and
   `VAPID_PRIVATE_KEY=…` (secret, goes in `wrangler secret put`). Keep both in the password manager:
   if the pair changes, every phone has to turn notifications on again.
2. Tell the database where to send pushes. Supabase → **SQL Editor** → run (use your app URL and the
   same `PUSH_DISPATCH_SECRET` you gave Cloudflare):
   ```sql
   insert into public.app_settings (key, value) values
     ('push_dispatch_url', 'https://family-property-manager.<you>.workers.dev/api/push/dispatch'),
     ('push_dispatch_secret', '<PUSH_DISPATCH_SECRET>')
   on conflict (key) do update set value = excluded.value;
   ```
   Nobody can read this table from the app; only the database itself uses it.
3. On each phone: open the app → **Notifications** (bell) → **Get notifications on this phone → Turn on**.
   iPhone needs iOS 16.4+ and the app added to the Home Screen first.
   Notifications are held back during quiet hours (21:00–08:00 IST); the in-app bell always has them.

---

## 4. GitHub Actions secrets (backup + keep-alive)

1. Make an encryption key for backups **on your laptop**:
   ```bash
   age-keygen -o fpm-backup-key.txt    # install age: https://github.com/FiloSottile/age
   ```
   Keep `fpm-backup-key.txt` in your password manager and print it. **Never put it on GitHub.**
   Copy the line starting `age1...` — that is the public key.
2. GitHub repo → Settings → Secrets and variables → **Actions** → New repository secret:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `SUPABASE_DB_URL` | Supabase → **Connect → Session pooler** connection string (with your DB password). Not the direct `db.<ref>` one: it's IPv6-only and GitHub can't reach it. |
| `AGE_PUBLIC_KEY` | the `age1...` public key |
| `APP_URL` | `https://family-property-manager.<you>.workers.dev` |
| `CRON_SECRET` | the same value you gave Cloudflare in step 3 |

3. Actions tab → run **Weekly backup**, **Keep Supabase awake** and **Daily maintenance** once by hand (Run workflow).
   All should go green and the backup should produce an artifact. *Daily maintenance* deletes ID documents whose
   12-month retention has ended (the database jobs for rent, reminders, agreements and guests run inside Supabase).

---

## 5. First sign-in

Each family member opens their email, sets a password, signs in and sets up **two-step verification**
with an authenticator app (Google Authenticator / Microsoft Authenticator). The app refuses staff
access without it, and so does the database.

Then follow **`docs/GO_LIVE.md`** before entering any real tenant documents or money records.

## Installing on phones

- **Android (Chrome):** open the app → menu ⋮ → **Install app** / Add to Home screen.
- **iPhone (Safari):** open the app → Share → **Add to Home Screen**.
