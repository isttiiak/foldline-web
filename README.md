# Foldline

Foldline: mark your place, quietly.

A calm, private, open-source reading tracker for paper, ebooks and audiobooks.
No social features, no streaks, no nudges. See [docs/CALM_CHARTER.md](docs/CALM_CHARTER.md).

## Development

Requirements: Node 22+, pnpm 10, a free Supabase project. Docker is optional.

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

Copy `.env.example` to `.env.local` and fill in the values. See [docs/SETUP.md](docs/SETUP.md) for where each key comes from.

Docs: [architecture](docs/ARCHITECTURE.md) · [roadmap](docs/ROADMAP.md)

## License

Copyright (C) 2026 isttiiak.

Foldline is free software: you can redistribute it and/or modify it under the terms of the
[GNU Affero General Public License](LICENSE) as published by the Free Software Foundation, either
version 3 of the License, or (at your option) any later version. If you run a modified version for
others over a network, you must offer them its source code too.

Foldline is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the license for
details.
