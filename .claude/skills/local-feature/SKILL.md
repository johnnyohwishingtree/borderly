---
name: local-feature
description: Develop a feature in an isolated git worktree so it won't interfere with your current working directory
argument-hint: "[feature description]"
---

# Local Feature Development

Develop a feature in an isolated git worktree. Use this when you want to work on something without disturbing your current branch or uncommitted changes.

## Prerequisites

- Git worktree support available
- `pnpm` installed globally
- Feature description or story issue identified

## Steps

1. **Fetch latest master** — run `git fetch origin master` before creating the worktree.
2. **Enter a worktree** using the `EnterWorktree` tool. Name it based on the feature (e.g., `local-feature-qr-redesign`).
3. **Reset to master** — inside the worktree, run `git reset --hard origin/master` so the new branch starts from the latest master, not from whatever branch was checked out.
4. **Install dependencies** — run `pnpm install` in the new worktree.
5. **Read CLAUDE.md** for project context and conventions.
6. **Explore the codebase** to understand existing patterns relevant to the feature.
7. **Plan the implementation** — identify files to create/modify.
8. **Implement** — write the code following existing patterns.
9. **Test** — write tests following the test quality rules (Tier 1-2 tests only, assert behavior not existence). Fix bugs via the bug-fix rules: write failing test first, verify it fails without the fix, then fix.
10. **Verify** — follow the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts.
11. **Learn** — follow the learning rules: capture anti-patterns, constraints, testing patterns; if 5+ files changed, must update knowledge.
12. **Self-review** — follow the self-review rules: review diff before committing, fix `any` types, unused imports, empty catches.
13. **Commit** — stage specific files, commit with descriptive message.
14. **Push the branch** so it's available for a PR.
15. **Exit the worktree** using `ExitWorktree` with action `keep` (so you can return to it later if needed).

## Implementation Guidelines

- Follow the fix-strategy rules: fix one file at a time, run typecheck after each, never use `any` when modifying code
- Keep changes focused — don't refactor unrelated code
- Commit and push frequently (every 2-3 file changes)

## Guardrails

- Keep changes focused — don't refactor unrelated code
- Exit worktree with `keep` — let user decide when to remove
