# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- `src/hooks/useTripCreation.ts` at 516 lines — exceeds 500-line limit. Candidates for extraction: `handleSmartImport`, `handleScanSuccess` into a separate `useTripCreationImport` hook. (#746)

## Knowledge updates

- `.knowledge/domain/form-engine.md` missing guidance on traveler assignment model — travelers are assigned per-leg (`TripLeg.assignedTravelers`), not per-trip. Story #742 template assumed `Trip.travelers` field exists but it doesn't. (#742)

## Drift

(No current drift issues)
