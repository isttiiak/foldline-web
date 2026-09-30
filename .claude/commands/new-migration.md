Create a database migration for: $ARGUMENTS

Steps:
1. `pnpm supabase migration new <short_snake_case_name>`
2. Write the SQL per docs/ARCHITECTURE.md: `user_id` default auth.uid(), RLS enabled with
   four own-row policies, indexes, updated_at trigger.
3. Add a pgTAP test in supabase/tests/ proving user A cannot read/insert/update/delete
   user B's rows.
4. Run `pnpm supabase db reset`, `pnpm supabase test db`, `pnpm db:types`, `pnpm typecheck`.
5. Report what changed. Never touch the remote project.
