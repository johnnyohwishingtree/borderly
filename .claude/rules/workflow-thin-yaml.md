# Workflow YAML: Thin Orchestration Only

These workflows have had their logic extracted into testable TypeScript modules. **Do NOT add business logic back into the YAML.** The YAML is a thin orchestration layer that calls CLI commands.

| Workflow | TypeScript module | CLI commands |
|----------|------------------|-------------|
| `watcher.yml` | `lib/watcher.ts` | `watcher-run` |
| `pipeline-doctor.yml` | `lib/doctor.ts` | `doctor-collect-evidence`, `doctor-reproduce` |
| `review-guardian.yml` | `lib/review-guardian.ts` | `guardian-bot-review`, `guardian-post-wait`, `guardian-claude-review`, `guardian-ensure-review` |
| `test.yml` / `e2e-smoke.yml` | `lib/ci-dispatch.ts` | `ci-dispatch-pr`, `ci-dispatch-master` |

## Rules

1. **No new `gh` or `git` commands in run: blocks** for these workflows. Use the pipeline CLI or add a new function to the TypeScript module.

2. **Max inline shell lines**: `watcher.yml` (5 lines), `pipeline-doctor.yml` (10 lines) per `run:` block. Enforced by `workflow-structure.test.ts`.

3. **Adding new logic?** Put it in the TypeScript module → add tests → add a CLI command → call from YAML.

4. **Why?** Shell in YAML is untestable. TypeScript modules have 83+ vitest tests that catch regressions instantly.
