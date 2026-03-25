# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- `__tests__/components/ui/AccommodationAutocomplete.test.tsx` — tests expect "Powered by Google" but component renders "Powered by Apple Maps" (audit-2026-03-25)
- `__tests__/components/forms/FormField.test.tsx` — 3 tests failing (pre-existing on master) (audit-2026-03-25)
- `src/hooks/useLegFormHelpers.ts` and `src/hooks/useLegFormTypes.ts` not exported from `src/hooks/index.ts` barrel (audit-2026-03-25)
- `src/screens/trips/TripListScreen/TripListScreen.tsx` — 542 lines (over 500 limit), 5 useState calls. Extract search/filter state to `useTripList` hook. (audit-2026-03-25)
- `src/app/navigation/MainTabNavigator.tsx` — 520 lines (over 500 limit) (audit-2026-03-25)

## Knowledge updates

(No current knowledge gaps)

## Drift

- `.knowledge/patterns/README.md` references `.knowledge/patterns/add-X.md` which doesn't exist — update to actual pattern names (audit-2026-03-25)
