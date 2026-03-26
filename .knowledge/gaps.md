# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.

## Knowledge updates

- `.knowledge/policies/testing/test-conventions.md` missing guidance on stable mock references for React Navigation hooks — `useNavigation` mock must return a module-level constant, not a new object per call, or hooks with `navigation` in dep arrays cause infinite re-render loops. Test: check screen tests for `useNavigation: () => ({` pattern (should use stored const). (#911)

## Drift
