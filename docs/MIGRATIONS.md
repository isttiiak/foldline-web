# Migrations log

Every schema change is a file in `supabase/migrations/`. The owner applies them by hand:

1. Wait for the **ci** workflow to be green on GitHub (the `db` job runs the pgTAP tests).
2. Open the file, copy everything.
3. Supabase Dashboard → **SQL Editor → New query** → paste → **Run**. Dev project first.
4. Check the app against dev, then repeat step 3 on prod.
5. Tick the columns below and commit.

Files are numbered `NNNN_name.sql` (`0001`, `0002`, ...): the number is the order. The next
file takes the next number; the pgTAP test for it is `supabase/tests/database/NNNN_name.test.sql`.
(Files 1 and 2 were renamed from timestamps on 2026-10-01; the SQL is unchanged, so nothing
needs re-running.)

Rules: run files **in order**, **once** per project. Never edit a file after it is applied
anywhere; fixes go in a new file. Do not mix in `supabase db push` later: the CLI's
migration history does not know about SQL Editor runs.

| #   | File                               | What it does                                                                             | Dev | Prod |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------- | --- | ---- |
| 1   | `0001_create_profiles.sql`         | `profiles` table, RLS, signup trigger, `set_updated_at()` helper                         | [x] | [ ]  |
| 2   | `0002_create_rate_limits.sql`      | `rate_limits` counters (server-only, RLS, no policies), `rate_limit_hit()`               | [x] | [ ]  |
| 3   | `0003_create_library.sql`          | works, authors, editions, reads, progress (RLS), `provider_cache`, pg_trgm               | [x] | [ ]  |
| 4   | `0004_profile_details.sql`         | profile photo, bio, reading preferences; private `avatars` Storage bucket                | [x] | [ ]  |
| 5   | `0005_book_covers.sql`             | private `covers` Storage bucket for readers' own cover photos                            | [x] | [ ]  |
| 6   | `0006_cover_design_and_source.sql` | `editions.cover_design` (designed cover id) and `bought_from` (where the copy came from) | [ ] | [ ]  |
