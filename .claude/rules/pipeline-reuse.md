# Pipeline Reuse: Use TypeScript Pipeline CLI

When writing or modifying GitHub Actions workflow steps in `.github/workflows/`:

1. **Add `setup-pipeline-ts`** action after checkout. This installs Node.js, pnpm, and pipeline TS dependencies.

2. **Use the pipeline CLI instead of inline commands:**
   - `npx tsx .github/scripts/lib/cli/pipeline.ts dispatch "X.yml" -f key=val` instead of `gh workflow run`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts setup-git-auth` instead of `git remote set-url` + `git config`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts count-approvals N "$REPO"` instead of `gh pr view --json reviews`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts count-unresolved-threads N "$REPO"` instead of inline GraphQL queries
   - `npx tsx .github/scripts/lib/cli/pipeline.ts merge-master` instead of `git fetch && git merge`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts commit "message"` instead of `git status && git add && git commit`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts push "branch"` instead of `git fetch && git push`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts comment N "body"` instead of `gh issue comment`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts is-workflow-active "X.yml" N "$REPO"` instead of `gh run list`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts count-critical-comments N "$REPO"` instead of `gh api pulls/N/comments`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts approve-and-merge N "body"` instead of `gh pr review --approve`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts get-next-pending-story "$EPIC_LABEL"` instead of `gh issue list`
   - `npx tsx .github/scripts/lib/cli/pipeline.ts trigger-story-agent N "agent" "(suffix)"` instead of inline `@agent`

3. **Check `.github/scripts/CLAUDE.md`** for the full CLI reference before writing inline shell code.

4. If a pattern is needed more than once and doesn't exist in the CLI, add it to `lib/cli/pipeline.ts` with tests.
