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
- [ ] `.env.local`: add `DEV_LOGIN_SECRET=<32+ random chars>` (see `docs/SETUP.md` section 2),
      and add a `DEV_LOGIN_SECRET=` line to `.env.example` (Claude cannot touch `.env*` files)

## Claude

Done on 2026-10-01: welcoming login copy, `/privacy` + `/terms`, public landing page, motion
system (`src/lib/motion.ts`, `src/components/motion/*`), signed-in test harness
(`/auth/dev-login` + Playwright `setup`/`signed-in`/`cleanup` projects), Vercel guide in
`docs/SETUP.md`.

- [ ] Live check in the browser pane: owner signs in once with Google, then Claude verifies
      `/app` visually
- [ ] Run the signed-in e2e suite once the owner has set `DEV_LOGIN_SECRET`
- [ ] Hero and page transitions start at opacity 0 until hydration; revisit with the SEO item
      (render the hero visible on the server, animate only transforms)

Next: `docs/ROADMAP.md` Phase 1 (account deletion + export, rate limits, SEO), then Phase 2
(core library). Landing copy describes Phase 2-3 features (search, ISBN, goals, stats) that
are not built yet.

## Known context

- One Supabase project so far (`ugfyxuhuxyzxxeckqgcx`) acts as dev; a prod project comes
  with the Vercel deploy. Migrations are applied by the owner in the SQL Editor
  (`docs/MIGRATIONS.md`); `create_profiles` is applied to dev.
- Sign-in is Google only (`src/features/auth/config.ts`); magic link waits for custom SMTP.
- `@swc/core` is pinned to 1.16.2 in `pnpm-workspace.yaml` (1.16.12 fails an ACL check on
  this Windows machine). Retry newer versions occasionally.
- No Docker locally; pgTAP runs in CI (`.github/workflows/ci.yml`, `db` job).
