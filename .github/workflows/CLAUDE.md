# .github/workflows/ — GitHub Actions Workflows

## Architecture

See `docs/pipeline-architecture.md` for the full pipeline design, workflow interactions, and edge cases.

The pipeline follows a **Temporal-inspired** model:
- **Workflows** = story lifecycle per issue (orchestrate.yml)
- **Activities** = individual GHA workflow runs (claude.yml, verify-merge.yml, etc.)
- **Steps** = steps inside a GHA job

## Rules

### 1. Use lib.sh functions — never inline raw commands

Every workflow step that interacts with git or the GitHub API must use lib.sh functions. See `.github/scripts/CLAUDE.md` for the full mapping.

```yaml
# BAD — raw dispatch
gh workflow run auto-merge.yml --repo "$REPO" --ref master -f pr_number="$N"

# GOOD — reusable function (available via BASH_ENV)
dispatch_workflow "auto-merge.yml" -f pr_number="$N"
```

### 2. Set BASH_ENV at the job level

Every job that uses lib.sh functions must set `BASH_ENV` and have a checkout step:
```yaml
jobs:
  my-job:
    runs-on: ubuntu-latest
    env:
      BASH_ENV: .github/scripts/lib.sh   # auto-sourced in every step
    steps:
      - uses: actions/checkout@v4         # makes the file available
```

Do NOT use `source .github/scripts/lib.sh` in individual steps — `BASH_ENV` handles it once at the job level.

### 3. Use GH_PAT for cross-workflow triggers

`GITHUB_TOKEN` cannot trigger other workflows or push when `.github/workflows/` files differ. Always use `secrets.GH_PAT` for:
- `dispatch_workflow` calls
- `gh pr review --approve` (GITHUB_TOKEN approvals don't emit events)
- Pushing branches that modify workflow files

### 4. GITHUB_TOKEN approvals don't trigger events

When a workflow approves a PR using `${{ github.token }}`, GitHub suppresses the `pull_request_review` event. After any GITHUB_TOKEN approval, explicitly dispatch auto-merge:
```yaml
gh pr review "$PR_NUM" --approve --body "Auto-approved: ..."
GH_TOKEN="$GH_PAT" dispatch_workflow "auto-merge.yml" -f pr_number="$PR_NUM"
```

### 5. Never put @claude or @gemini in automated comments

Comments containing `@claude` or `@gemini` trigger new workflow runs. Bot status comments, give-up messages, and error reports must NEVER contain these triggers.

### 6. Concurrency groups must include author

PR comment-triggered workflows must include `github.event.comment.user.login` in the concurrency group to prevent bot status comments from cancelling real runs.

### 7. Update pipeline-architecture.md

When modifying any workflow file, update `docs/pipeline-architecture.md` to match. This is enforced by `.claude/rules/pipeline-docs.md`.

## Workflow Inventory

| Workflow | Trigger | Role |
|----------|---------|------|
| `orchestrate.yml` | Issue labeled `story` | Story lifecycle orchestrator |
| `claude.yml` | Issue/PR comments, workflow_dispatch | Claude agent implementation |
| `gemini.yml` | Issue/PR comments | Gemini agent implementation |
| `verify-and-fix.yml` | workflow_dispatch | Reusable verify + fix loop (configurable attempts) |
| `verify-merge.yml` | workflow_dispatch | Fix loop (up to 6 attempts) + merge + PR creation |
| `auto-merge.yml` | workflow_dispatch, workflow_run | Merge gate evaluator |
| `review-guardian.yml` | workflow_run, issue_comment, PR review | Review + auto-approve |
| `review-relay.yml` | PR review submitted | Relay review feedback to fix workflow |
| `review-fix.yml` | workflow_dispatch | Apply review feedback fixes, dispatch verify-and-fix |
| `resolve-conflicts.yml` | workflow_dispatch | Merge conflict resolution |
| `pipeline-doctor.yml` | workflow_dispatch | Diagnose stuck pipelines |
| `watcher.yml` | schedule (every 30min) | Monitor stale PRs and issues |
| `test.yml` | push, PR | Unit tests + typecheck + lint; dispatches verify-and-fix on failure |
| `e2e-smoke.yml` | push, PR | Playwright E2E tests; dispatches verify-and-fix on failure |
| `build-ios.yml` | workflow_dispatch | iOS build |
| `release.yml` | tags | Release pipeline |
| `daily-planner.yml` | schedule | Daily story planning |
| `agent-switcher.yml` | workflow_dispatch | Switch between Claude/Gemini |
| `pipeline-toggle.yml` | workflow_dispatch | Enable/disable pipeline |
