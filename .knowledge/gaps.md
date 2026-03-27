# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

- E2E suite (`pnpm e2e`) — all failures caused by missing Playwright browser binaries. Webpack compiles successfully. Fix: run `pnpm exec playwright install` in an environment that allows CDN downloads (blocked in cloud/CI sandboxes). Not a code issue.
- Missing test coverage for utils: `constants.ts`, `logger.ts` — minimal logic, excluded from #1016. (audit-2026-03-26)

## Knowledge updates

- (Fixed) Index country count was 15, corrected to 14 — only 14 country files on disk. (audit-2026-03-27)
- (Fixed) Architecture diagram was stale — missing user-journeys model, test-quality policy, and workflow scope. Regenerated. (audit-2026-03-27)
- Orphaned nodes (not referenced by any folder CLAUDE.md): `models/user-journeys.md`, `policies/architecture/file-boundaries.md`, `policies/testing/test-quality.md`, 6 workflow policies. Wire these into relevant folder CLAUDE.md files. (audit-2026-03-27)
