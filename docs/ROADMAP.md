# Roadmap

Tick items as they are completed. One item per Claude Code session.

## Versioning and the road to v1.0.0

- While on `0.x`: each shipped roadmap item (or phase) is a **minor** release (`v0.9.0`, `v0.10.0`, ...);
  fixes only are a **patch** (`v0.9.1`). Releases are annotated tags plus a GitHub Release with the
  `CHANGELOG.md` notes.
- **v1.0.0** is cut when a reader can rely on Foldline as their one reading tracker and can always
  leave with their data. All of these must be done:
  1. Phase 3 complete (the reading rhythm view is the last item).
  2. Phase 4 complete, especially Goodreads + StoryGraph import and the full CSV / Markdown export
     (moving in and out is the promise behind "your data").
  3. Phase 5 complete (done in v0.9.0).
  4. The license is decided (Phase 9) and the data model has had no breaking change for one release.
- After v1.0.0: features are minor releases, fixes are patches, and a major bump means a breaking
  change to exported data, the API or tokens (Phase 6 onwards).
- Check this list at every release and say in the release notes how far v1.0.0 is.

## Phase 0: Foundation

- [x] Tooling: scripts (typecheck, lint, test, test:e2e, db:types), Prettier, Vitest, Playwright
- [x] shadcn/ui init + dark theme + motion, app shell layout, (marketing) and (app) route groups, next-intl (English only)
- [x] Supabase local setup (`supabase init`), `src/lib/supabase/{client,server,admin}.ts`
- [x] Auth: Google via `src/lib/auth.ts`, protected `/app`, profiles table + trigger
- [x] CI: GitHub Actions for typecheck, lint, test, build (+ e2e and pgTAP jobs)
- [x] Keep-alive and weekly backup workflows configured with repo secrets

## Phase 1: Launch readiness

- [x] Open sign-up now (owner decision): welcoming login copy; signups on in Supabase
- [x] Privacy policy + terms pages in plain language, linked from the footer and login page
- [x] Public landing page (hero with animated book illustration, features, how it works, FAQ, CTAs)
- [x] Motion system: press feedback, page transitions, scroll reveals, hover lifts, book touches
- [x] Signed-in test harness (dev-only login route + Playwright authenticated project)
- [x] Settings page: delete my account (removes all data) + download my data (JSON)
- [x] Rate limits on server actions and route handlers (per user and per IP)
- [x] SEO basics: metadata, Open Graph image, `sitemap.xml`, `robots.txt`, landing page copy
- [x] Deploy to Vercel with the prod Supabase project; Google consent screen "In production"

## Phase 2: Core library

- [x] Migration: works, authors, work_authors, editions, reads, progress_events, provider_cache (+ pgTAP RLS tests)
- [x] Metadata providers (Open Library, Google Books) + cache + field locks
- [x] Private profile page: Google name/photo prefilled, own photo upload (private Storage, WebP), email (read-only), member since, timezone, short bio, reading preferences (formats, genres); editable any time, never public
- [x] Add book: search, paste ISBN/URL, manual entry (no-ISBN books, cover photo upload)
- [x] Book detail page: editions, reads, progress logging in any unit
- [x] Library views: by state, sort, filter, trigram search
- [x] Command palette (⌘K): add, log progress, find

## Phase 3: Motivation & personal stats

- [x] Warm, animated finish moment + optional reflection prompt (finish and DNF)
- [x] Opt-in reading goals (books or pages per year, month or custom range), neutral progress, celebration on reaching a goal, easy to hide or remove
- [x] Personal stats dashboard (pages, time, formats, genres, pace), hideable
- [ ] Reading rhythm view (calendar density, no streak counter, no broken state)

## Phase 4: Management

- [ ] Tags + manual shelves + smart shelves (saved queries)
- [ ] Custom statuses, optional rating scales, custom fields
- [ ] Copies & loans (ownership, location, lent to / borrowed from)
- [ ] Bulk edit, duplicate/edition merge, undo
- [ ] Full export (CSV, Markdown per book) on top of the Phase 1 JSON export
- [ ] Import Goodreads + StoryGraph CSV

## Phase 5: PWA & offline

- [x] Serwist service worker, installable app, offline app shell
- [x] Offline progress-logging queue (IndexedDB) with background sync
- [x] Web Share Target (share a book link into the app)

## Phase 6: Automation

- [ ] KOReader sync server endpoints + document-hash → edition linking UI
- [ ] Kindle `My Clippings.txt` import (locale-aware, revision merging, hash dedupe)
- [ ] Rules engine (automation_rules + pg_cron nightly evaluator)
- [ ] Personal API tokens + webhooks

## Phase 7: Reflection

- [ ] Highlights & notes hub
- [ ] Pull-based resurfacing page (opt-in)
- [ ] Private year-end letter (Markdown export)

## Phase 8: Sharing & AI (opt-in, later)

- [ ] Opt-in share cards (finished book, year summary) as unlisted links the user can revoke
- [ ] AI features (opt-in, explain what data they use): e.g. smart summaries, recommendations from your own library
- [ ] Scan a book: photograph its information (copyright) page and let an opt-in, free vision model fill in title, authors, publisher, ISBN and year (many local editions have no barcode). Deferred from Phase 2 (owner, 2026-10-01)
- [ ] ISBN barcode scan (`barcode-detector` polyfill), alongside the photo scan

## Phase 9: Growth & operations

- [ ] Custom SMTP (e.g. Resend) + editable email templates, then email sign-up/login (`AUTH_METHODS.magicLink` in `src/features/auth/config.ts`)
- [ ] Bangla translation: `messages/bn.json`, locale switcher, Bangla-capable font stack
- [ ] Move Supabase to Pro when usage needs it; remove keep-alive
- [ ] Donation link
- [ ] Decide license (AGPL-3.0 vs MIT)
- [ ] Register foldline domain + GitHub org; trademark check
