# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- E2E `addCompanions.spec.ts` — AddCompanionsScreen text changed but E2E assertion not updated. Test: update assertion to match current UI text. (audit-2026-03-25)
- E2E `leg-form-action-buttons` — 2 tests fail: "Save Progress" button visibility assertions broken after LegForm button refactor (#821). Test: update testIDs/assertions to match new button layout. (audit-2026-03-25)
- E2E `trip-detail` — traveler avatar assertions fail after per-traveler progress feature (#781). Test: update assertions for new traveler UI. (audit-2026-03-25)
- E2E `trip-list` — deadline badge assertion fails after deadline summary feature (#786). Test: update assertions for new deadline UI. (audit-2026-03-25)

## Knowledge updates

(No current knowledge gaps)

## Drift
