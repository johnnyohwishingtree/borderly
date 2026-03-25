# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — 249 of 260 tests failing on master (pre-existing). Likely environment/config issue with Playwright web mocks or webpack config. Needs investigation.
- `src/screens/trips/TripListScreen/TripListScreen.tsx` — 542 lines (over 500 limit), 5 useState calls. Extract search/filter state to `useTripList` hook. (audit-2026-03-25)
- `src/app/navigation/MainTabNavigator.tsx` — 520 lines (over 500 limit) (audit-2026-03-25)

## Knowledge updates

(No current knowledge gaps)

## Drift

