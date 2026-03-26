# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage: 5 screens. Service test coverage complete — submission (#964), schema (#965), storage/keychain (#966), and forms (#967) now covered. WatermelonDB models/database untestable without native module setup. Stores and utils coverage added in #958. Automation detection/utility modules (dataTransformer, errorHandling, elementUtils, selectorBuilder, automationPatterns, performanceMonitor, detectionHelpers) now covered in #973. Automation interaction/filler modules (domInteraction, interactionScripts, fillStrategies) now covered in #974. Automation navigation/upload modules (navigationScripts, uploadHandler, uploadScripts) now covered in #975. All automation service modules now have test coverage. Test: track via test-suite skill runs. (audit-2026-03-26)

## Knowledge updates

## Drift
