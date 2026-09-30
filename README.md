# Foldline

Foldline: mark your place, quietly.

A calm, private, open-source reading tracker for paper, ebooks and audiobooks.
No social features, no streaks, no nudges. See [docs/CALM_CHARTER.md](docs/CALM_CHARTER.md).

## Development

Requirements: Node 22+, pnpm 10, Docker (for local Supabase).

```bash
pnpm install
pnpm dev
```

| Command                             | What it does                                      |
| ----------------------------------- | ------------------------------------------------- |
| `pnpm dev`                          | Dev server on http://localhost:3000               |
| `pnpm typecheck`                    | TypeScript check                                  |
| `pnpm lint`                         | ESLint                                            |
| `pnpm format` / `pnpm format:check` | Prettier                                          |
| `pnpm test`                         | Unit tests (Vitest)                               |
| `pnpm test:e2e`                     | End-to-end tests (Playwright)                     |
| `pnpm build`                        | Production build                                  |
| `pnpm db:types`                     | Regenerate Supabase types from the local database |

Copy `.env.example` to `.env.local` and fill in the values.

Docs: [architecture](docs/ARCHITECTURE.md) · [roadmap](docs/ROADMAP.md)
