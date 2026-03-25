# System Index

Read this first. Maps every artifact in the pipeline system.

## .claude/ (read-only — human edits only)

### Rules (auto-loaded every session)

| File | Constraint |
|------|-----------|
| `rules/bug-fix-workflow.md` | Write a failing test before fixing any bug |
| `rules/commit-gate.md` | Run lint + typecheck + tests before every commit |
| `rules/file-size-limits.md` | Keep source files under 500 lines |
| `rules/fix-strategy.md` | Fix one file at a time; re-check after each fix |
| `rules/no-snapshot-files.md` | Use inline snapshots, not .snap files |
| `rules/output-location.md` | All output must be inside the project root |

### Skills

| Skill | Purpose | Invocation |
|-------|---------|------------|
| `skills/pipeline/` | Autonomous story loop — implement, verify, learn, merge, plan | `/pipeline` |
| `skills/audit/` | Codebase health audit — drift, dead code, gaps | `/audit` |
| `skills/optimize/` | Resolve gaps in knowledge graph, compress bloated files | `/optimize` |
| `skills/epic-planner/` | Break a goal into Epic + Stories | `/epic-planner` |
| `skills/capture-screens/` | Capture screenshots + generate manifest | `/capture-screens` |
| `skills/visual-audit/` | Audit UI/UX using screenshots | `/visual-audit` |
| `skills/visual-implement/` | Apply UI fixes from audit | `/visual-implement` |
| `skills/ux-review/` | Evaluate user journeys and flow efficiency | `/ux-review` |
| `skills/ux-implement/` | Implement flow-level UX changes | `/ux-implement` |
| `skills/qa/` | Walk through app, document bugs | `/qa` |
| `skills/test-suite/` | Find and fix test coverage gaps | `/test-suite` |
| `skills/plan-feature/` | Plan and implement a new feature | `/plan-feature` |
| `skills/refactor-design/` | Audit and fix architecture issues | `/refactor-design` |
| `skills/update-architecture/` | Update architecture diagrams | `/update-architecture` |
| `skills/organize/` | Reorganize file structure | `/organize` |
| `skills/cleanup/` | Remove unused files | `/cleanup` |
| `skills/local-feature/` | Develop feature in isolated worktree | `/local-feature` |

## .knowledge/ (read-write — pipeline edits freely)

| Directory | What it contains |
|-----------|-----------------|
| `concepts/` | local-first, security-boundary, dependency-direction, drift-detection |
| `conventions/` | testing, styling, storage, navigation, state-management, native-modules, typography, motion, ux-writing, accessibility/ |
| `domain/` | passport, form-engine, submission-guide, qr-wallet, countries/ |
| `templates/` | module, test, story, epic, skill, folder-claude-md |
| `patterns/` | add-country, add-screen, add-native-dep |
| `rubrics/` | code-quality, test-quality, skill-quality |

Gaps found by /audit or /pipeline are written to `.knowledge/gaps.md`. Fix stories remove entries when resolved. /optimize resolves knowledge gaps and creates stories for code fixes.

## Folder-level CLAUDE.md files

Short pointers (max 5 lines) in source directories. Auto-loaded by Claude Code. Point to `.knowledge/` files.
