# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage: 1 screen (WatermelonDB models untestable without native module setup). Screen functional tests complete: ExportBackupModal (#980), RestoreBackupModal (#980), TemplatesScreen (#981), LegFormScreen (#981). Service test coverage complete — submission (#964), schema (#965), storage/keychain (#966), and forms (#967) now covered. Stores and utils coverage added in #958. All automation service modules now have test coverage (#973, #974, #975). Test: track via test-suite skill runs.
- Audit incorrectly flagged `formatDate` and `isPassportExpiringSoon` in `useProfileScreen.ts` as dead — they are used by `ProfileScreen.tsx`. Kept as-is. (audit-2026-03-26, resolved #1014)
- Missing test coverage for store slices: `formStoreAutoFillSlice.ts`, `formStoreMemorySlice.ts`, `formStoreValidationSlice.ts`, `tripStoreLegSlice.ts`, `tripStoreLoadingSlice.ts`, `tripStoreQRSlice.ts`. Test: add dedicated slice tests. (audit-2026-03-26)
- Missing test coverage for utils: `animations.ts`, `colors.ts`, `constants.ts`, `imageUtils.ts`, `logger.ts`. Test: add unit tests. (audit-2026-03-26)

- 16 hooks still return >10 top-level keys (allowlisted in `__tests__/structure/hook-return-limit.test.ts`): useAddQR, useBugReport, useEditTrip, useFeedback, useHelpScreen, useLegForm, useMRZScanner, usePortalAutoLogin, useProfileScreen, useQRWallet, useReviewImport, useSettings, useSubmissionGuide, useTripCreation, useTripDetailModals, useTripList. Each needs a story to group return values. Test: structural test catches new violations; stale-entry test catches fixed hooks not removed from allowlist. (#1013)

## Knowledge updates

- `.knowledge/policies/ui/styling.md` already had icon color and CountryFlag exceptions — audit flagged as missing but they were present. (audit-2026-03-26, resolved #1015)

## Drift
