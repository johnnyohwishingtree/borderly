# Pipeline Reuse: Use lib.sh Functions

When writing or modifying GitHub Actions workflow steps in `.github/workflows/`:

1. **Always `source .github/scripts/lib.sh`** at the top of `run:` blocks that interact with git or the GitHub API.

2. **Use lib.sh functions instead of inline commands:**
   - `dispatch_workflow` instead of `gh workflow run`
   - `setup_git_auth` instead of `git remote set-url` + `git config`
   - `count_approvals` instead of `gh pr view --json reviews`
   - `count_unresolved_threads` instead of inline GraphQL queries
   - `merge_master_into_branch` instead of `git fetch && git merge`
   - `check_changes_and_commit` instead of `git status && git add && git commit`
   - `smart_push` instead of `git fetch && git push` with comparison logic
   - `comment_on_issue` instead of `gh issue comment`
   - `is_workflow_active` instead of `gh run list --status`

3. **Check `.github/scripts/CLAUDE.md`** for the full function reference before writing inline shell code.

4. If a pattern is needed more than once and doesn't exist in lib.sh, add it there with tests in `__tests__/`.
