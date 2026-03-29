# Policy: Learning

## Scope
All skills that implement features, fix bugs, or write tests.

## Rules
- REQUIRE: PRs with 5+ files changed must include a knowledge update OR an explicit "No new knowledge: <reason>" in the PR body
- REQUIRE: bug fixes add the root cause to the relevant policy's Anti-patterns section
- REQUIRE: new architectural concepts (App Groups, extensions, import pipelines) create or update a model
- REQUIRE: non-obvious test workarounds (OOM fixes, mock patterns, timing) get added to `policies/testing/test-conventions.md`
- REQUIRE: hook extractions that establish a pattern update `policies/state/hook-conventions.md`
- DENY: closing a story without checking if any `.knowledge/` file was rendered stale
- DENY: writing 10+ test files without capturing testing patterns learned
- DENY: shipping a feature with new architecture but no model

## What to Capture
After completing work, check each category:

1. **Anti-patterns** — Did a wrong approach teach you something? → Add to relevant policy
2. **Constraints** — Did you discover an undocumented rule? → Create a policy with ENFORCEMENT
3. **Business logic** — New entities or relationships? → Create/update a model
4. **Testing patterns** — Non-obvious workaround? → Add to test-conventions anti-patterns
5. **Directory conventions** — Worked in a dir without CLAUDE.md? → Create one
6. **Stale knowledge** — Did a `.knowledge/` file give wrong guidance? → Update it
7. **Beliefs** — Was a belief confirmed or contradicted? → Update status and evidence

## What Counts as a Knowledge Update
- Adding an anti-pattern to an existing policy
- Creating a new policy with structural test
- Updating a model when entities/relationships changed
- Adding to gaps.md with a test strategy
- Creating a folder CLAUDE.md
- Updating index.md when files were added/moved

## What Does NOT Count
- Only removing resolved gaps.md entries
- Reformatting existing knowledge files
- Adding comments to code

## Exceptions
- Mechanical fixes (lint, typo, dependency bump) — no knowledge needed
- Stories that only modify test files (the tests ARE the knowledge)
- PRs with fewer than 5 files changed AND no new patterns

## Anti-patterns
- Pipeline writes 50 tests but captures zero testing patterns
- Pipeline extracts 15 hooks but doesn't document the extraction pattern
- Pipeline fixes 8 E2E failures but doesn't update drift-detection knowledge
- "No gaps = knowledge graph is working well" used as excuse to skip learning

## Enforcement
Checked by `/code-audit` skill — flags PRs with high file count but no knowledge updates

## Context
Enforced by structural test. See test file for justification.
