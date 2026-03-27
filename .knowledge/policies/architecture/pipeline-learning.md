# Policy: Pipeline Learning

## Scope
.claude/skills/pipeline/, .claude/skills/local-pipeline/, .knowledge/

## Rules
- REQUIRE: PRs with 5+ files changed must include a knowledge update OR an explicit "no new knowledge" comment in the PR body explaining why
- REQUIRE: bug fixes update the relevant policy's Anti-patterns section with what went wrong
- REQUIRE: new patterns discovered during implementation get captured — if you solved a non-trivial problem, document the solution
- REQUIRE: when a test was hard to write (OOM, mock issues, timing), add the workaround to test-conventions.md Anti-patterns
- REQUIRE: new features that introduce architectural concepts (App Groups, credential providers, import pipelines) create or update a model in `.knowledge/models/`
- REQUIRE: hook extractions that establish a pattern (return value grouping, naming) update hook-conventions.md
- DENY: closing a story without checking if any `.knowledge/` file was rendered stale by the changes
- DENY: creating 10+ test files without capturing testing patterns learned

## What Counts as a Knowledge Update
- Adding an anti-pattern to an existing policy (learned from a bug or failed approach)
- Creating a new policy when a constraint was discovered
- Updating a model when entities/relationships changed
- Adding to gaps.md with a test strategy when guidance was missing
- Creating a folder CLAUDE.md for a directory you worked in
- Updating index.md when files were added/moved

## What Does NOT Count
- Only updating gaps.md entries (removing resolved items)
- Reformatting or trimming existing knowledge files
- Adding comments to code (that's not knowledge graph)

## Exceptions
- Mechanical fixes (lint, typo, dependency bump) — no knowledge needed
- Stories that only modify test files (the tests ARE the knowledge)
- Stories with fewer than 5 files changed AND no new patterns

## Anti-patterns
- Pipeline writes 50 tests but captures zero testing patterns
- Pipeline extracts 15 hooks but doesn't document the extraction pattern
- Pipeline fixes 8 E2E failures but doesn't update drift-detection knowledge
- Pipeline ships a feature with new architecture (App Groups, extensions) but creates no model
- "No gaps = knowledge graph is working well" used as excuse to skip learning

## Enforcement
`__tests__/structure/pipeline-learning-audit.test.ts` — checks recent PRs for knowledge/code ratio
