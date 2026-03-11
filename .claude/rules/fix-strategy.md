# Fix Strategy

When fixing typecheck or test errors:

1. Fix ONE FILE AT A TIME
2. After each file, run `pnpm typecheck` to confirm you didn't introduce new errors
3. If new errors appeared from your fix, fix those first before moving on
4. Only move to the next file when the error count is equal or fewer than before

When fixing test failures:

1. Run `pnpm test` to see all failures
2. Fix tests one at a time
3. After each fix, run BOTH `pnpm typecheck` AND `pnpm test`
4. Never fix a test in a way that breaks typecheck

Do NOT use `any` types to suppress errors — fix the root cause.
Do NOT leave unused variables or imports — delete them.
