# Roadmap

Tick items as they are completed. One item per Claude Code session.

## Phase 0: Foundation

- [x] Tooling: scripts (typecheck, lint, test, test:e2e, db:types), Prettier, Vitest, Playwright
- [ ] shadcn/ui init + dark theme + motion, app shell layout, (marketing) and (app) route groups, next-intl (English only)
- [ ] Supabase local setup (`supabase init`), `src/lib/supabase/{client,server,admin}.ts`
- [ ] Auth: magic link + Google via `src/lib/auth.ts`, protected `/app`, profiles table + trigger
- [ ] CI: GitHub Actions for typecheck, lint, test, build
- [ ] Keep-alive and weekly backup workflows configured with repo secrets
- [ ] (Deferred) Bangla translation: `messages/bn.json`, locale switcher, Bangla-capable font stack

## Phase 1: Core library

- [ ] Migration: works, authors, work_authors, editions, reads, progress_events, provider_cache (+ pgTAP RLS tests)
- [ ] Metadata providers (Open Library, Google Books) + cache + field locks
- [ ] Add book: search, paste ISBN/URL, manual entry (no-ISBN books, cover photo upload)
- [ ] ISBN barcode scan (`barcode-detector` polyfill)
- [ ] Book detail page: editions, reads, progress logging in any unit
- [ ] Library views: by state, sort, filter, trigram search
- [ ] Command palette (⌘K): add, log progress, find

## Phase 2: Management

- [ ] Tags + manual shelves + smart shelves (saved queries)
- [ ] Custom statuses, optional rating scales, custom fields
- [ ] Copies & loans (ownership, location, lent to / borrowed from)
- [ ] Bulk edit, duplicate/edition merge, undo
- [ ] Full export (JSON, CSV, Markdown per book)
- [ ] Import Goodreads + StoryGraph CSV

## Phase 3: PWA & offline

- [ ] Serwist service worker, installable app, offline app shell
- [ ] Offline progress-logging queue (IndexedDB) with background sync
- [ ] Web Share Target (share a book link into the app)

## Phase 4: Automation

- [ ] KOReader sync server endpoints + document-hash → edition linking UI
- [ ] Kindle `My Clippings.txt` import (locale-aware, revision merging, hash dedupe)
- [ ] Rules engine (automation_rules + pg_cron nightly evaluator)
- [ ] Personal API tokens + webhooks

## Phase 5: Reflection

- [ ] Highlights & notes hub
- [ ] Pull-based resurfacing page (opt-in)
- [ ] Reflection prompts on finish/DNF (opt-in)
- [ ] Reading rhythm view (no streak counter)
- [ ] Private year-end letter (Markdown export)

## Phase 6: Public launch

- [ ] Landing page, privacy policy, terms, donation link
- [ ] Rate limits on metadata/import endpoints
- [ ] Open signups; move Supabase to Pro; remove keep-alive
- [ ] Decide license (AGPL-3.0 vs MIT); publish repo
- [ ] Register foldline domain + GitHub org; trademark check before public launch
