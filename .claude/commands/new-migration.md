Create a database migration for: $ARGUMENTS

Steps:

1. Create `supabase/migrations/<NNNN>_<short_snake_case_name>.sql` by hand, where `NNNN` is
   the next serial number after the highest existing file (e.g. `0003`). Do not use
   `supabase migration new`: it names files by timestamp.
2. Write the SQL per docs/ARCHITECTURE.md: `user_id` default auth.uid(), RLS enabled with
   four own-row policies, indexes, `public.set_updated_at()` trigger. The file must run as-is
   when pasted into the Supabase SQL Editor (plain SQL, no psql meta-commands).
3. Add a pgTAP test `supabase/tests/database/<NNNN>_<name>.test.sql` in supabase/tests/database/ proving user A cannot read/insert/update/delete
   user B's rows.
4. Update src/lib/supabase/database.types.ts by hand to match; run `pnpm typecheck`.
   If Docker is available, also `pnpm supabase db reset`, `pnpm supabase test db`, `pnpm db:types`.
5. Add a "pending" row to docs/MIGRATIONS.md and commit.
6. Tell the owner exactly which file(s) to paste into the SQL Editor, in order, once CI is
   green. Never touch a remote project.
