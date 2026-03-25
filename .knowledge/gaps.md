# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

### Screens with too many useState (candidates for hook extraction)
- `src/screens/trips/TemplatesScreen/TemplatesScreen.tsx` — 6 useState calls (audit-2026-03-24)

### Files over 500 lines (need splitting)
(none currently)

### Pre-existing `any` types
- `src/hooks/useBugReport.ts` — `diagnosticInfo` state uses `any` type (carried over from original BugReportScreen, #753)

## Knowledge updates

(No current knowledge updates needed)

## Drift

(No current drift issues)
