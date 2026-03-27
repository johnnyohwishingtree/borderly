# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Not a code issue.
- 2 components import hooks with store side effects: `AccountSetupChecklist.tsx` imports `useAccountSetup`, `LegFormSection.tsx` imports `usePassportValidity` — needs refactor to pass data as props. (code-audit-2026-03-27)
- ~108 inline `testID="..."` strings remain in component files without testIDs.ts — follow-up from #1111. (code-audit-2026-03-27)

## Drift

(none)
