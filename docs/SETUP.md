# Setup: keys and one-time steps

Everything here needs the owner's hands (accounts, secrets). Keys go in `.env.local`
(never committed), in Vercel, or in GitHub repo secrets. Variable names are listed in
`.env.example`. No Docker needed.

## 1. Two Supabase projects (free tier allows two)

Create both at supabase.com → **New project**, region **Singapore**:

- `foldline-dev`: what `pnpm dev` on your PC talks to. Safe to break.
- `foldline-prod`: the real one, used by Vercel.

For **each** project:

1. **Project Settings → API Keys**: note the publishable key (`sb_publishable_...`) and the
   secret key (`sb_secret_...`). The project URL is under the **Connect** button.
2. **SQL Editor**: run every file listed in [MIGRATIONS.md](MIGRATIONS.md), in order.
3. **Authentication → URL Configuration**:
   - dev: Site URL `http://localhost:3000`
   - prod: Site URL `https://<your-vercel-domain>`
4. **Authentication → Sign In / Providers → User Signups**: turn **on** "Allow new users to
   sign up" and click **Save**. Sign-up is open; turning it off later shows visitors a gentle
   "sign-ups are paused" note instead of an error.
5. **Authentication → Emails → Templates**: point the links at the app's callback so they
   work in any browser (the default links drop the user on the home page, signed out).
   - **Invite user**, replace the link with:
     `<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/app">Accept your invite</a>`
   - **Magic link**, replace the link with:
     `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to Foldline</a>`
     (`RedirectTo` is the app's callback URL, which already carries `?next=`.)
6. **Authentication → URL Configuration → Redirect URLs**: add `http://localhost:3000/**`
   (dev) or `https://<your-vercel-domain>/**` (prod).
7. (Optional, only while sign-ups are off) add people **without sending email** (the free mailer only reaches team
   members and sends ~2 emails/hour): **Authentication → Users → Add user → Create new user**,
   enter their Gmail address, any long random password (never used), tick **Auto Confirm
   User**, create. They then sign in with **Continue with Google** using that address; Google
   is linked to the account automatically because the emails match.

## 2. Local development

Create `.env.local` in the project root with the **dev** project's values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<dev-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Then `pnpm dev` → http://localhost:3000.

### Signed-in e2e tests (optional)

To run the signed-in Playwright tests locally, also add to `.env.local`:

```
DEV_LOGIN_SECRET=<32+ random characters>
```

Generate one with `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`, then restart
`pnpm dev`. The secret unlocks `/auth/dev-login`, which signs in throwaway `@foldline.test`
users on the **dev** project (they are deleted after each run). The route is a 404 in
production builds, off localhost, or without the secret. **Never set `DEV_LOGIN_SECRET` on
Vercel.** Without it, `pnpm test:e2e` runs only the signed-out tests (as CI does).

## 3. Vercel hosting

Do this after the prod Supabase project is set up (section 1) and CI is green on `main`.

1. **Import**: vercel.com → **Add New → Project** → import `isttiiak/foldline-web` (connect
   the `isttiiak` GitHub account if asked). Framework preset **Next.js** is detected; leave
   Build Command, Output Directory and Install Command on their defaults (pnpm is picked up
   from `packageManager` in `package.json`). Root directory: the repo root.
2. **Environment Variables** → add these three, ticking **Production** (and **Preview** if
   you want preview deploys to work), with the **prod** project's values:
   - `NEXT_PUBLIC_SUPABASE_URL`: the base project URL only, `https://<prod-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_...`
   - `SUPABASE_SECRET_KEY`: `sb_secret_...` (Vercel keeps it server-side; never prefix it
     with `NEXT_PUBLIC_`)

   Do **not** add `DEV_LOGIN_SECRET`. Optional: `NEXT_PUBLIC_SITE_URL` once you have a custom
   domain (canonical links, sitemap and link previews use it; until then the Vercel
   production domain is used automatically).

3. **Deploy**. Note the domain Vercel gives you, e.g. `foldline.vercel.app` (Project →
   **Settings → Domains** shows it; you can rename the project there first to get a nicer one).
4. **Supabase (prod) → Authentication → URL Configuration**:
   - **Site URL**: `https://<your-vercel-domain>`
   - **Redirect URLs**: add `https://<your-vercel-domain>/**`. For preview deploys also add
     `https://*-<your-vercel-team>.vercel.app/**`.
5. **Google Cloud → Credentials**: nothing to change. The OAuth redirect URI points at
   Supabase (`https://<prod-ref>.supabase.co/auth/v1/callback`), not at Vercel, so it stays
   as set up in section 4.
6. **Google Auth Platform → Branding**:
   - Application home page: `https://<your-vercel-domain>`
   - Privacy policy: `https://<your-vercel-domain>/privacy`
   - Terms of service: `https://<your-vercel-domain>/terms`
   - Authorized domains: add `<your-vercel-domain>` (e.g. `foldline.vercel.app`). If Google
     asks you to prove ownership, verify it in Google Search Console (URL-prefix property,
     HTML tag method), or leave branding unverified until a custom domain exists (Phase 9);
     sign-in works either way because Foldline only asks for email and profile.
   - Developer contact information: your email. Save.
7. **Google Auth Platform → Audience → Publish app** so it is **In production**.
8. **Smoke test** in a private window: open the domain, click **Get started with Google**,
   finish sign-in, and check you land on **Your library**. Then open `/privacy` and `/terms`.

Every push to `main` now deploys automatically. Migrations are still applied by hand
(`docs/MIGRATIONS.md`): run each new file on the prod project **before** merging code that
needs it.

## 4. Google sign-in

1. console.cloud.google.com → **Google Auth Platform** (formerly OAuth consent screen): set it
   up as **External**. Under **Audience**, click **Publish app** so it is **In production**;
   Foldline only asks for email and profile, so Google does not require a review. (In
   "Testing" mode only listed test users can sign in.) Home page, privacy policy and terms
   links are filled in after the Vercel deploy (section 3, step 6).
2. **Credentials → Create credentials → OAuth client ID** → Web application.
   Authorized redirect URIs: `https://<dev-project-ref>.supabase.co/auth/v1/callback` and
   `https://<prod-project-ref>.supabase.co/auth/v1/callback`.
3. In each Supabase project: **Authentication → Sign In / Providers → Google** → paste the
   Client ID and Secret, enable.

## 5. Metadata providers (Phase 2)

Add these to `.env.local` and to Vercel when that roadmap item lands:

- `OPEN_LIBRARY_CONTACT_EMAIL`: any email of yours (sent in the User-Agent). No signup.
- `GOOGLE_BOOKS_API_KEY`: Google Cloud Console → **APIs & Services → Library → Books API
  → Enable**, then **Credentials → Create credentials → API key**, restrict it to Books API.
- `HARDCOVER_API_TOKEN` (optional): hardcover.app account settings, API section.

## 6. GitHub repo secrets (keep-alive and backup workflows, prod project)

github.com/isttiiak/foldline-web → **Settings → Secrets and variables → Actions → New
repository secret**:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`: prod values.
- `SUPABASE_DB_URL`: prod Supabase → **Connect → Session pooler** connection string, with
  the database password filled in.
- `BACKUP_PASSPHRASE`: a long random passphrase you invent. Keep it in your password
  manager; backups cannot be decrypted without it.

Then run both workflows once from the **Actions** tab to confirm they pass. (Keep-alive
only covers prod; the dev project may pause after a week idle. Resume it from the
dashboard when needed.)

## Optional: Docker

With Docker Desktop you can run Supabase on your PC (`pnpm supabase start`) and run the
pgTAP tests locally. Not required: CI runs them on every push.
