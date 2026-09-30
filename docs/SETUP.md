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
4. **Authentication → Sign In / Providers → User Signups**: turn **off** "Allow new users to
   sign up" and click **Save** (invite-only until Phase 6).
5. **Authentication → Emails → Templates**: point the links at the app's callback so they
   work in any browser (the default links drop the user on the home page, signed out).
   - **Invite user**, replace the link with:
     `<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/app">Accept your invite</a>`
   - **Magic link**, replace the link with:
     `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to Foldline</a>`
     (`RedirectTo` is the app's callback URL, which already carries `?next=`.)
6. **Authentication → URL Configuration → Redirect URLs**: add `http://localhost:3000/**`
   (dev) or `https://<your-vercel-domain>/**` (prod).
7. Add yourself and friends **without sending email** (the free mailer only reaches team
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

Then `pnpm dev` → http://localhost:3000/login. Magic link emails come from Supabase's
built-in mailer (a few per hour on the free tier; fine for a handful of people).

## 3. Vercel hosting

1. vercel.com → **Add New → Project** → import `isttiiak/foldline-web`. Framework is
   detected as Next.js; leave build settings as they are.
2. **Environment Variables** (Production): the three variables above with the **prod**
   project's values.
3. Deploy. Put the resulting domain into the prod Supabase URL Configuration (step 1.3).

## 4. Google sign-in

1. console.cloud.google.com → **APIs & Services → OAuth consent screen**: set it up
   (External, add yourself as a test user).
2. **Credentials → Create credentials → OAuth client ID** → Web application.
   Authorized redirect URIs: `https://<dev-project-ref>.supabase.co/auth/v1/callback` and
   `https://<prod-project-ref>.supabase.co/auth/v1/callback`.
3. In each Supabase project: **Authentication → Sign In / Providers → Google** → paste the
   Client ID and Secret, enable.

## 5. Metadata providers (Phase 1)

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
