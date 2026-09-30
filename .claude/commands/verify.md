Run, in order: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`,
`pnpm build`. Run `pnpm supabase test db` only if Docker is installed (CI always runs it).
Fix every failure (never disable rules or skip tests to make them pass).
Check that every new UI string exists in messages/en.json (Bangla is deferred) and that no
em dash appears anywhere. Report a short summary.
