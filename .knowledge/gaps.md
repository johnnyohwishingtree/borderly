# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- E2E `trip-list` — deadline badge assertion fails after deadline summary feature (#786). Test: update assertions for new deadline UI. (audit-2026-03-25)

## Knowledge updates

(No current knowledge gaps)

## Drift
