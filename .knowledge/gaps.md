# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- E2E `portalSubmission.spec.ts:483` — `auto-login-failed-banner NOT shown on initial load` fails consistently on master. Unrelated to keychain changes. (#834)

## Knowledge updates

- AutoFill extension on-device testing requires a physical iOS device or simulator with Xcode. Integration tests verify field matching against all 14 country schemas, but real portal testing (DOM parsing, Safari extension activation, dropdown handling) needs manual QA on-device. (#838)
- Schema field ID inconsistency: schemas use different IDs for the same concept (`givenNames`/`givenName`/`firstName`, `surname`/`lastName`/`familyName`). The field matcher handles this via aliases, but consider standardizing schema IDs. (#838)

## Drift

