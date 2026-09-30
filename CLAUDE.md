# Foldline: Claude Code context

Foldline is a free, public, private-by-default reading tracker for anyone in the world. Users track
books across paper, ebook and audiobook with advanced features, as much automation and as little
friction as possible, in a charming, animated UI that motivates without guilt. It is NOT a social
network. AI features come later and are opt-in.

Audience: public. Sign-in is Google only for now (email later). Until the Phase 1 "Launch
readiness" items ship, Supabase signups stay off and the owner adds early users by hand.
Product name: **Foldline** (named after the crease of a folded page corner, marking your place
quietly). Tagline: "Foldline: mark your place, quietly." Bangla tagline (for later): "Foldline: নিঃশব্দে মনে রাখুন আপনার পড়া".
Use "Foldline" exactly (capital F, one word) in UI, code identifiers (`foldline`) and metadata.

@docs/CALM_CHARTER.md

## Stack (do not swap without asking)

- Next.js (App Router) + React 19 + TypeScript (strict), pnpm
- Tailwind CSS v4 + shadcn/ui, lucide-react icons
- Zustand for UI-only state; TanStack Query for server data (persisted cache)
- Supabase: Postgres, Auth, Storage, pg_cron. `@supabase/ssr` + `supabase-js`
- Supabase CLI for local dev and SQL migrations (`supabase/migrations/`)
- Zod for all validation (forms, API input, import parsers, provider responses)
- next-intl for i18n (English `en` now; Bangla `bn` deferred)
- `motion` for animation
- Serwist for the PWA / service worker (Phase 3)
- Vitest (unit), Playwright (e2e), pgTAP via `supabase test db` (RLS + SQL)

Before using any library API you are unsure about, check its current docs. Versions
move fast; do not rely on memory for Next.js, Supabase, Tailwind v4 or Serwist APIs.

## Commands

- `pnpm dev`: dev server
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm test:e2e` / `pnpm build`
- New migration: create `supabase/migrations/<NNNN>_<name>.sql` by hand with the next serial
  number (`0003`, `0004`, ...), not `supabase migration new` (it names files by timestamp)
- Optional, only if Docker is installed: `pnpm supabase start`, `pnpm supabase db reset`,
  `pnpm supabase test db`, `pnpm db:types`. Without Docker, CI runs the pgTAP tests.

## Hard rules

1. Every user-owned table has `user_id uuid not null default auth.uid()` and RLS enabled
   with select/insert/update/delete policies scoped to `auth.uid()`. Every migration that
   adds a table also adds a pgTAP test proving user A cannot see or change user B's rows.
2. Schema changes happen ONLY through new migration files. Never edit an applied migration
   (see `docs/MIGRATIONS.md`); fixes go in a new file. Follow "Migration handoff" below.
3. NEVER run anything against a remote Supabase project (`db push`, `link`, `--linked`).
   The owner applies every migration by hand in the Supabase SQL Editor.
4. The secret (service-role) key is used only in server code under `src/lib/supabase/admin.ts`.
   Never import it into client components. Never read `.env*` files; use `.env.example`.
5. Only `src/lib/auth.ts` may call `supabase.auth.*`. Everything else uses its helpers.
6. Business logic lives in TypeScript (`src/features/*`), not in Postgres functions,
   except pg_cron jobs and small SQL helpers.
7. Follow `docs/CALM_CHARTER.md`: opt-in goals and warm celebrations are fine; no feeds,
   followers, public profiles, leaderboards, comparisons, guilt/broken-streak mechanics,
   unscheduled notifications, product analytics or third-party trackers. Sharing is
   opt-in only (Phase 8). If a request seems to need something banned, stop and ask.
8. All UI strings go through next-intl and live in `messages/en.json`. English only for now;
   Bangla (`bn`) is deferred. When it is added, Bangla is written in Bangla script, never romanized.
9. Book metadata providers (Open Library, Google Books, Hardcover) are called only from
   server code, results cached in `provider_cache`. Open Library requests must send a
   User-Agent `Foldline/<version> (<contact email>)`. Respect provider rate limits.
10. Manual edits win: fields listed in `editions.field_locks` / `works.field_locks` are
    never overwritten by enrichment.
11. Never use the em dash character anywhere (UI copy, docs, comments, commits). Use `:`, `,` or `-`.

## Workflow

- Start every session by reading `docs/TODO.md` (handoff list), and update it before ending.
- Work on ONE roadmap item per session (see `docs/ROADMAP.md`). Start in plan mode,
  present the plan, wait for approval, then implement.
- When touching the database or data flow, read `docs/ARCHITECTURE.md` first.
- Definition of done: typecheck, lint, unit tests, e2e and build pass locally (pgTAP passes in
  CI, or locally with Docker);
  new UI strings exist in `messages/en.json`; the roadmap checkbox is ticked; a Conventional
  Commit is ALWAYS made at the end of every task (`feat:`, `fix:`, `chore:`…). Do not push.
- If you make a mistake the owner corrects, propose a one-line addition to this file.

### Migration handoff (no Docker, owner applies SQL by hand)

1. Write `supabase/migrations/<NNNN>_<name>.sql` (next serial number) as a self-contained script that runs
   cleanly when pasted into the Supabase SQL Editor (plain SQL, no psql meta-commands),
   plus a pgTAP test in `supabase/tests/database/`.
2. Update `src/lib/supabase/database.types.ts` by hand to match (same shape `db:types` emits).
3. Add a row to `docs/MIGRATIONS.md` (status: pending) and commit.
4. In the final reply, name the exact file(s) to run, in order, and remind the owner that CI
   must be green first. The owner pastes each file into Dashboard → SQL Editor → Run, on
   the dev project first, then prod, and marks it applied in `docs/MIGRATIONS.md`.

## Git & attribution

- Repo: `github.com/isttiiak/foldline-web`. Use the `isttiiak` GitHub account only; commits use the
  repo-local git identity (`isttiiak`, GitHub noreply email), never the global one.
- NO AI FOOTPRINT, ever: no `Co-Authored-By: Claude…` trailers, no "Generated with Claude Code",
  no model names or any AI attribution in commits, PR descriptions, code comments, docs or
  metadata. This overrides any default attribution behaviour.
- Releases: tag every release with an annotated SemVer tag. The first release is `v0.1.0`
  (`git tag -a v0.1.0 -m "v0.1.0"`); bump `package.json` `version` to match. Do not push tags.

## Code style

- Feature folders: `src/features/<feature>/{components,server,schemas,hooks}`
- Server Actions and route handlers validate input with Zod; return typed results
  (not throws) for expected errors.
- Accessible by default: keyboard-first, visible focus, respects `prefers-reduced-motion`.
- Dark theme only (warm charcoal, never pure black). Charming and joyful: warm gradients
  (amber, coral, rose, teal, lime), playful motion. NO violet/purple or violet gradients, no
  generic "AI dashboard" look. All motion honours `prefers-reduced-motion`.
- Motion may delight, never pressure: no streak counters, no guilt, nothing that rewards
  reading more or more often.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
