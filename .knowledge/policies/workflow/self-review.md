# Policy: Self-Review

## Scope
All skills that commit code changes.

## Rules
- REQUIRE: review your diff against the relevant rubrics before committing
- REQUIRE: check `.knowledge/rubrics/code-quality.md` for source file changes
- REQUIRE: check `.knowledge/rubrics/test-quality.md` for test file changes
- REQUIRE: check `.knowledge/rubrics/skill-quality.md` for skill file changes

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
- Knowledge-only changes (gaps.md, index.md) don't need rubric review
- Automated fixes from linters (already machine-verified)

## Anti-patterns
- Committing without reviewing the diff
- Reviewing but not fixing issues found ("I'll fix it later")
- Only checking code quality but not test quality

## Enforcement
Built into pipeline Step 6 and local-pipeline Step 6

## Derives From
- `principles/knowledge-is-living-documentation.md`
- `facts/craft.md#f:craft:fail-fast`
- `facts/craft.md#f:craft:tests-are-specifications`
