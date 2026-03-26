# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage: 1 screen (WatermelonDB models untestable without native module setup). Screen functional tests complete: ExportBackupModal (#980), RestoreBackupModal (#980), TemplatesScreen (#981), LegFormScreen (#981). Service test coverage complete — submission (#964), schema (#965), storage/keychain (#966), and forms (#967) now covered. Stores and utils coverage added in #958. All automation service modules now have test coverage (#973, #974, #975). Test: track via test-suite skill runs.
- Dead exports in `src/utils/accessibility.ts`: `AccessibilityValueHelpers`, `AccessibilityTestUtils`, `defaultAccessibilityContext` — never imported. Remove or use. Test: lint rule for unused exports. (audit-2026-03-26)
- Dead exports in `src/utils/validation/commonValidators.ts`: `validateLength`, `validateRange`, `validateCurrencyAmount`, `sanitizeFormInput` — never imported. Remove or use. Test: lint rule for unused exports. (audit-2026-03-26)
- Dead export `validateAddress` in `src/utils/validation/addressValidators.ts` — never imported. (audit-2026-03-26)
- Dead exports in `src/utils/appStoreCompliance/index.ts`: `complianceUtils`, `defaultComplianceValidator` — never imported. (audit-2026-03-26)
- Dead exports in `src/hooks/useEditProfile.ts`: `validateEmail`, `validatePhoneNumber` — never imported outside the file. (audit-2026-03-26)
- Dead exports in `src/hooks/useProfileScreen.ts`: `formatDate`, `isPassportExpiringSoon` — never imported. (audit-2026-03-26)
- Dead export `formatQRDate` in `src/hooks/useQRDetail.ts` — only used in tests. (audit-2026-03-26)
- Missing test coverage for store slices: `formStoreAutoFillSlice.ts`, `formStoreMemorySlice.ts`, `formStoreValidationSlice.ts`, `tripStoreLegSlice.ts`, `tripStoreLoadingSlice.ts`, `tripStoreQRSlice.ts`. Test: add dedicated slice tests. (audit-2026-03-26)
- Missing test coverage for utils: `animations.ts`, `colors.ts`, `constants.ts`, `imageUtils.ts`, `logger.ts`. Test: add unit tests. (audit-2026-03-26)
- 17 of 19 folder CLAUDE.md files exceed the 5-line max (template says "Maximum 5 lines"). Most are 7-8 lines with multiple See: links. Trim to pointer-only format per `.knowledge/templates/folder-claude-md.md`. (audit-2026-03-26)

## Knowledge updates

- `.knowledge/models/form-engine.md` line 55 references `src/services/forms/formEngine.ts` — actual path is `src/services/forms/formEngine/formEngine.ts`. Line 58 references `src/services/forms/validators.ts` — actual path is `src/services/forms/validators/validators.ts`. Update to reflect folder structure. (audit-2026-03-26)
- `.knowledge/policies/ui/styling.md` should add exception for icon `color` props (react-native-vector-icons requires hex string) and `CountryFlag.tsx` flag rendering (inherently static color data). 80+ component files use hardcoded hex in icon color props — this is unavoidable in RN. (audit-2026-03-26)

## Drift

- `.knowledge/models/form-engine.md` key file paths are stale — `formEngine.ts` and `validators.ts` moved into subdirectories. (audit-2026-03-26)
