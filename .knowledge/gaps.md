# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

### Screens with too many useState (candidates for hook extraction)
- `src/screens/trips/TripDetailScreen/TripDetailScreen.tsx` — 9 useState calls (audit-2026-03-24)
- `src/screens/wallet/AddQRScreen/AddQRScreen.tsx` — 9 useState calls (audit-2026-03-24)
- `src/screens/support/BugReportScreen/BugReportScreen.tsx` — 9 useState calls (audit-2026-03-24)
- `src/screens/wallet/QRWalletScreen/QRWalletScreen.tsx` — 8 useState calls (audit-2026-03-24)
- `src/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen.tsx` — 8 useState calls (audit-2026-03-24)
- `src/screens/settings/SettingsScreen/SettingsScreen.tsx` — 7 useState calls (audit-2026-03-24)
- `src/screens/support/FeedbackScreen/FeedbackScreen.tsx` — 6 useState calls (audit-2026-03-24)
- `src/screens/trips/TemplatesScreen/TemplatesScreen.tsx` — 6 useState calls (audit-2026-03-24)

### Files over 500 lines (need splitting)
- `src/screens/trips/TripDetailScreen/TripDetailScreen.tsx` — 937 lines (audit-2026-03-24)
- `src/screens/settings/SettingsScreen/SettingsScreen.tsx` — 920 lines (audit-2026-03-24)
- `src/utils/performanceOptimization.ts` — 856 lines (audit-2026-03-24)
- `src/services/performance/regressionDetection.ts` — 837 lines (audit-2026-03-24)
- `src/services/performance/userFlowAnalytics.ts` — 740 lines (audit-2026-03-24)
- `src/stores/useTripStore.ts` — 733 lines (audit-2026-03-24)
- `src/utils/portal/portalDetector.ts` — 729 lines (audit-2026-03-24)
- `src/services/monitoring/memoryLeakDetector.ts` — 725 lines (audit-2026-03-24)
- `src/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen.tsx` — 698 lines (audit-2026-03-24)
- `src/utils/testHelpers.ts` — 681 lines (audit-2026-03-24)
- `src/services/testing/complianceValidator.ts` — 668 lines (audit-2026-03-24)
- `src/services/performance/productionProfiler.ts` — 665 lines (audit-2026-03-24)
- `src/stores/useProfileStore.ts` — 663 lines (audit-2026-03-24)
- `src/services/monitoring/submissionAnalytics.ts` — 638 lines (audit-2026-03-24)
- `src/components/boarding/BoardingPassScanner.tsx` — 635 lines (audit-2026-03-24)
- `src/services/monitoring/alerting.ts` — 627 lines (audit-2026-03-24)
- `src/services/schemas/schemaValidator.ts` — 617 lines (audit-2026-03-24)
- `src/services/monitoring/portalMonitor.ts` — 589 lines (audit-2026-03-24)
- `src/screens/wallet/AddQRScreen/AddQRScreen.tsx` — 580 lines (audit-2026-03-24)
- `src/services/storage/keychain.ts` — 572 lines (audit-2026-03-24)
- `src/stores/useFormStore.ts` — 559 lines (audit-2026-03-24)
- `src/services/portal/portalIntegration.ts` — 557 lines (audit-2026-03-24)
- `src/hooks/useLegForm.ts` — 557 lines (audit-2026-03-24)
- `src/screens/wallet/QRWalletScreen/QRWalletScreen.tsx` — 553 lines (audit-2026-03-24)
- `src/services/testing/submissionTester.ts` — 547 lines (audit-2026-03-24)
- `src/services/passport/mrzScanner.ts` — 543 lines (audit-2026-03-24)
- `src/services/monitoring/performance.ts` — 530 lines (audit-2026-03-24)
- `src/utils/validationUtils.ts` — 528 lines (audit-2026-03-24)
- `src/services/security/dataLeakDetector.ts` — 518 lines (audit-2026-03-24)
- `src/components/passport/MRZScanner.tsx` — 516 lines (audit-2026-03-24)
- `src/hooks/useTripCreation.ts` — 513 lines (audit-2026-03-24)
- `src/services/schemas/schemaMigrator.ts` — 506 lines (audit-2026-03-24)

## Knowledge updates

(No current knowledge updates needed)

## Drift

(No current drift issues)
