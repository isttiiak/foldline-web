# Setup: keys and one-time steps

Everything here needs the owner's hands (accounts, secrets, installs). Keys go in
`.env.local` (never committed) or in GitHub repo secrets. Variable names are listed in
`.env.example`.

## 1. Local development

1. Install **Docker Desktop** and start it.
2. `pnpm supabase start` (first run downloads images, takes a few minutes).
3. `pnpm supabase status` prints the local values. Copy them into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` = API URL (usually `http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key (`sb_publishable_...`)
   - `SUPABASE_SECRET_KEY` = Secret key (`sb_secret_...`)
4. `pnpm supabase db reset`, then `pnpm supabase test db` and `pnpm db:types`.
5. Accounts are invite-only. Create yourself in Studio: http://127.0.0.1:54323 →
   **Authentication → Users → Add user**. Magic link emails arrive in Mailpit:
   http://127.0.0.1:54324.
6. `pnpm dev` → http://localhost:3000/login.

## 2. Hosted Supabase project

1. supabase.com → **New project**, region **Singapore**.
2. **Project Settings → API Keys**: copy the publishable (`sb_publishable_...`) and secret
   (`sb_secret_...`) keys. The URL is under the **Connect** button.
3. **Authentication → URL Configuration**: Site URL = your deployed URL; add
   `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to
   Redirect URLs.
4. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign
   up" (invite-only until Phase 6). Invite friends from **Authentication → Users → Invite**.
5. Apply migrations yourself (Claude never touches the remote project).

## 3. Google sign-in

1. console.cloud.google.com → **APIs & Services → OAuth consent screen**: set it up
   (External, add yourself as a test user).
2. **Credentials → Create credentials → OAuth client ID** → Web application.
   Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   (and `http://127.0.0.1:54321/auth/v1/callback` for local).
3. Hosted: paste Client ID + Secret in **Supabase → Authentication → Sign In / Providers →
   Google**.
4. Local (optional): create `supabase/.env` with `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
   and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, set `enabled = true` under
   `[auth.external.google]` in `supabase/config.toml`, restart Supabase.

## 4. Metadata providers (Phase 1)

- `OPEN_LIBRARY_CONTACT_EMAIL`: any email of yours (sent in the User-Agent). No signup.
- `GOOGLE_BOOKS_API_KEY`: Google Cloud Console → **APIs & Services → Library → Books API
  → Enable**, then **Credentials → Create credentials → API key**, restrict it to Books API.
- `HARDCOVER_API_TOKEN` (optional): hardcover.app account settings, API section.

## 5. GitHub repo secrets (keep-alive and backup workflows)

github.com/isttiiak/foldline-web → **Settings → Secrets and variables → Actions → New
repository secret**:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`: same values as the hosted project.
- `SUPABASE_DB_URL`: Supabase → **Connect → Session pooler** connection string, with the
  database password filled in.
- `BACKUP_PASSPHRASE`: a long random passphrase you invent. Keep it in your password
  manager; backups cannot be decrypted without it.

Then run both workflows once from the **Actions** tab to confirm they pass.
