# Next up (handoff between sessions)

Read this first in every new session, then `docs/ROADMAP.md`. Update it at the end of a
session: tick what is done, add what is next.

## Owner (needs your accounts or keys)

- [ ] GitHub secrets: set `SUPABASE_URL` to the base URL only
      (`https://ugfyxuhuxyzxxeckqgcx.supabase.co`, nothing after `.co`)
- [ ] GitHub secrets: set `SUPABASE_DB_URL` to the **Session pooler** URI (host contains
      `pooler.supabase.com`, user `postgres.ugfyxuhuxyzxxeckqgcx`), not Direct connection
- [ ] `git push`, then Actions → run **supabase-keepalive** and **supabase-backup** by hand;
      both green, backup run has a `db-backup-…` artifact
- [ ] Google Auth Platform → Branding: fill **Developer contact information**, Save, no logo.
      Then Audience → **Publish app**. If still greyed out, wait for the Vercel deploy below.
- [ ] Until published: add testers under Audience → **Test users** (max 100)
- [ ] After the Claude build below: deploy to Vercel (steps in `docs/SETUP.md`), then set
      Google Branding app domain fields (home, `/privacy`, `/terms`, authorized domain
      `<project>.vercel.app`) and publish
- [ ] Supabase: "Allow new users to sign up" is **on** (sign-up opens now, per owner)

## Claude (next build, approved direction, confirm the plan at session start)

1. [ ] **Open sign-up copy**: replace the "early access" note and the `notInvited` error with
       welcoming new-user wording (keep the error mapping in case signups are closed again)
2. [ ] **Privacy policy + terms pages** (`/privacy`, `/terms`) in plain language matching
       `docs/CALM_CHARTER.md` (no trackers, no ads, data export and deletion, Google sign-in
       data used: email, name, avatar); linked from footer and login page
3. [ ] **Public landing page** at `/` (before login): hero with an animated book
       illustration (page turn, folded corner), feature highlights (any format, progress in
       any unit, opt-in goals with celebrations, personal stats, privacy promises, AI "coming
       later"), "how it works", FAQ, "Get started with Google" CTAs, header nav
4. [ ] **Motion system**, adequate not busy, all off under `prefers-reduced-motion`: shared
       spring presets, press feedback on every button/link, page transitions, scroll-reveal
       sections, hover lifts, small book touches (page-turn loader, books settling)
5. [ ] **Signed-in test harness**: dev-only `/auth/dev-login` route (404 in production,
       localhost only, guarded by a secret in `.env.local`), Playwright global setup that
       creates a throwaway test user on the dev project with the secret key and a random
       password, authenticated e2e project for `/app`
6. [ ] **Vercel deploy guide** in `docs/SETUP.md` (import repo, env vars, Supabase Site URL +
       Redirect URLs for the Vercel domain, Google redirect URI unchanged)
7. [ ] Live check in the Claude browser pane: owner signs in once there with Google, then
       Claude verifies `/app` flows visually

Then continue with `docs/ROADMAP.md` Phase 1 (account deletion + export, rate limits, SEO)
and Phase 2 (core library).

## Known context

- One Supabase project so far (`ugfyxuhuxyzxxeckqgcx`) acts as dev; a prod project comes
  with the Vercel deploy. Migrations are applied by the owner in the SQL Editor
  (`docs/MIGRATIONS.md`); `create_profiles` is applied to dev.
- Sign-in is Google only (`src/features/auth/config.ts`); magic link waits for custom SMTP.
- `@swc/core` is pinned to 1.16.2 in `pnpm-workspace.yaml` (1.16.12 fails an ACL check on
  this Windows machine). Retry newer versions occasionally.
- No Docker locally; pgTAP runs in CI (`.github/workflows/ci.yml`, `db` job).
