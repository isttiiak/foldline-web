# Session prompts (one per session, in order)

## Session 1 — Foundation audit (no code changes)

Read CLAUDE.md, docs/CALM_CHARTER.md, docs/ARCHITECTURE.md and docs/ROADMAP.md.
Then inspect the scaffolded Next.js project. Tell me: (1) anything in the scaffold that
conflicts with CLAUDE.md, (2) the exact packages you plan to add for Phase 0 and why,
(3) any open questions. Do not change files yet.

## Session 2 onwards — one roadmap item each

1. /next-task → review the plan, adjust, approve
2. (Claude implements)
3. /verify
4. /calm-check
5. Review the diff yourself, let Claude commit, then /clear

## Database changes

/new-migration Phase 1 core tables

## When something breaks

"That broke X. Find the root cause before changing code, explain it,
then fix it and add a test that would have caught it."

## When Claude repeats a mistake

"Add a one-line rule to CLAUDE.md so this doesn't happen again."
