# Foldline: Architecture

## Overview

- Next.js App Router. `(marketing)` route group = public, server-rendered pages.
  `(app)` route group under `/app` = authenticated, client-heavy shell (works offline: see "PWA and offline").
- Supabase Postgres is the source of truth. Client reads/writes go through `supabase-js`
  protected by RLS. Privileged work (enrichment, imports, KOReader sync) runs in route
  handlers / server actions with the secret key.
- Hosting: Supabase Free tier (region: Singapore, closest to Bangladesh) + Vercel
  (or Cloudflare) for Next.js.

## Folder structure

```
src/
  app/
    (marketing)/            landing, about, privacy
    (app)/app/              library, book/[id], shelves, highlights, settings, import
    api/
      kosync/               KOReader sync protocol endpoints (Phase 6)
      metadata/             search + enrich proxy
  features/
    library/ books/ reads/ progress/ shelves/ tags/ highlights/
    metadata/providers/{openlibrary,googlebooks,hardcover}.ts
    importers/{goodreads,storygraph,kindle-clippings}.ts
    automation/ kosync/ export/
  components/ui/            shadcn components
  lib/
    supabase/{client.ts,server.ts,admin.ts,database.types.ts}
    auth.ts  i18n.ts  utils.ts
messages/{en.json,bn.json}
supabase/{config.toml,migrations/,seed.sql,tests/}
tests/e2e/
```

## Data model

The catalog is PER USER in v1 (each user owns their works/editions). Only `provider_cache`
is shared, and only the server can access it. Reason: privacy, simple RLS, no edit
conflicts between users. A shared catalog can be introduced later if needed.

Common columns: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`,
`updated_at timestamptz` (trigger). User-owned tables also have
`user_id uuid not null default auth.uid() references auth.users on delete cascade`.

### Core tables

- `profiles` (id = auth.users.id): display_name (1-80), locale ('en'|'bn'), timezone,
  avatar_url (provider photo, https), avatar_path (own photo in the private `avatars`
  Storage bucket at `<user id>/<file>`, shown via 1-hour signed URLs), bio (<= 600),
  preferred_formats edition_format[], favourite_genres text[] (<= 12), settings jsonb
  (rating_scale, hide_stats, …). Created by a trigger on signup (name and Google photo).
  Private: there are no public profiles. Account deletion removes the user's Storage files
  first (they do not cascade).
- `works`: title (any script), title_romanized (Latin spelling, 0012), subtitle, original_title,
  original_language, description,
  series_name, series_position numeric, field_locks text[] default '{}'.
- `authors`: name, sort_name, provider_ids jsonb.
- `work_authors`: work_id, author_id, role ('author'|'translator'|'editor'|'illustrator'|'narrator'), position.
- `editions`: work_id, title/subtitle (nullable overrides of the work's, e.g. translations),
  format enum ('paperback','hardcover','ebook','audiobook','other'), isbn_10, isbn_13
  (normalised digits, unique per user), publisher, edition_statement (edition or printing as
  printed, 0012), published_date text (free text, Bengali digits stored as 0-9),
  page_count int, duration_minutes int, language, cover_url (https only),
  cover_storage_path, provider_ids jsonb, field_locks text[].
- `reads` (one reading attempt; rereads = more rows): work_id, edition_id null,
  state enum ('planned','reading','resting','finished','dnf'), started_on, finished_on,
  stopped_on (dates ordered after started_on), rating smallint null (1-10, half stars on a
  5-star display), reflection text. State/date rules live in TypeScript.
- `progress_events`: read_id, occurred_at, unit enum ('pages','percent','location','minutes','chapter'),
  value numeric, fraction numeric check (0..1), source enum
  ('manual','koreader','kindle','import','audiobookshelf'), device text.
- `reading_goals` (opt-in, migration 0007): metric enum ('books','pages'), period enum
  ('year','month','custom', how the range was picked), starts_on, ends_on (both always stored,
  at most ~3 years apart), target int (books <= 10 000, pages <= 10 000 000), label (<= 80),
  hidden boolean, celebrated_at (the "goal reached" moment plays once).
- `rate_limits` (global, server-only like `provider_cache`): bucket (`policy:kind:subject`,
  where IPs and emails are HMAC-hashed), window_start, hits. `rate_limit_hit(bucket, limit,
window_seconds)` counts atomically and cleans up; only `service_role` may call it. Policies
  live in `src/features/rate-limit/policies.ts`; the helper fails open.
- `provider_cache` (global): provider ('openlibrary'|'googlebooks'|'hardcover'), cache_key,
  payload jsonb, fetched_at, expires_at; primary key (provider, cache_key). RLS enabled with
  NO policies and no anon/authenticated grants (server-only access).

Same-owner references: every parent has `unique (id, user_id)` and children point at it with
a composite foreign key (`(work_id, user_id) -> works (id, user_id)`), so no row can reference
another user's row, whoever writes it. A read's edition must belong to its work
(`(edition_id, work_id, user_id) -> editions`); deleting the edition clears it from the read.
Library tables grant only select/insert/update/delete to `authenticated`, nothing to `anon`.

### Organising (Phase 4, migrations 0008-0010)

- `tags` (name unique per reader ignoring case, tone: one of the warm colours) and `work_tags`
  (work_id, tag_id). `shelves`: kind 'manual' (books placed by hand in `shelf_items`) or 'smart'
  (`query` jsonb: a saved library view `{q, state, format, tag, status, sort}`, validated by
  `smartQuerySchema` and opened as `/app?...`; a trigger refuses items on a smart shelf).
- `custom_statuses` (name, base_state): the reader's own names inside a built-in state.
  `reads.custom_status_id` (cleared when the read changes state or the status is removed).
- `custom_fields` (name, kind text|number|date|boolean|choice, options) with the values in
  `works.custom_values` jsonb `{ "<field id>": value }`, cleaned against the fields on save
  (`cleanCustomValues`).
- Rating scale: `profiles.settings.rating_scale` ('half-stars' default, 'stars', 'ten', 'off').
  Ratings always stay 1-10 in `reads.rating`; the scale only changes how they are shown and picked.
- `copies` (work_id, edition_id null, ownership owned|borrowed|library|subscription, location,
  acquired_on, note) and `loans` (copy_id, direction lent|borrowed from the copy's ownership,
  person free text, started_on, due_on, returned_on; one open loan per copy).
- The library, book page and stats read these tables in separate queries that fail soft, so the
  app still loads (without these features) on a project where the migrations are not yet applied.

### Bulk edit, merge and undo (migration 0011)

- `undo_entries` (kind 'bulk'|'merge-works'|'merge-editions'|'import', label, payload jsonb, expires_at
  = a day later): a snapshot of a library-wide change. `recordUndo` (`src/features/undo/server/undo.ts`)
  saves it and sweeps expired entries (and the cover files only they still held), so no cron job is
  needed. `replayUndo` claims the entry (delete first, so a double click cannot replay twice), checks the
  payload with Zod (`undo/schemas.ts`) and puts the rows back, using upserts so a half-done change can be
  rolled back the same way. `UndoProvider` (in the app shell) shows one calm toast with "Undo".
- Bulk edit (`src/features/bulk/`): "Select books" on the library turns the grid into toggles and opens a
  sticky bar: move to a state (the current read, dates by `datesForState`; a book with no read gets one),
  add or remove a tag (a new name makes a tag), put on or take off a manual shelf, delete (asked first,
  not undoable; `deleteWorks` in `books/server/delete.ts` also removes cover files and unused authors).
  Up to 200 books per change, rate limit `bulk-edit`.
- Merge (`src/features/merge/`): `findDuplicates` (pure) groups books by a shared ISBN or the same title
  key (case, accents, punctuation, articles and a subtitle ignored) and first author; the Shelves page
  lists them. The book page has "Merge with another book"; each edition card has "Merge into…".
  `mergeWorksAction` moves the dropped book's editions (their reads and copies follow by `on update
cascade`), its edition-less reads and copies, credits, tags and shelves to the kept book, fills the kept
  book's empty unlocked fields (`fillGaps`) and custom values, then deletes the dropped book.
  `mergeEditionsAction` repoints reads and copies, deletes the dropped edition, then fills gaps (so an ISBN
  can move). Each writes its undo snapshot first and rolls back from it if a write fails.

### Later phases

- Later: `people`, `imports`.
- Phase 6: `kosync_credentials` (username unique, key_hash), `kosync_documents`
  (document_hash, edition_id null, progress, percentage, device, device_id),
  `automation_rules` (trigger, conditions jsonb, action jsonb, enabled).
- Phase 6/7: `highlights` (read_id/work_id, kind 'highlight'|'note'|'bookmark', text, note,
  location, chapter, source, source_hash; unique(user_id, source_hash)).

### Indexes

`user_id` on every user table; unique `editions(user_id, isbn_13)` where not null; `pg_trgm` GIN index on
`works.title` and `authors.name`; `progress_events(read_id, occurred_at desc)` and `(user_id, occurred_at desc)`.

### RLS pattern

```sql
alter table public.works enable row level security;
create policy "works_select_own" on public.works
  for select using (user_id = (select auth.uid()));
create policy "works_insert_own" on public.works
  for insert with check (user_id = (select auth.uid()));
create policy "works_update_own" on public.works
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "works_delete_own" on public.works
  for delete using (user_id = (select auth.uid()));
```

## Metadata enrichment

Order: Open Library → Google Books → Hardcover (optional token). Flow: normalise ISBN or
query → check `provider_cache` → call provider (rate-limited) → store → merge into the
edition respecting `field_locks`. Enrichment never blocks saving a book; it can run after.

Code lives in `src/features/metadata/`: pure mappers per provider (`providers/`), ISBN helpers,
`merge.ts` (candidate merge and lock-aware patches) and `server/` (fetch, cache, lookup,
enrich). Routes: `GET /api/metadata/search?q=` and `GET /api/metadata/isbn/<isbn>`, signed-in
only, per-user limit `metadata-lookup`.

- ISBN lookup asks both providers (each answer cached); Open Library leads and Google Books
  fills gaps (often the description). Search uses Open Library, then Google Books.
- Outgoing budgets are global counters in `rate_limits` (`openlibrary` 3/s, `googlebooks`
  10/s). Over budget or down means "try the other provider", never a long wait.
- Open Library is called only with `OPEN_LIBRARY_CONTACT_EMAIL` set (sent in the User-Agent
  `Foldline/<version> (<email>)`); otherwise it is skipped. `GOOGLE_BOOKS_API_KEY` is optional.
- Cache TTLs: found by ISBN 30 days, not found 1 day, searches 1 day. Keys are normalised
  (`isbn:<13 digits>`, `search:<query>`) and never include a user. Expired rows are swept on
  about 1% of writes.
- Adding a book (`src/features/books/`, `/app/add`): one "Find your book" box takes a
  title/author search, an ISBN (any spelling) or a link containing an ISBN; or the reader
  adds the book by hand. `addBookAction` writes work → authors (reused by exact name) →
  work_authors → edition → first read, undoing its own rows if a later step fails (no
  transactions over the Data API). An ISBN-13 already on the shelf is reported, not
  duplicated. With an ISBN, `enrichEdition` runs in `after()` to fill gaps.
- Own cover photos are resized in the browser (max 600 px, WebP) and stored in the private
  `covers` bucket (`<user id>/<edition id>-<ts>.webp`, migration 0005), shown via signed URLs.
- Field locks: a field a person edits by hand is added to `field_locks` (`lockFields`).
  When adding, every field typed by hand (or changed from the catalogue's value) is locked.
  Enrichment overwrites only unlocked fields with non-empty values; ISBNs are only filled
  while empty; edition title/subtitle are never set by providers.
  Many Bangla/local editions will have no provider data. Manual entry + cover photo is a
  first-class path, not an error state. The by-hand form also takes a romanised title, several
  translators, the original title and language, and edition/printing; counts, years and ISBNs
  accept Bengali digits (`toAsciiDigits` / `parseCount` in `src/lib/text.ts`).
- Book page (`/app/books/[id]`, work id): `getBook` (`src/features/books/server/queries.ts`)
  loads the work, credits, editions (signed cover URLs) and reads with their latest 200
  progress entries in one request. The current read is the newest (`newestReadFirst` in
  `src/features/reads/order.ts`: created last, ties broken by the latest date). Edits go
  through server actions in `books/server/detail-actions.ts`, `reads/server/actions.ts` and
  `progress/server/actions.ts` (Zod input, typed results, `book-edit` / `book-refresh` rate
  limits, `revalidatePath("/app", "layout")`). Edit forms use column names as keys, so
  `changedFields` maps edits straight to locks; `nextLocks` adds edited fields and removes
  the ones the reader unlocked. Read state/date rules: `reads/transitions.ts`.
- Library page (`/app`): the view is in the URL (`q`, `state`, `format`, `sort`, `pages`),
  parsed by `parseLibraryParams` (`src/features/library/query.ts`, bad values fall back to
  defaults). `getLibrary` (`library/server/queries.ts`) resolves search to work ids with
  trigram-indexed `ilike` on `works.title` and `authors.name`, loads up to 1000 works with
  their latest read, then filters and sorts in TypeScript (state lives on the latest read) and
  signs covers for the visible page only (60 per page). State counts reflect search and format.
- Command palette (⌘K / Ctrl+K, `src/features/palette/`): mounted in `AppShell`, built on `cmdk`
  inside a base-ui Dialog. `getPaletteBooks` (`library/server/palette.ts`, rate limit
  `palette-books`) loads a light book list once per opening into TanStack Query
  (`QueryProvider` now wraps the shell); `match.ts` filters in the browser (case and accent
  insensitive, title and authors), so typing sends nothing. "Log progress" rows reuse `LogProgress`.
- Finish moment (`reads/components/finish-moment.tsx`): `ReadEditor` opens it after the reader
  moves the current read to `finished` or `dnf` (given `bookTitle`; past reads and dates edits never
  do). A base-ui Dialog: warm for a finish (one-shot sparks, skipped under reduced motion, optional
  rating and note), quiet for a stop (note only). Saves through `updateReadAction` only when
  something changed; "Not now" writes nothing.
- Covers (`src/features/covers/`): ten calm SVG designs (`cover-art.tsx`, ids in `designs.ts`) for books
  without a photo or catalogue cover. `editions.cover_design` stores the id (random at add time; a
  title hash is the fallback for older rows). Priority: own photo > a design the reader chose on purpose
  (marked by the `cover_design` entry in `field_locks`, so catalogues never undo it) > catalogue cover >
  stored/default design. `setCoverDesignAction` sets or releases the choice. `editions.bought_from` is
  free text ("where I got it"); a plain web link renders as a link (`books/bought-from.ts`).
- Favicon and home-screen icon are generated from the fold mark (`app/icon.tsx`, `app/apple-icon.tsx`,
  `lib/mark-image.tsx`).
- Stats (`/app/stats`, `src/features/stats/`): `getStats` reads the reader's books once (like the library, up
  to 1000) and `computeStats` (pure) turns each book's current read and edition into counts, finished books
  per year and per month (dates are plain strings, no time-zone drift), pages, listening time, formats,
  languages, median days to finish (shown from 3 dated reads), rating average and top authors. Descriptive
  only. Hiding is `profiles.settings.hide_stats` (`setStatsHiddenAction`): the page then calculates nothing and
  the sidebar link and palette entry disappear (`showStats`). Genres wait for tags (Phase 4).
- Goals (`/app/goals`, `src/features/goals/`): nothing exists until the reader sets one; several may run at
  once. `getGoals(timeZone)` loads the goals and, only if there are any, every read (with its edition's
  page count) and progress entry up to the latest goal end (paged past PostgREST's 1000-row cap). Pure
  `compute.ts`: a books goal counts finished reads with `finished_on` in range (rereads count again); a pages
  goal counts pages logged in range: each entry becomes a page position (`pages` value, else
  `fraction * page_count`), dated by the reader's time zone, only forward movement past the furthest point
  counts, and a finish adds the rest of the book on `finished_on`. Progress is shown plainly ("18 of 24
  books"), never as pace or "behind". A reached, visible goal opens `GoalMoment` once (on the goals page or
  the library card) and closing it sets `celebrated_at`; editing a goal clears it. Hidden goals stay on the
  goals page under "Folded away" and leave the library card (`GoalsCard`, current visible goals only).
- Progress: `fraction` = pages / `page_count`, minutes / `duration_minutes`, percent / 100,
  or location/chapter / a total typed in the log form (not stored; the next form prefills
  it from value / fraction of the last entry). Unknown totals keep `fraction` null. Logging
  a planned or resting read moves it to reading. Deleting a book removes its cover files
  and any author rows no longer credited on another book.

## Export

- `GET /app/settings/export?format=json|csv|markdown` (JSON is the default, rate limit `export-data`).
  `collectUserData` reads every table in `EXPORTED_TABLES` with the reader's own client, in pages of 1000
  (the API's row cap) ordered by primary key.
- JSON (`build-export.ts`): every row, one key per table, `format: "foldline-export"`, `version: 1`.
- `buildBooks` (`export/books.ts`, pure) turns the rows into one flat book each: current read (by
  `newestReadFirst`) and its edition, every read with its progress count, tags, manual shelves, copies and
  the reader's fields in their order.
- CSV (`csv.ts`): a row per book, a column per detail and one `Field: <name>` column per own field; UTF-8
  with a BOM and CRLF; text starting with `= + - @` or a tab gets a leading apostrophe (no formulas).
- Markdown (`markdown.ts`): one note per book with YAML front matter (JSON-quoted values), reads with
  reflections, description, fields and copies, zipped by `fflate` with an `index.md`. File names are slugs
  that keep Bangla letters; repeats get `-2`, `-3`. Wording comes from `Export.markdown` in the messages.

## Import (Goodreads, StoryGraph)

- `/app/import` (linked from Settings and the empty library). The CSV (at most 5 MB, 5 000 rows) is read in
  the browser: `parseCsv` (RFC 4180), `detectSource` by columns, then `mapGoodreads` / `mapStoryGraph`
  (`src/features/importers/`) turn rows into `ImportBook`s checked by `importBookSchema`. Rows that do not
  fit are counted, not sent. `getImportKeysAction` returns the shelf's ISBN-13s and `bookKey`s (title key +
  first author, shared with the duplicate finder) so the preview can leave out repeats.
- Mapping: Goodreads exclusive shelves `read`/`currently-reading`/`to-read` (and custom ones named like
  dnf or paused) become states, other shelves tags; `="..."` ISBNs unwrapped; "Title: Sub (Series, #2)"
  split; 1-5 stars to 2-10; review plus private notes become the reflection; Read Count adds undated
  earlier finishes; Owned Copies makes an owned copy; Date Added becomes `works.created_at`. StoryGraph
  statuses map one to one (paused to resting); quarter stars round to half; each "Dates Read" range is a
  read; translators come from Contributors; moods become tags only when the reader asks.
- `importBooksAction` takes batches of 50 (rate limit `import-books`), drops books whose ISBN-13 is already
  on the shelf, and `insertBatch` writes works, credits, editions, reads (oldest first, a second apart so
  the newest is current), tags and copies in one insert each with ids made on the server, removing the
  batch again if a step fails. Fields from the file are locked like typed ones. All batches of one import
  share one `import` undo entry ("Undo import"). Up to 10 editions with an ISBN per batch are enriched in
  `after()`; the rest keep designed covers until refreshed.

## PWA and offline

- Serwist with Turbopack (`@serwist/turbopack`): the worker source is `src/worker/sw.ts` (own
  `tsconfig.json` with the `webworker` lib, checked by `pnpm typecheck`), bundled by esbuild in the
  route `src/app/serwist/[path]/route.ts` and served at `/serwist/sw.js` with scope `/`. Registered by
  `ServiceWorker` in the root layout, production only (dev requests always reach the dev server).
- Caching: Next's static chunks and `/offline` are precached (revision = commit SHA). Pages are
  `NetworkFirst` from Serwist's `defaultCache`, so recently opened pages work offline; anything else
  falls back to `/offline`. Never cached: `/auth/*`, `/api/*`, `/serwist/*`, the data export, and
  Supabase auth/REST calls (signed Storage links may be).
- Privacy on shared devices: sign out first sends any queued progress, then `clearDeviceData()`
  empties the queue and every runtime cache (the precache holds only app code). `/goodbye` does the
  same after an account is deleted.
- Offline progress: `LogProgress` sends a browser-made `entryId` (uuid). With no connection (or a
  request that never gets an answer) the entry goes to IndexedDB (`src/features/offline/queue.ts`,
  db `foldline-offline`) instead. `OfflineStatus` (app shell) sends the queue on open, on `online`
  and when the tab becomes visible; the worker also sends it on the Background Sync tag
  `foldline-progress` (Chromium). Both use `flushProgressQueue`, guarded by a Web Lock, which posts
  batches of up to 50 to `POST /api/progress`. The server stores each entry with its `entryId` as
  the row id, so a duplicate (`23505`) counts as already stored. Server trouble is retried later; a
  read that is gone or a number that no longer fits is dropped and reported once, calmly.
- Installable: `src/app/manifest.ts` (copy in `Pwa.manifest`), icons from
  `src/app/icons/[name]/route.tsx` (192, 512, maskable 512). Settings has "Use Foldline as an app"
  (the browser's own prompt where offered, Add to Home Screen steps on iOS). No install nagging.
- Web Share Target: the manifest's `share_target` sends `GET /app/add?title&text&url`.
  `sharedFindText` (`src/features/pwa/shared.ts`) picks a link or ISBN that names the book, else
  the shared words as a search, and the Add book page starts with it in the find box.

## Environment variables (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
OPEN_LIBRARY_CONTACT_EMAIL=
GOOGLE_BOOKS_API_KEY=
HARDCOVER_API_TOKEN=
```

Check current Supabase docs for key naming (publishable/secret keys vs legacy anon/service_role).

## Free-tier operations

- Keep-alive: `.github/workflows/keepalive.yml` pings the project every 3 days (free
  projects pause after 7 days idle). Remove when moving to Pro.
- Backups: `.github/workflows/backup.yml` weekly `pg_dump` (free tier has no daily backups).
- Storage: store cover URLs, not images. Only user-taken cover photos go to Storage,
  compressed to WebP (~50 KB).
