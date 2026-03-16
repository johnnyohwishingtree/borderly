# .github/workflows/ — GitHub Actions Workflows

## Architecture

See `docs/pipeline-architecture.md` for the full pipeline design, workflow interactions, and edge cases.

The pipeline follows a **Temporal-inspired** model:
- **Workflows** = story lifecycle per issue (orchestrate.yml)
- **Activities** = individual GHA workflow runs (claude.yml, verify-merge.yml, etc.)
- **Steps** = steps inside a GHA job

## Rules

### 1. Use lib.sh functions — never inline raw commands

Every workflow step that interacts with git or the GitHub API must `source .github/scripts/lib.sh` and use its functions. See `.github/scripts/CLAUDE.md` for the full mapping.

Common violations to avoid:
```yaml
# BAD — raw dispatch
gh workflow run auto-merge.yml --repo "$REPO" --ref master -f pr_number="$N"

# GOOD — reusable function
source .github/scripts/lib.sh
dispatch_workflow "auto-merge.yml" -f pr_number="$N"
```

### 2. Checkout scripts before sourcing

If a job needs lib.sh, it must checkout the scripts:
```yaml
- uses: actions/checkout@v4
  with:
    sparse-checkout: .github/scripts
    sparse-checkout-cone-mode: false
```

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
| `verify-merge.yml` | workflow_dispatch | Fix loop (up to 6 attempts) |
| `auto-merge.yml` | workflow_dispatch, workflow_run | Merge gate evaluator |
| `review-guardian.yml` | workflow_run, issue_comment, PR review | Review + auto-approve |
| `review-relay.yml` | PR review submitted | Relay review feedback to fix workflow |
| `review-fix.yml` | workflow_dispatch | Apply review feedback fixes |
| `resolve-conflicts.yml` | workflow_dispatch | Merge conflict resolution |
| `pipeline-doctor.yml` | workflow_dispatch | Diagnose stuck pipelines |
| `watcher.yml` | schedule (every 30min) | Monitor stale PRs and issues |
| `test.yml` | push, PR | Unit tests + typecheck + lint |
| `e2e-smoke.yml` | push, PR | Playwright E2E tests |
| `build-ios.yml` | workflow_dispatch | iOS build |
| `release.yml` | tags | Release pipeline |
| `daily-planner.yml` | schedule | Daily story planning |
| `agent-switcher.yml` | workflow_dispatch | Switch between Claude/Gemini |
| `pipeline-toggle.yml` | workflow_dispatch | Enable/disable pipeline |
