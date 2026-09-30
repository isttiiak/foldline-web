# Foldline — Architecture

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

### Phase 1 tables
- `profiles` (id = auth.users.id): display_name, locale ('en'|'bn'), timezone,
  settings jsonb (rating_scale, hide_stats, …). Created by a trigger on signup.
- `works`: title, subtitle, original_title, original_language, description,
  series_name, series_position numeric, field_locks text[] default '{}'.
- `authors`: name, sort_name, provider_ids jsonb.
- `work_authors`: work_id, author_id, role ('author'|'translator'|'editor'|'illustrator'|'narrator'), position.
- `editions`: work_id, format enum ('paperback','hardcover','ebook','audiobook','other'),
  isbn_10, isbn_13, publisher, published_date text, page_count int, duration_minutes int,
  language, cover_url, cover_storage_path, provider_ids jsonb, field_locks text[].
- `reads` (one reading attempt; rereads = more rows): work_id, edition_id null,
  state enum ('planned','reading','resting','finished','dnf'), started_on, finished_on,
  stopped_on, rating smallint null, reflection text.
- `progress_events`: read_id, occurred_at, unit enum ('pages','percent','location','minutes','chapter'),
  value numeric, fraction numeric check (0..1), source enum
  ('manual','koreader','kindle','import','audiobookshelf'), device text.
- `provider_cache` (global): provider, cache_key, payload jsonb, fetched_at, expires_at;
  unique(provider, cache_key). RLS enabled with NO policies (server-only access).

### Later phases
- Phase 2: `tags`, `work_tags`, `shelves` (kind 'manual'|'smart', query jsonb), `shelf_items`,
  `custom_statuses`, `copies` (ownership, location, loans), `people`, `imports`.
- Phase 4: `kosync_credentials` (username unique, key_hash), `kosync_documents`
  (document_hash, edition_id null, progress, percentage, device, device_id),
  `automation_rules` (trigger, conditions jsonb, action jsonb, enabled).
- Phase 5: `highlights` (read_id/work_id, kind 'highlight'|'note'|'bookmark', text, note,
  location, chapter, source, source_hash; unique(user_id, source_hash)).

### Indexes
`user_id` on every user table; `editions(user_id, isbn_13)`; `pg_trgm` GIN index on
`works.title` and `authors.name`; `progress_events(read_id, occurred_at desc)`.

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
Many Bangla/local editions will have no provider data — manual entry + cover photo is a
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
