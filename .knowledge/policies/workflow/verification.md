# Policy: Verification

## Scope
All skills that modify source code or tests.

## Rules
- REQUIRE: run checks in this order — `pnpm lint`, `pnpm typecheck`, `pnpm test`
- REQUIRE: if screen UI changed (testIDs, button text, navigation), also run `pnpm e2e` and update `e2e/mobile/full-e2e.test.ts` per `policies/testing/e2e-testability.md`
- REQUIRE: if checks fail, fix and rerun — up to 6 attempts
- REQUIRE: after 6 failed attempts, push WIP branch, create draft PR, stop
- DENY: spawning background processes to "wait and see" — run verification foreground
- DENY: retrying the same fix — if it failed once, try a different approach
- DENY: ignoring pre-existing failures — fix them or add to `gaps.md`

## Failure Discipline
- If you created a test, run it individually first before the full suite
- If a test OOMs or crashes, that's a bug in the test (likely unstable mock references or heavy imports) — fix it
- Clean up any processes you started before moving on

## Exceptions
- `/update-architecture` and `/capture-screens` only need `pnpm typecheck` (no code changes)
- Quick knowledge-only fixes (gaps.md, index.md) don't need verification

## Anti-patterns
- Running CI repeatedly to check if a code fix worked instead of writing a unit test
- Labeling test failures as "environment issues" instead of investigating
- Merging with known failures because "they're pre-existing"

## Enforcement
- `.claude/rules/commit-gate.md` — gate before every commit

## Derives From
- `facts/craft/fail-fast.md`
- `facts/craft/tests-are-specifications.md`
