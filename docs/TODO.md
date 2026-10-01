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
- [x] `.env.local` has `OPEN_LIBRARY_CONTACT_EMAIL` (live lookup used Open Library,
      2026-10-01). Set it on Vercel too; `GOOGLE_BOOKS_API_KEY` is optional (larger quota,
      see `docs/SETUP.md`)
- [x] `0003_create_library.sql` applied to dev (confirmed 2026-10-01: export e2e passes).
      Prod later, with the Vercel deploy
- [x] `0004_profile_details.sql` and `supabase/dev-seeds/sample_library.sql` run on dev
      (2026-10-01): profile e2e passes, izhaaannn account has 12 sample books
- [x] `0005_book_covers.sql` run on dev (2026-10-01): cover upload e2e passes
- [ ] `git push origin main v0.1.0`, then create the GitHub release from the tag (notes in
      `CHANGELOG.md`)

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

Done on 2026-10-01: Phase 2 migration `0003_create_library.sql` (works, authors,
work_authors, editions, reads, progress_events, provider_cache) with pgTAP tests, hand-written
types and the new tables in the export (typecheck fails if a `user_id` table is missing).

Also done on 2026-10-01: metadata providers (`src/features/metadata/`, routes under
`/api/metadata/`), cached in `provider_cache`, lock-aware enrichment (`enrichEdition`).

Also done on 2026-10-01: private profile page `/app/profile` (hero, details form, photo
upload resized to WebP in the browser, private `avatars` bucket), sidebar shows the reader's
photo and name, migration 0004, and the dev sample library script. Checked in the browser
pane at desktop and phone width after 0004 was applied.

Also done on 2026-10-01: "Add book" (`/app/add`: search, ISBN or link, by hand, cover
photo; background enrichment) and a simple shelf grid on `/app` (cover or generated cover,
state badge, progress bar). TanStack Query is now installed (`QueryProvider` in the app
layout, not persisted yet). Shared bits: `src/components/{tag-input,form-field}.tsx`,
`src/lib/{images,text}.ts`.

Barcode scan deferred by the owner (moved to Phase 8 with a photo-scan idea using an opt-in
vision model). Tagged `v0.1.0` locally (see `CHANGELOG.md`).

Done on 2026-10-01: book detail page `/app/books/[id]` (shelf cards link to it). Edit work
and edition details in side sheets (edited fields locked, locked fields can be unlocked),
refresh an edition from the catalogues, add/remove editions, own cover photo per edition,
reads (state chips, dates, half-star rating, reflection, edition, reread after finish/DNF,
delete), progress in pages/percent/location/minutes/chapter with a calm history, delete a
book (covers removed from Storage, unused authors tidied). No migration. New rate limits
`book-edit` and `book-refresh`. Checked in the browser pane at desktop and phone width.
Fixed: reads created together (the dev seed) now order by latest activity, so the shelf and
book page agree on the current read.

Done on 2026-10-01: library views on `/app` (`src/features/library/`): search by title or
author (trigram-indexed `ilike`), state chips with counts, format filter and five sorts, all
in the URL (`?q&state&format&sort&pages`), "Show more" in pages of 60, and a kind "nothing
matches" state. No migration. Pure view logic and URL parsing are in `library/query.ts`.

Next: Phase 2 "Command palette (⌘K): add, log progress, find".

## Known context

- One Supabase project so far (`ugfyxuhuxyzxxeckqgcx`) acts as dev; a prod project comes
  with the Vercel deploy. Migrations are applied by the owner in the SQL Editor
  (`docs/MIGRATIONS.md`); `create_profiles` is applied to dev.
- Sign-in is Google only (`src/features/auth/config.ts`); magic link waits for custom SMTP.
- `@swc/core` is pinned to 1.16.2 in `pnpm-workspace.yaml` (1.16.12 fails an ACL check on
  this Windows machine). Retry newer versions occasionally.
- No Docker locally; pgTAP runs in CI (`.github/workflows/ci.yml`, `db` job).
