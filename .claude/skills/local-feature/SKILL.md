---
name: local-feature
description: Develop a feature in an isolated git worktree so it won't interfere with your current working directory
argument-hint: "[feature description]"
---

# Local Feature Development

Develop a feature in an isolated git worktree. Use this when you want to work on something without disturbing your current branch or uncommitted changes.

## Steps

1. **Fetch latest master** — run `git fetch origin master` before creating the worktree.
2. **Enter a worktree** using the `EnterWorktree` tool. Name it based on the feature (e.g., `local-feature-qr-redesign`).
3. **Reset to master** — inside the worktree, run `git reset --hard origin/master` so the new branch starts from the latest master, not from whatever branch was checked out.
4. **Install dependencies** — run `pnpm install` in the new worktree.
5. **Read CLAUDE.md** for project context and conventions.
6. **Explore the codebase** to understand existing patterns relevant to the feature.
7. **Plan the implementation** — identify files to create/modify.
8. **Implement** — write the code following existing patterns.
9. **Test** — write tests and verify they pass (`pnpm typecheck`, `pnpm test`, `pnpm e2e`).
10. **Commit** — stage specific files, commit with descriptive message.
11. **Push the branch** so it's available for a PR.
12. **Exit the worktree** using `ExitWorktree` with action `keep` (so you can return to it later if needed).

## Implementation Guidelines

- Follow existing code patterns and conventions
- Add tests for new functionality
- Handle error cases explicitly
- Keep changes focused — don't refactor unrelated code
- Commit and push frequently (every 2-3 file changes)
- Run all commit gate checks before each commit (`pnpm lint`, `pnpm typecheck`, `pnpm test`)

## After Implementation

- Run the full test suite to verify nothing is broken
- Create a PR with `Closes #N` if working from an issue
- Exit the worktree with `keep` — the user will decide when to remove it
