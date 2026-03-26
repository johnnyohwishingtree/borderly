# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.

## Knowledge updates

- `.knowledge/policies/testing/test-conventions.md` missing guidance on Modal visibility testing — RN `Modal` renders children even when `visible={false}` in RNTL. Use `UNSAFE_getByType(Modal).props.visible` to assert visibility, not `queryByText`. Test: check component tests for `queryByText(...).toBeNull()` on Modal-wrapped content. (#939)

## Drift
