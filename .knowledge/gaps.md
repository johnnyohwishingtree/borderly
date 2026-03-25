# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

### Screens with too many useState (candidates for hook extraction)
- `src/screens/wallet/AddQRScreen/AddQRScreen.tsx` — 9 useState calls (audit-2026-03-24) → #753
- `src/screens/support/BugReportScreen/BugReportScreen.tsx` — 9 useState calls (audit-2026-03-24) → #753
- `src/screens/wallet/QRWalletScreen/QRWalletScreen.tsx` — 8 useState calls (audit-2026-03-24) → #753
- `src/screens/settings/SettingsScreen/SettingsScreen.tsx` — 7 useState calls (audit-2026-03-24) → #753
- `src/screens/support/FeedbackScreen/FeedbackScreen.tsx` — 6 useState calls (audit-2026-03-24) → #753
- `src/screens/trips/TemplatesScreen/TemplatesScreen.tsx` — 6 useState calls (audit-2026-03-24)

### Files over 500 lines (need splitting)
- `src/screens/settings/SettingsScreen/SettingsScreen.tsx` — 920 lines (audit-2026-03-24) → #753
- `src/screens/wallet/AddQRScreen/AddQRScreen.tsx` — 580 lines (audit-2026-03-24) → #753
- `src/screens/wallet/QRWalletScreen/QRWalletScreen.tsx` — 553 lines (audit-2026-03-24) → #753

## Knowledge updates

(No current knowledge updates needed)

## Drift

(No current drift issues)
