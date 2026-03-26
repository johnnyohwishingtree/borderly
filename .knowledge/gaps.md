# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage: 1 screen (WatermelonDB models untestable without native module setup). Screen functional tests complete: ExportBackupModal (#980), RestoreBackupModal (#980), TemplatesScreen (#981), LegFormScreen (#981). Service test coverage complete — submission (#964), schema (#965), storage/keychain (#966), and forms (#967) now covered. Stores and utils coverage added in #958. All automation service modules now have test coverage (#973, #974, #975). Test: track via test-suite skill runs.

## Knowledge updates

## Drift
