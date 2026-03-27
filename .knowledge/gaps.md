# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- ~250 inline `testID="..."` strings across screens and components instead of importing from `testIDs.ts` files — violates e2e-testability policy DENY "inline testID strings". 12 `testIDs.ts` files exist but are unused. Fix: refactor each screen/component to import testID constants from their co-located `testIDs.ts`. Test: `__tests__/structure/component-testids.test.ts`. (code-audit-2026-03-27)
- ~50 `style={{}}` usages for static Tailwind-expressible values (margins, padding, opacity, gap) across ~20 files — violates styling policy DENY "`style={{}}` for static Tailwind-expressible values". Worst offender: `PortalSubmissionScreen.tsx` (25+ inline styles). Fix: replace with NativeWind className equivalents (`mr-2`, `mr-3`, `ml-2`, `gap-2`, `opacity-60`). Test: `__tests__/structure/no-inline-style.test.ts`. (code-audit-2026-03-27)
- 6 direct MMKV imports in `src/services/performance/` (`productionProfiler.ts`, `alerting.ts`, `profilerHelpers.ts`, `metricsStorage.ts`, `regressionDetection.ts`, `userFlowAnalytics.ts`) — violates storage-tiers policy DENY "direct react-native-mmkv imports outside src/services/storage/". Fix: import from `@/services/storage/mmkv` instead. Test: `__tests__/structure/pii-boundary.test.ts`. (code-audit-2026-03-27)
- 2 components import hooks with store side effects: `AccountSetupChecklist.tsx` imports `useAccountSetup` (accesses store), `LegFormSection.tsx` imports `usePassportValidity` (accesses store) — violates dependency-direction policy DENY "components → hooks with side effects". Fix: pass store data as props from parent screen. Test: `__tests__/structure/dependency-direction.test.ts`. (code-audit-2026-03-27)
- `__tests__/integration/autoFillPipeline.test.ts:463` uses `toMatchSnapshot()` — violates test-conventions policy DENY "`toMatchSnapshot()`". Fix: replace with explicit assertion on expected values. Test: grep for `toMatchSnapshot`. (code-audit-2026-03-27)

## Drift

- Maestro flow `demo-scan-smoke.yaml` references `id: "trip-name-input"` but source uses `testID="trip-name-field"` (`CreateTripScreen.tsx:65`). Fix: update screenRegistry and regenerate flows. Test: `__tests__/structure/maestro-registry-sync.test.ts`. (code-audit-2026-03-27)
- Maestro flow `demo-scan-smoke.yaml` references `id: "demo-scan-adult"` but source uses `testID="demo-scan-adult-button"` (`PassportScanScreen.tsx:178`). Fix: update screenRegistry and regenerate flows. Test: `__tests__/structure/maestro-registry-sync.test.ts`. (code-audit-2026-03-27)
