# Design: Reusable verify-and-fix workflow

## Problem

Quality checks + fix retry logic is reimplemented in multiple workflows:

| Workflow | Checks | Fix Retry | Issues |
|----------|--------|-----------|--------|
| verify-merge.yml | verify-checks.sh (full) | 6 attempts via self-dispatch | Reference impl, but tightly coupled |
| review-fix.yml | Inline typecheck+test+E2E | None (one-shot) | No retry, no lint/bundle, missing metro |
| test.yml | typecheck+bundle+test | 3x @claude comment | Different retry mechanism |
| e2e-smoke.yml | E2E (3 projects) | 3x @claude comment | Different retry mechanism |
| release.yml | Inline typecheck+test+E2E+bundle | None | No retry at all |

## Proposed: `verify-and-fix.yml` reusable workflow

A single reusable workflow (`workflow_call`) that runs quality checks and optionally retries with Claude.

### Interface

```yaml
on:
  workflow_call:
    inputs:
      branch:
        description: Branch to verify
        required: true
        type: string
      issue_number:
        description: Issue/PR number for comments
        required: true
        type: string
      checks:
        description: 'Which checks to run: "all", "ci", "e2e"'
        required: false
        type: string
        default: 'all'
      fix_enabled:
        description: Enable Claude auto-fix on failure
        required: false
        type: boolean
        default: false
      max_fix_attempts:
        description: Max fix attempts (0 = no retry)
        required: false
        type: number
        default: 0
      fix_context:
        description: Additional context for fix prompt (e.g., review feedback)
        required: false
        type: string
        default: ''
      push_on_pass:
        description: Push branch after all checks pass
        required: false
        type: boolean
        default: false
      target_branch:
        description: Branch to push/merge into (if push_on_pass)
        required: false
        type: string
        default: ''
    outputs:
      pass:
        description: 'true if all checks passed'
        value: ${{ jobs.verify.outputs.pass }}
      attempt:
        description: Which attempt passed/failed
        value: ${{ jobs.verify.outputs.attempt }}
```

### Jobs

```
verify → (pass) → done / push
       → (fail + fix_enabled + attempt < max) → fix → verify (re-dispatch self)
       → (fail + no fix / max reached) → notify failure
```

### Check modes

| Mode | Checks |
|------|--------|
| `all` | lint (changed files) + typecheck + bundle + test + E2E + native deps |
| `ci` | typecheck + bundle + test (what test.yml runs today) |
| `e2e` | E2E only (what e2e-smoke.yml runs today) |

### Callers after migration

| Current Workflow | New Call |
|-----------------|---------|
| verify-merge.yml verify+fix jobs | `verify-and-fix.yml` with `fix_enabled: true, max_fix_attempts: 6, push_on_pass: true` |
| review-fix.yml verify step | `verify-and-fix.yml` with `fix_enabled: true, max_fix_attempts: 3, push_on_pass: true` |
| test.yml | `verify-and-fix.yml` with `checks: "ci", fix_enabled: true, max_fix_attempts: 3` |
| e2e-smoke.yml | `verify-and-fix.yml` with `checks: "e2e", fix_enabled: true, max_fix_attempts: 3` |
| release.yml | `verify-and-fix.yml` with `checks: "all"` (no fix, just gate) |

### Migration plan

Phase 1: Create the reusable workflow
- Extract verify job from verify-merge.yml into verify-and-fix.yml
- Use verify-checks.sh for the check logic (already exists)
- Add E2E checks (install browsers, webpack, playwright)
- Add fix job with Claude (extract from verify-merge.yml fix job)
- Add self-dispatch retry loop

Phase 2: Migrate callers one at a time
- review-fix.yml first (highest value — adds retry it doesn't have)
- verify-merge.yml second (reduces its complexity significantly)
- test.yml + e2e-smoke.yml third (unifies CI failure → fix flow)
- release.yml last (just uses verify, no fix)

### Key constraints

- Reusable workflows (`workflow_call`) can't dispatch themselves directly.
  Need a wrapper or use a dispatch-based retry pattern.
- Secrets can't be passed to reusable workflows by name — must use
  `secrets: inherit` or explicit secret mapping.
- Reusable workflows share the caller's GITHUB_TOKEN permissions.
