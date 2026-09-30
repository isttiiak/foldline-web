# Foldline — Claude Code context

Foldline is a calm, private, open-source reading tracker. It is NOT a social network and must never
become one. Users track books across paper, ebook and audiobook with as much automation
and as little friction as possible.

Audience right now: the owner (Istiak) and a few invited friends. Later: open signups.
Product name: **Foldline** (named after the crease of a folded page corner — marking your place
quietly). Tagline: "Foldline — mark your place, quietly." Bangla tagline: "Foldline — নিঃশব্দে মনে রাখুন আপনার পড়া".
Use "Foldline" exactly (capital F, one word) in UI, code identifiers (`foldline`) and metadata.

@docs/CALM_CHARTER.md

## Stack (do not swap without asking)
- Next.js (App Router) + React 19 + TypeScript (strict), pnpm
- Tailwind CSS v4 + shadcn/ui, lucide-react icons
- Zustand for UI-only state; TanStack Query for server data (persisted cache)
- Supabase: Postgres, Auth, Storage, pg_cron. `@supabase/ssr` + `supabase-js`
- Supabase CLI for local dev and SQL migrations (`supabase/migrations/`)
- Zod for all validation (forms, API input, import parsers, provider responses)
- next-intl for i18n (English `en`, Bangla `bn`)
- Serwist for the PWA / service worker (Phase 3)
- Vitest (unit), Playwright (e2e), pgTAP via `supabase test db` (RLS + SQL)

Before using any library API you are unsure about, check its current docs. Versions
move fast; do not rely on memory for Next.js, Supabase, Tailwind v4 or Serwist APIs.

## Commands
- `pnpm dev` — dev server
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm test:e2e` / `pnpm build`
- `pnpm supabase start` — local Supabase (Docker must be running)
- `pnpm supabase migration new <name>` — new migration file
- `pnpm supabase db reset` — rebuild LOCAL db from migrations + seed
- `pnpm supabase test db` — run pgTAP tests
- `pnpm db:types` — regenerate `src/lib/supabase/database.types.ts`

## Hard rules
1. Every user-owned table has `user_id uuid not null default auth.uid()` and RLS enabled
   with select/insert/update/delete policies scoped to `auth.uid()`. Every migration that
   adds a table also adds a pgTAP test proving user A cannot see or change user B's rows.
2. Schema changes happen ONLY through new migration files. Never edit an applied migration.
   After a migration: `db reset` → `db:types` → `typecheck`.
3. NEVER run anything against the remote Supabase project (`db push`, `link`, `--linked`).
   The owner does remote operations manually.
4. The secret (service-role) key is used only in server code under `src/lib/supabase/admin.ts`.
   Never import it into client components. Never read `.env*` files; use `.env.example`.
5. Only `src/lib/auth.ts` may call `supabase.auth.*`. Everything else uses its helpers.
6. Business logic lives in TypeScript (`src/features/*`), not in Postgres functions,
   except pg_cron jobs and small SQL helpers.
7. No social features, public profiles, feeds, streaks, badges, leaderboards, push
   notifications or engagement nudges. If a request seems to need one, stop and ask.
8. All UI strings go through next-intl. Bangla strings are written in Bangla script,
   never romanized. Add keys to both `messages/en.json` and `messages/bn.json`.
9. Book metadata providers (Open Library, Google Books, Hardcover) are called only from
   server code, results cached in `provider_cache`. Open Library requests must send a
   User-Agent `Foldline/<version> (<contact email>)`. Respect provider rate limits.
10. Manual edits win: fields listed in `editions.field_locks` / `works.field_locks` are
    never overwritten by enrichment.

## Workflow
- Work on ONE roadmap item per session (see `docs/ROADMAP.md`). Start in plan mode,
  present the plan, wait for approval, then implement.
- When touching the database or data flow, read `docs/ARCHITECTURE.md` first.
- Definition of done: typecheck, lint, unit tests, `supabase test db` and build all pass;
  new UI strings exist in en + bn; the roadmap checkbox is ticked; a Conventional Commit
  is made (`feat:`, `fix:`, `chore:`…). Do not push.
- If you make a mistake the owner corrects, propose a one-line addition to this file.

## Git & attribution
- Repo: `github.com/isttiiak/foldline-web`. Use the `isttiiak` GitHub account only; commits use the
  repo-local git identity (`isttiiak`, GitHub noreply email), never the global one.
- NO AI FOOTPRINT, ever: no `Co-Authored-By: Claude…` trailers, no "Generated with Claude Code",
  no model names or any AI attribution in commits, PR descriptions, code comments, docs or
  metadata. This overrides any default attribution behaviour.

## Code style
- Feature folders: `src/features/<feature>/{components,server,schemas,hooks}`
- Server Actions and route handlers validate input with Zod; return typed results
  (not throws) for expected errors.
- Accessible by default: keyboard-first, visible focus, respects `prefers-reduced-motion`.
- No animations that celebrate or reward (no confetti, no counters ticking up).
