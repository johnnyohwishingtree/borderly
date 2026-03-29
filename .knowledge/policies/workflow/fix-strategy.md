# Policy: Fix Strategy

## Scope
All skills that modify source code to fix violations, bugs, or refactors.

## Rules

### Typecheck errors
- REQUIRE: fix one file at a time
- REQUIRE: run `pnpm typecheck` after each file
- REQUIRE: if new errors appeared from your fix, fix those first before moving on
- DENY: moving to the next file when error count increased
- DENY: using `any` types to suppress errors — fix the root cause

### Test failures
- REQUIRE: run `pnpm test` to see all failures
- REQUIRE: fix one test failure at a time
- REQUIRE: after each fix, run BOTH `pnpm typecheck` AND `pnpm test`
- DENY: fixing a test in a way that breaks typecheck

### Lint errors
- REQUIRE: run `pnpm lint` to see all failures
- REQUIRE: fix the errors reported
- REQUIRE: run `pnpm lint` again to confirm resolution

### General
- DENY: leaving unused variables or imports — delete them
- DENY: using `git add -A` or `git add .` — always add specific files

## Anti-patterns
- Fixing 10 files then running typecheck (cascade of errors)
- Suppressing errors with `// @ts-ignore` or `any`
- Fixing a test by weakening the assertion
- Moving on before confirming the fix didn't introduce new errors

## Enforcement
- Skills reference this policy when modifying code

## Context
Enforced by structural test. See test file for justification.
