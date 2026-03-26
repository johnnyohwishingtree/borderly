# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage for utils: `constants.ts`, `logger.ts` — minimal logic, excluded from #1016. (audit-2026-03-26)
- 16 hooks still return >10 top-level keys (allowlisted in `__tests__/structure/hook-return-limit.test.ts`): useAddQR, useBugReport, useEditTrip, useFeedback, useHelpScreen, useLegForm, useMRZScanner, usePortalAutoLogin, useProfileScreen, useQRWallet, useReviewImport, useSettings, useSubmissionGuide, useTripCreation, useTripDetailModals, useTripList. Each needs a story to group return values. Test: structural test catches new violations; stale-entry test catches fixed hooks not removed from allowlist. (#1013)
