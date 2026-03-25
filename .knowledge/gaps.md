# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- `src/hooks/useTripCreation.ts` at 516 lines — exceeds 500-line limit. Candidates for extraction: `handleSmartImport`, `handleScanSuccess` into a separate `useTripCreationImport` hook. (#746)

## Knowledge updates

(No current knowledge gaps)

## Drift

(No current drift issues)
