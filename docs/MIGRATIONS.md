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

| #   | File                               | What it does                                                                               | Dev | Prod |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------ | --- | ---- |
| 1   | `0001_create_profiles.sql`         | `profiles` table, RLS, signup trigger, `set_updated_at()` helper                           | [x] | [x]  |
| 2   | `0002_create_rate_limits.sql`      | `rate_limits` counters (server-only, RLS, no policies), `rate_limit_hit()`                 | [x] | [x]  |
| 3   | `0003_create_library.sql`          | works, authors, editions, reads, progress (RLS), `provider_cache`, pg_trgm                 | [x] | [x]  |
| 4   | `0004_profile_details.sql`         | profile photo, bio, reading preferences; private `avatars` Storage bucket                  | [x] | [x]  |
| 5   | `0005_book_covers.sql`             | private `covers` Storage bucket for readers' own cover photos                              | [x] | [x]  |
| 6   | `0006_cover_design_and_source.sql` | `editions.cover_design` (designed cover id) and `bought_from` (where the copy came from)   | [x] | [x]  |
| 7   | `0007_reading_goals.sql`           | `reading_goals` (opt-in books or pages goals between two dates, RLS)                       | [x] | [x]  |
| 8   | `0008_tags_and_shelves.sql`        | `tags`, `work_tags`, `shelves` (manual and smart), `shelf_items` (RLS)                     | [x] | [x]  |
| 9   | `0009_statuses_and_fields.sql`     | `custom_statuses` (+ `reads.custom_status_id`), `custom_fields` (+ `works.custom_values`)  | [x] | [x]  |
| 10  | `0010_copies_and_loans.sql`        | `copies` (ownership, location) and `loans` (lent to / borrowed from) (RLS)                 | [x] | [x]  |
| 11  | `0011_undo_entries.sql`            | `undo_entries` (day-long snapshots for undoing bulk edits, merges and imports) (RLS)       | [x] | [x]  |
| 12  | `0012_bengali_book_details.sql`    | `works.title_romanized` and `editions.edition_statement` (details for books added by hand) | [x] | [ ]  |
