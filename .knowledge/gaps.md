# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Not a code issue.
- ~250 inline `testID="..."` strings across screens — story #1111. (code-audit-2026-03-27)
- ~50 `style={{}}` usages for static Tailwind-expressible values — story #1112. (code-audit-2026-03-27)
- 2 components import hooks with store side effects: `AccountSetupChecklist.tsx` imports `useAccountSetup`, `LegFormSection.tsx` imports `usePassportValidity` — needs refactor to pass data as props. (code-audit-2026-03-27)

## Drift

- Maestro flows reference testIDs with old naming — story #1111. (code-audit-2026-03-27)
- Maestro flows reference sub-testIDs that don't exist in source — story #1083. (code-audit-2026-03-27)
