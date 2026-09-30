# Migrations log

Every schema change is a file in `supabase/migrations/`. The owner applies them by hand:

1. Wait for the **ci** workflow to be green on GitHub (the `db` job runs the pgTAP tests).
2. Open the file, copy everything.
3. Supabase Dashboard → **SQL Editor → New query** → paste → **Run**. Dev project first.
4. Check the app against dev, then repeat step 3 on prod.
5. Tick the columns below and commit.

Rules: run files **in order**, **once** per project. Never edit a file after it is applied
anywhere; fixes go in a new file. Do not mix in `supabase db push` later: the CLI's
migration history does not know about SQL Editor runs.

| #   | File                                    | What it does                                                               | Dev | Prod |
| --- | --------------------------------------- | -------------------------------------------------------------------------- | --- | ---- |
| 1   | `20260930032412_create_profiles.sql`    | `profiles` table, RLS, signup trigger, `set_updated_at()` helper           | [ ] | [ ]  |
| 2   | `20260930212302_create_rate_limits.sql` | `rate_limits` counters (server-only, RLS, no policies), `rate_limit_hit()` | [ ] | [ ]  |
