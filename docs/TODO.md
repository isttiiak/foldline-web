# Next up (handoff between sessions)

Read this first in every new session, then `docs/ROADMAP.md`. Update it at the end of a
session: tick what is done, add what is next.

## Priority queue (owner, 2026-10-17)

This queue overrides the `docs/ROADMAP.md` order. How to work:

- Take the FIRST unchecked item only. Plan mode first: read the relevant code (and
  `docs/ARCHITECTURE.md` if it touches data), present the plan, wait for approval.
- If an item needs another feature that is not built yet or earlier in this queue, stop before
  planning and ask the owner with a short brief (what, why, cost, effort), "Confirm" / "Defer".
- Definition of done as in CLAUDE.md (verify, migration handoff if any, roadmap and TODO updated,
  release commit + annotated tag, push main and the tag). Migrations: name the file to run on dev
  and prod BEFORE pushing.
- At the end, tick the item here and name the next one.

1. [x] Domain `foldline.bustandeen.com` (done 2026-10-17, v1.1.0). `docs/SETUP.md` section 7 has the dashboard steps (owner
       does those, walked through one step at a time). Code side: check for a hard-coded URL, set
       up `NEXT_PUBLIC_SITE_URL` handling, PWA manifest/scope, an optional soft "a Bustandeen
       service" footer line (ask first). Bustandeen (code at `~/projects/ihsan`) must never run
       anything on or set cookies for Foldline.
2. [x] Bengali books, part 1 (done 2026-10-17, v1.2.0, migration 0012): richer add-by-hand form for books the catalogues lack. Capture as
       much as possible: title in Bangla script, romanised title, original title, subtitle,
       authors and translators, publisher, edition/printing, year (accept Bangla numerals), pages,
       ISBN (optional), language, cover photo. Check which fields exist on works/editions first; a
       migration only if needed.
3. [ ] Bengali books, part 2: Bengali-aware search, design from "Later" below (`romanize.ts`,
       `phonetic.ts`, `match.ts` in `src/features/search/`; library page and palette; romanised
       query variants for Open Library). Test with real titles (adarsha/adarsh/আদর্শ,
       productive/প্রোডাক্টিভ). (Shared Bengali catalogue + admin panel: DEFERRED to its own
       research session.)
4. [ ] Highlights & notes hub: `highlights` table (+ pgTAP RLS test), add by hand on the book page
       (quote, page/location, note, tags), `/app/highlights` with search and filters, in
       JSON/CSV/Markdown exports. (Kindle import: DEFERRED.)
5. [ ] Private year-end letter: warm summary of a year (books, pages, formats, reflections,
       favourite highlights), shown in the app and downloadable as Markdown. Private only.
6. [ ] ISBN barcode scan on `/app/add`: `BarcodeDetector` + free polyfill, camera permission asked
       only on tap, falls back to typing.
7. [ ] Scan the copyright page: photo → in-browser OCR (Tesseract.js, eng + ben models, loaded
       only when used) → parse ISBN, title, authors, publisher, year → prefill the form from item
       2 for the reader to correct. No paid vision API.
8. [ ] Photocards: shareable images, not public links. (a) Book card: cover, title, author,
       optional rating/finish date. (b) Quote card: a line from a highlight (item 4) with book and
       author. Several designed styles each (warm gradients, no violet), Bangla font (Noto Sans
       Bengali or Hind Siliguri) so Bengali text renders. Download PNG + Web Share API. Nothing
       leaves the device unless the reader shares.
9. [ ] Rules engine: user-made rules (e.g. "when I finish a book tagged X, put it on shelf Y"),
       `automation_rules` table + pg_cron nightly evaluator (Supabase free), logic in TypeScript
       where possible. No notifications.

## Owner (needs your accounts or keys)

- [x] GitHub secrets set to the **prod** project (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
      `SUPABASE_DB_URL` as the Session pooler URI, `BACKUP_PASSPHRASE`); **supabase-keepalive** and
      **supabase-backup** both ran green by hand on 2026-10-03 and the backup produced a
      `db-backup-…` artifact. Keep the passphrase in the password manager: backups need it.
- [x] Vercel deploy live at https://myfoldline.vercel.app (prod Supabase project); Google
      Branding filled, consent screen In production; a fresh Google account signed in
      successfully (2026-10-03). Re-check the Google consent screen only if sign-in ever breaks.
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
- [x] Moved to `foldline.bustandeen.com` (2026-10-17): Vercel domain, Porkbun CNAME, 308 from
      `myfoldline.vercel.app`, `NEXT_PUBLIC_SITE_URL`, Supabase URLs, Google branding; Google sign-in
      checked from a private window. Left: remove the old `myfoldline.vercel.app/**` Supabase redirect entry
- [ ] Optional: create GitHub Releases for older tags (notes are in `CHANGELOG.md`); `v0.1.0` and
      `v0.9.0` have one
- [x] Claude settings: GitHub and routine git commands allowed in `.claude/settings.json` (2026-10-15)
- [x] `0008`, `0009`, `0010` applied to dev and prod by the owner (2026-10-15); full e2e green
- [x] `0011_undo_entries.sql` applied to dev and prod by the owner (2026-10-17); full e2e green

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

Done on 2026-10-01: command palette (`src/features/palette/`), opened with ⌘K / Ctrl+K or the
Search button in the sidebar and the mobile header. Find a book, add one, go to a page, or log
progress (reuses `LogProgress`). Books load once per opening (`getPaletteBooks`, new
`palette-books` rate limit) and matching runs in the browser. Adds the `cmdk` dependency. No
migration. Phase 2 is complete.

Done on 2026-10-03: finish moment (`reads/components/finish-moment.tsx`). Moving the current read
to Finished (or using "Mark finished") opens a warm dialog with a short one-shot animation, an
optional rating and an optional note; moving it to Didn't finish opens a quiet, shame-free one with
an optional note. Both are skippable and save only on request. No migration.

Personal: `supabase/personal/` is gitignored (public repo). `notion_import.sql` there is the owner's
one-off Notion import (run by hand on prod).

Done on 2026-10-03 (v0.6.0): search-typing fix, state chip off the cover, calm designed SVG covers with
random assignment and a picker (add form and edition sheet), "Where I got it", ISBN carry-over to the
by-hand form, new favicon. Migration `0006` (owner runs it on dev and prod before deploying).

Done on 2026-10-03 (v0.7.0): personal stats dashboard `/app/stats` (hideable, nothing calculated while
hidden). No migration.

Done on 2026-10-14: opt-in reading goals (`/app/goals`, `src/features/goals/`): books or pages over a year,
a month or picked dates, several at once, plain progress, a one-time "goal reached" moment, fold away or
remove. Small card on the library page for current goals. Migration `0007_reading_goals.sql` applied to
dev and prod (2026-10-15, full e2e green). Released as v0.8.0.
The spark burst moved to `src/components/motion/sparks.tsx` (shared by both moments).

Done on 2026-10-15 (v0.9.0): Phase 5 "PWA & offline". Serwist service worker (`src/worker/sw.ts`, served
at `/serwist/sw.js`, production only), manifest + icons, `/offline` fallback, offline progress queue in
IndexedDB with Background Sync and `POST /api/progress` (idempotent by `entryId`), "Use Foldline as an app"
card in Settings, Web Share Target into `/app/add`. Sign out and `/goodbye` clear the device's caches and
queue. No migration. Versioning policy and the v1.0.0 checklist are now at the top of `docs/ROADMAP.md`.
To try the service worker locally: `pnpm build`, then the `foldline-prod` launch config (`pnpm start`).

Also 2026-10-15 (v0.9.1): iPhone SE (375 x 667) pass; `tests/e2e/responsive.authed.spec.ts` guards every app
page against sideways overflow and sub-16px fields (set `RESPONSIVE_SHOTS=<dir>` to save screenshots).

Done on 2026-10-15: Phase 3 "Reading rhythm view" (`src/features/rhythm/`, a calendar card on
`/app/stats`, `?year=`; counts progress entries and read start/finish/stop days in the reader's time
zone; no streaks). Phase 3 is complete.

Done on 2026-10-15 (v0.10.0): the first three Phase 4 items.

- Tags and shelves (`src/features/shelves/`): book page "Tags and shelves" section, `/app/shelves`
  page (shelves, tags, open loans), library filters `?tag&shelf&status`, "Save as a smart shelf" in
  the toolbar. Shelves nav item.
- Custom statuses, rating scale, custom fields (`src/features/custom/`): three Settings cards,
  status chips in the read editor, "Your fields" on the book page. `RatingScaleProvider` in the app
  layout; `RatingStars`/`StarsDisplay` follow the scale (and hide when off).
- Copies and loans (`src/features/copies/`): "Copies" section on the book page, "On loan" card.
- New rate limit policy `library-edit`. All new tables are in the JSON export.

Done on 2026-10-17 (v0.11.0): Phase 4 "Bulk edit, duplicate/edition merge, undo".

- "Select books" on the library (`src/features/bulk/`): move to a state, add/remove a tag (new names make
  tags), put on/take off a shelf, delete (asked first, not undoable). Rate limit `bulk-edit`.
- Merge (`src/features/merge/`): "Possibly on your shelf twice" card on `/app/shelves`, "Merge with another
  book" on the book page, "Merge into…" on each edition card.
- Undo (`src/features/undo/`): one calm toast; snapshots live a day in `undo_entries` (migration
  `0011_undo_entries.sql`, owner applies on dev and prod before the push).

Done on 2026-10-17 (v0.12.0): Phase 4 "Full export". Settings "Your data" offers JSON (everything), a
library CSV and a zip of Markdown notes (`src/features/export/{books,csv,markdown}.ts`, route
`/app/settings/export?format=`). The JSON export now pages past the API's 1000-row cap. Adds `fflate`.
No migration.

Done on 2026-10-17 (v0.13.0): Phase 4 "Import Goodreads + StoryGraph CSV" (`src/features/importers/`,
`/app/import`): read in the browser, preview with repeats left out, batches of 50, one "Undo import". Rate
limit `import-books`. No migration (undo uses 0011). Phase 4 is complete.

Done on 2026-10-17 (v1.0.0): license decided by the owner, GNU AGPL-3.0-or-later (`LICENSE`, `package.json`
`license`, README section, "Source code" link in the public footer and at the bottom of Settings via
`SOURCE_URL` in `src/lib/site.ts`). Data model unchanged since v0.11.0. v1.0.0 released.

Done on 2026-10-17: roadmap reordered by the owner. Build order is now Phase 7 (Reflection), Phase 8
(Sharing & AI), Phase 6 (Automation), Phase 9. Zero cost rule (CLAUDE.md hard rule 12). Kindle import moved
into Phase 7, KOReader sync deferred, AI on-device only (no Groq). Phase 8 gains the copyright-page OCR and an
opt-in shared catalogue for Bengali books the providers lack. Phase 9 plans the move to
`foldline.bustandeen.com` (steps in `docs/SETUP.md` section 7), which then makes free email sign-in possible.

Done on 2026-10-17 (v1.1.0): queue item 1, code side. The app was already address-agnostic (`siteUrl()`
reads `NEXT_PUBLIC_SITE_URL`, auth redirects use the request origin, manifest paths are relative, cookies
host-only). Added "A Bustandeen service" footer line (`BUSTANDEEN_URL` in `src/lib/site.ts`), a privacy
sentence, and the smoke test in `docs/SETUP.md` section 7. The owner did the dashboard steps the same day;
the smoke test passed (the in-app browser pane trips on Google's own `SetSID` step, so test sign-in in a
real private window). The live site uses Supabase project `ugfyxuhuxyzxxeckqgcx`.

Done on 2026-10-17 (v1.2.0): queue item 2, Bengali books part 1. The by-hand form on `/app/add` now takes a
romanised title, several translators (TagInput), the original title and language (shown once a translator is
added, or via "It's a translation"), edition/printing, and Bengali digits in pages, minutes, year and ISBN
(stored as 0-9). Migration `0012_bengali_book_details.sql` adds `works.title_romanized` and
`editions.edition_statement`; the work and edition sheets edit them, the hero shows the romanised title,
merge fills them, and the CSV/Markdown exports include them. Applied to dev and prod by the owner (2026-10-17).

Next: queue item 3, Bengali books part 2 (Bengali-aware search). Also search `title_romanized` there.

Next: the first unchecked item in "Priority queue" at the top of this file. After 1.0, a breaking change
to exported data, the API or tokens needs a major version.

Later (owner deferred, needs more effort): **Bengali-aware search**. Design agreed 2026-10-03:
`src/features/search/` with `romanize.ts` (Bangla script to Latin), `phonetic.ts` (coarse key: vowel length,
aspirates, b/v, s/sh, ch), `match.ts` (token-wise fuzzy match and ranking), used in memory by the library
page and the palette (also search `original_title` and `subtitle`; drop the DB `ilike`), plus romanised query
variants for the Open Library search (it holds Bengali books in Latin spelling, e.g. "Adarsha Hindu Hotel";
the Bangla-script title finds nothing). Limits: no Latin to Bangla suggestions without ML (opt-in AI, Phase 8).
Tests with real titles from the owner's list (adarsha/adarsh/আদর্শ, productive/প্রোডাক্টিভ). No migration.

## Known context

- One Supabase project so far (`ugfyxuhuxyzxxeckqgcx`) acts as dev; a prod project comes
  with the Vercel deploy. Migrations are applied by the owner in the SQL Editor
  (`docs/MIGRATIONS.md`); `create_profiles` is applied to dev.
- Sign-in is Google only (`src/features/auth/config.ts`); magic link waits for custom SMTP.
- `@swc/core` is pinned to 1.16.2 in `pnpm-workspace.yaml` (1.16.12 fails an ACL check on
  this Windows machine). Retry newer versions occasionally.
- No Docker locally; pgTAP runs in CI (`.github/workflows/ci.yml`, `db` job).
