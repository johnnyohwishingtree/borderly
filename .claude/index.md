# .claude/ System Index

Read this file first. It maps every artifact in the pipeline system. Only read individual files when you need their full content.

## Rules (auto-loaded every session)

| File | Constraint |
|------|-----------|
| `rules/bug-fix-workflow.md` | Write a failing test before fixing any bug |
| `rules/commit-gate.md` | Run lint + typecheck + tests before every commit |
| `rules/file-size-limits.md` | Keep source files under 500 lines; split when exceeded |
| `rules/fix-strategy.md` | Fix one file at a time; re-check after each fix |
| `rules/hook-extraction.md` | Extract business logic from screens into custom hooks |
| `rules/no-snapshot-files.md` | Use inline snapshots, not .snap files |
| `rules/output-location.md` | All output must be inside the project root |
| `rules/service-facade.md` | Use facade pattern when coordinating 4+ services |
| `rules/smart-components.md` | Use smart components (AccommodationAutocomplete, AddressAutocomplete) instead of plain Input |
| `rules/store-boundaries.md` | Screens -> Hooks -> Stores -> Services dependency direction |

## Templates + Rubric Pairs

| Template | Rubric | What it structures |
|----------|--------|--------------------|
| `templates/module.md` | `rubrics/code-quality.md` | TypeScript source modules |
| `templates/test.md` | `rubrics/test-quality.md` | Test files |
| `templates/skill.md` | `rubrics/skill-quality.md` | Skill definitions |
| `templates/epic.md` | -- | Epic issues |
| `templates/story.md` | -- | Story issues |

## Patterns

See `patterns/README.md` for the full pattern system. Patterns are added as recurring change types emerge.

## Skills

| Skill | Purpose | Invocation |
|-------|---------|------------|
| `skills/pipeline/` | Autonomous story loop — merge, implement, verify, plan | `/pipeline` |
| `skills/epic-planner/` | Break a goal into Epic + Story GitHub Issues | `/epic-planner` |
| `skills/plan-feature/` | Plan and implement a new feature | `/plan-feature` |
| `skills/test-suite/` | Find and fix test coverage gaps | `/test-suite` |
| `skills/review-pr/` | Comprehensive PR code review | `/review-pr` |
| `skills/capture-screens/` | Capture screenshots + generate manifest | `/capture-screens` |
| `skills/visual-audit/` | Audit UI/UX using screenshots (read-only) | `/visual-audit` |
| `skills/visual-implement/` | Apply UI fixes from audit, re-capture to verify | `/visual-implement` |
| `skills/ux-review/` | Evaluate user journeys and flow efficiency | `/ux-review` |
| `skills/ux-implement/` | Implement flow-level UX changes | `/ux-implement` |
| `skills/qa/` | Walk through app, document bugs | `/qa` |
| `skills/refactor-design/` | Audit and fix architecture issues | `/refactor-design` |
| `skills/update-architecture/` | Update architecture diagrams and docs | `/update-architecture` |
| `skills/organize/` | Reorganize file structure | `/organize` |
| `skills/cleanup/` | Remove unused files | `/cleanup` |
| `skills/local-feature/` | Develop feature in isolated worktree | `/local-feature` |

## CI (GitHub Actions — event-driven, not pipeline)

| Workflow | Trigger | What it checks |
|----------|---------|---------------|
| `test.yml` | push, PR | Typecheck, Metro bundle, unit tests |
| `e2e-smoke.yml` | push, PR | Playwright E2E (Chromium shards, performance, cross-browser) |
| `build-ios.yml` | push to master (ios/) | iOS native build |
| `build-android.yml` | push to master | Android debug build |
| `release.yml` | tags | Release automation |
