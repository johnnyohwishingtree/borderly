# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- `pnpm lint` has 16 pre-existing errors: 10x `localStorage` not defined in `e2e/mocks/localStorage.ts`, 2x unused vars in E2E helpers, 2x exhaustive-deps in `src/hooks/useTravelerFormManager.ts`, 1x unused var in `src/screens/trips/TripListScreen/TripListScreen.tsx` (`_` param), 1x unused var in E2E page object. Fix: suppress localStorage errors with `/* eslint-env browser */`, remove unused vars, add missing deps. (#902)

## Knowledge updates

(No current knowledge gaps)

## Drift
