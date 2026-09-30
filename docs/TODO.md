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
- [x] Supabase: "Allow new users to sign up" is **on** (sign-up opens now, per owner)
- [x] `.env.local` has `DEV_LOGIN_SECRET`; `.env.example` lists it

## Claude

Done on 2026-10-01: welcoming login copy, `/privacy` + `/terms`, public landing page, motion
system (`src/lib/motion.ts`, `src/components/motion/*`), signed-in test harness
(`/auth/dev-login` + Playwright `setup`/`signed-in`/`cleanup` projects), Vercel guide in
`docs/SETUP.md`.

- [x] Live check in the browser pane: owner signed in with Google; `/app`, empty shelf,
      mobile menu with email and sign out verified (2026-10-01)
- [x] Run the signed-in e2e suite (passed 2026-10-01 with a one-off secret; set
      `DEV_LOGIN_SECRET` in `.env.local` to run it routinely)
- [x] Hero and page transitions no longer hide content before hydration (CSS entrances that
      start dimmed; `data-reveal` fallback under `<noscript>`)

Also done on 2026-10-01: `/app/settings` with "Download my data" (JSON via
`/app/settings/export`) and "Delete account" (typed-email confirmation, then `/goodbye`).
When a migration adds a user-owned table, add it to `EXPORTED_TABLES` in
`src/features/export/server/collect-user-data.ts` and give it `on delete cascade`.

Also done: rate limits (migration 0002 applied to dev), SEO basics (metadata, OG image,
`sitemap.xml`, `robots.txt`, JSON-LD, `llms.txt`). Migrations are now numbered `NNNN_name.sql`.

Next: Phase 2 (core library), starting with its migration (`0003_...`). The Vercel deploy is
postponed by the owner; Phase 1's last item stays open until then. Landing copy describes
Phase 2-3 features (search, ISBN, goals, stats) that are not built yet.

## Known context

- One Supabase project so far (`ugfyxuhuxyzxxeckqgcx`) acts as dev; a prod project comes
  with the Vercel deploy. Migrations are applied by the owner in the SQL Editor
  (`docs/MIGRATIONS.md`); `create_profiles` is applied to dev.
- Sign-in is Google only (`src/features/auth/config.ts`); magic link waits for custom SMTP.
- `@swc/core` is pinned to 1.16.2 in `pnpm-workspace.yaml` (1.16.12 fails an ACL check on
  this Windows machine). Retry newer versions occasionally.
- No Docker locally; pgTAP runs in CI (`.github/workflows/ci.yml`, `db` job).
