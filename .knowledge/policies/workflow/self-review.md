# Policy: Self-Review

## Scope
All skills that commit code changes.

## Rules
- REQUIRE: review your diff before committing — check architecture, testing, code style, error handling
- REQUIRE: source changes — correct dependency direction, no unused code, types not `any`
- REQUIRE: test changes — meaningful assertions, no render-only tests, proper isolation
- REQUIRE: skill changes — prerequisites, sequential steps, guardrails present

## Fix Immediately (don't commit until resolved)
- `any` types — find the real type
- Unused imports or variables — delete them
- Empty catch blocks — add error handling
- Missing tests for new exported functions — write them
- Functions over 50 lines — split them
- Anti-patterns listed in the relevant `.knowledge/policies/` files

## Add to gaps.md (needs human input)
- Architectural questions about where code belongs
- Unclear requirements that led to guesswork
- Convention gaps discovered during review

## After Fixing
Re-run verification (`policies/workflow/verification.md`) to confirm fixes don't break anything.

## Exceptions
- Context-only changes (.context/) don't need code review
- Automated fixes from linters (already machine-verified)

## Anti-patterns
- Committing without reviewing the diff
- Reviewing but not fixing issues found ("I'll fix it later")
- Only checking code quality but not test quality

## Enforcement
Built into pipeline Step 6 and local-pipeline Step 6

## Context
Enforced by structural test. See test file for justification.
