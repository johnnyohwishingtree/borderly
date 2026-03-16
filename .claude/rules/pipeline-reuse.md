# Pipeline Reuse: Use lib.sh Functions

When writing or modifying GitHub Actions workflow steps in `.github/workflows/`:

1. **Set `BASH_ENV: .github/scripts/lib.sh`** in the job's `env:` block. This auto-sources lib.sh in every step — do NOT use `source .github/scripts/lib.sh` in individual steps.

2. **Use lib.sh functions instead of inline commands:**
   - `dispatch_workflow "X.yml" ...` instead of `gh workflow run`
   - `setup_git_auth` instead of `git remote set-url` + `git config`
   - `count_approvals N "$REPO"` instead of `gh pr view --json reviews`
   - `count_unresolved_threads N "$REPO"` instead of inline GraphQL queries
   - `merge_master_into_branch` instead of `git fetch && git merge`
   - `check_changes_and_commit "message"` instead of `git status && git add && git commit`
   - `smart_push "branch"` instead of `git fetch && git push` with comparison logic
   - `comment_on_issue N "body"` instead of `gh issue comment`
   - `is_workflow_active "X.yml" N "$REPO"` instead of `gh run list --status`
   - `count_critical_comments N "$REPO"` instead of `gh api pulls/N/comments` with jq filter
   - `approve_and_merge N "body"` instead of `gh pr review --approve` + `dispatch_workflow`
   - `get_next_pending_story "$EPIC_LABEL"` instead of `gh issue list --label story --label pending`
   - `trigger_story_agent N "agent" "(suffix)"` instead of inline `@agent Implement this story...`

3. **Check `.github/scripts/CLAUDE.md`** for the full function reference before writing inline shell code.

4. If a pattern is needed more than once and doesn't exist in lib.sh, add it there with tests in `__tests__/`.
