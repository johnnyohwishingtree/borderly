# Policy: Drift Detection

## Scope
src/, maestro/, .knowledge/, .claude/

## Rules
- REQUIRE: after renaming/moving files → grep for old paths in all .md and .yaml
- REQUIRE: after changing testIDs or button text → update screenRegistry + run `pnpm maestro:generate`
- REQUIRE: after adding native modules → add web mock + webpack alias + Jest mock
- DENY: references to files that don't exist in .knowledge/ or .claude/ docs

## What Drifts
| Source | Derived artifact | How drift happens |
|---|---|---|
| testIDs in source | Maestro flows | testID renamed, flow not updated |
| Button text in source | Maestro flows | text changed, flow still taps old text |
| Schema fields | Form rendering tests | field added/removed, test not updated |
| File renames | .md references | old path in docs |
| Native module added | Web mock missing | E2E crashes silently |
| autoFillSource paths | Profile data model | path doesn't resolve |

## Exceptions
- Empty `.knowledge/` directories don't count as drift
- Generated files (`maestro/flows/generated/`) are regenerated, not manually synced

## Anti-patterns
- Renaming a file without grepping for references
- Updating CLI output without updating README
- Trusting CI will catch drift (most drift is in docs/config, not code)

## Enforcement
- `e2e/mobile/full-e2e.test.ts — mobilecli-based E2E
- `/code-audit` skill — path references, drift detection

## References
- Related: policies/testing/e2e-testability.md

## Derives From
- `principles/source-of-truth-prevents-drift.md`
- `facts/domain/forms-change-without-notice.md`
- `facts/craft/naming-enables-automation.md`
