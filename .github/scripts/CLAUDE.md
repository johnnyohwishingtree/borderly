# .github/scripts/ — Pipeline Shell Scripts

## Architecture

This folder contains shared shell scripts for GitHub Actions workflows, following a **Temporal-inspired** design where reusable "activities" are composed into workflow orchestrations.

| Script | Role |
|--------|------|
| `lib.sh` | Shared function library — source this, never execute directly |
| `workflow.sh` | Temporal-like activity runner with state tracking and retry policies |
| `state-machine.sh` | Pipeline state persistence (JSON in GitHub issue comments) |
| `evaluate-merge-gate.sh` | Merge readiness evaluator (6 conditions) |
| `verify-checks.sh` | CI check verification helpers |

## Rules

### Always use lib.sh functions instead of inline commands

When writing workflow steps, **never** use raw `gh` or `git` commands for operations that lib.sh already provides. This is the single most important rule.

| Instead of... | Use... |
|---------------|--------|
| `gh workflow run X.yml --repo ... --ref master -f ...` | `dispatch_workflow "X.yml" -f ...` |
| `git remote set-url origin "https://..."` + `git config user.name/email` | `setup_git_auth` |
| `gh pr view N --json reviews -q '..APPROVED..'` | `count_approvals N "$REPO"` |
| `gh api graphql ... reviewThreads ...` | `count_unresolved_threads N "$REPO"` |
| `git fetch origin master && git merge origin/master` | `merge_master_into_branch` |
| `git status --porcelain && git add -u && git commit` | `check_changes_and_commit "message"` |
| `git fetch && git push origin HEAD:refs/heads/...` | `smart_push "branch"` |
| `gh issue comment N --repo ... --body "..."` | `comment_on_issue N "body"` |
| `gh run list --workflow X --status in_progress ...` | `is_workflow_active "X.yml" N "$REPO"` |

### How to source lib.sh in a workflow step

```yaml
- name: Do something
  env:
    GH_TOKEN: ${{ secrets.GH_PAT }}
  run: |
    source .github/scripts/lib.sh
    setup_git_auth
    dispatch_workflow "auto-merge.yml" -f pr_number="42"
```

Requirements:
- The job must checkout `.github/scripts/` (via `actions/checkout` or sparse-checkout)
- `$GH_TOKEN` must be set in the step's `env` (most functions need it)
- `$GITHUB_REPOSITORY` is set automatically by GitHub Actions

### Function signatures

All functions document their args, env vars, and return values in comments. Read them before using. Key patterns:
- Functions that return data print to stdout — capture with `$()`
- Functions that return status use exit codes — check with `if` or `$?`
- `is_workflow_active` returns exit code (0=active, 1=not active), NOT a string

### Testing

Every script has a corresponding `.bats` test file in `__tests__/`:

```bash
# Run all tests
bats .github/scripts/__tests__/*.bats

# Run a specific test file
bats .github/scripts/__tests__/lib.test.bats
```

Tests use `test-helper.bash` for mock setup. When adding new lib.sh functions:
1. Add the function to `lib.sh`
2. Add a mock response handler in `test-helper.bash` if it calls `gh`
3. Write tests in the appropriate `.test.bats` file
4. Add a regression test in `regression.test.bats` if the function fixes a bug
