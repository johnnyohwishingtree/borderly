# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage: 5 screens, services gap further reduced — submission (#964), schema (#965), and storage/keychain (#966) services now covered. WatermelonDB models/database untestable without native module setup. Stores and utils coverage added in #958. Test: track via test-suite skill runs. (audit-2026-03-26)

## Knowledge updates

## Drift
