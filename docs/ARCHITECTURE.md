# Foldline: Architecture

## Overview

- Next.js App Router. `(marketing)` route group = public, server-rendered pages.
  `(app)` route group under `/app` = authenticated, client-heavy shell (works offline later).
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
      kosync/               KOReader sync protocol endpoints (Phase 4)
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

- `profiles` (id = auth.users.id): display_name, locale ('en'|'bn'), timezone,
  settings jsonb (rating_scale, hide_stats, …). Created by a trigger on signup.
- `works`: title, subtitle, original_title, original_language, description,
  series_name, series_position numeric, field_locks text[] default '{}'.
- `authors`: name, sort_name, provider_ids jsonb.
- `work_authors`: work_id, author_id, role ('author'|'translator'|'editor'|'illustrator'|'narrator'), position.
- `editions`: work_id, title/subtitle (nullable overrides of the work's, e.g. translations),
  format enum ('paperback','hardcover','ebook','audiobook','other'), isbn_10, isbn_13
  (normalised digits, unique per user), publisher, published_date text (free text),
  page_count int, duration_minutes int, language, cover_url (https only),
  cover_storage_path, provider_ids jsonb, field_locks text[].
- `reads` (one reading attempt; rereads = more rows): work_id, edition_id null,
  state enum ('planned','reading','resting','finished','dnf'), started_on, finished_on,
  stopped_on (dates ordered after started_on), rating smallint null (1-10, half stars on a
  5-star display), reflection text. State/date rules live in TypeScript.
- `progress_events`: read_id, occurred_at, unit enum ('pages','percent','location','minutes','chapter'),
  value numeric, fraction numeric check (0..1), source enum
  ('manual','koreader','kindle','import','audiobookshelf'), device text.
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

### Later phases

- Phase 2: `tags`, `work_tags`, `shelves` (kind 'manual'|'smart', query jsonb), `shelf_items`,
  `custom_statuses`, `copies` (ownership, location, loans), `people`, `imports`.
- Phase 4: `kosync_credentials` (username unique, key_hash), `kosync_documents`
  (document_hash, edition_id null, progress, percentage, device, device_id),
  `automation_rules` (trigger, conditions jsonb, action jsonb, enabled).
- Phase 5: `highlights` (read_id/work_id, kind 'highlight'|'note'|'bookmark', text, note,
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
- Field locks: a field a person edits by hand is added to `field_locks` (`lockFields`).
  Enrichment overwrites only unlocked fields with non-empty values; ISBNs are only filled
  while empty; edition title/subtitle are never set by providers.
  Many Bangla/local editions will have no provider data. Manual entry + cover photo is a
  first-class path, not an error state.

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
