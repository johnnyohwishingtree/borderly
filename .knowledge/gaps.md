# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- `src/components/submission/ProfileSelector.tsx` uses 12 hardcoded hex colors in StyleSheet — replace with NativeWind tokens. Test: inline-styles structural test already covers this. (audit-2026-03-26)
- `src/components/submission/AutoFillPill.tsx` uses 8 hardcoded hex colors in StyleSheet — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/submission/QRSaveOverlay.tsx` uses 26 inline hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/submission/AutoFillBanner.tsx` uses 18 inline hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/submission/PortalWebView.tsx` uses 5 inline hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/submission/CredentialPrompt.tsx` uses hardcoded `placeholderTextColor="#9CA3AF"` — replace with NativeWind token. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/ui/Tooltip.tsx` uses 6 hardcoded hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/ui/PullToRefresh.tsx` uses 8 hardcoded hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/ui/LoadingSpinner.tsx` uses 1 hardcoded hex color — replace with NativeWind token. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/ui/HelpHint.tsx` uses 2 hardcoded hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- `src/components/help/SearchableHelp.tsx` uses 2 non-icon hex colors — replace with NativeWind tokens. Test: inline-styles structural test. (audit-2026-03-26)
- Missing test coverage: 10 store files, 14 utils files, 5 screens, 70 services have no corresponding test files. Test: track via test-suite skill runs. (audit-2026-03-26)

## Knowledge updates

- `.knowledge/index.md` lists `domain/countries/ (15 countries)` under Models but those files live at `.knowledge/domain/countries/`, not `.knowledge/models/domain/countries/`. Fix: update index to clarify the path. (audit-2026-03-26)

## Drift
