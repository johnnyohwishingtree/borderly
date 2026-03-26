---
name: knowledge-audit
description: Audit code against .knowledge/ conventions — find violations, evaluate fixes, propose test strategies
argument-hint: "[--dry-run] [layer: services|stores|components|hooks|screens|schemas]"
---

# /knowledge-audit — Code vs Knowledge Compliance Audit

Checks whether code in each folder actually follows the rules declared in its CLAUDE.md and linked `.knowledge/` files. For each violation, evaluates whether to fix the code or update the knowledge, and proposes a test strategy to prevent regression.

Differs from `/audit` (which checks drift, dead code, and index sync). This skill focuses specifically on whether the code conforms to the documented conventions.

## Step 1: For each folder CLAUDE.md, read the rules

For each folder with a CLAUDE.md:
1. Read the CLAUDE.md
2. Read all linked `.knowledge/` files (the `See:` references)
3. Extract the concrete rules (both "do this" and "anti-patterns")

## Step 2: Check code against rules

For each rule, run the appropriate check:

### Dependency direction (`.knowledge/concepts/dependency-direction.md`)
- `src/stores/`: grep for imports from hooks or other stores
- `src/components/`: grep for imports from stores
- `src/services/`: grep for imports from stores or hooks

### Styling (`.knowledge/conventions/styling.md`)
- `src/components/`: count `style={{` occurrences, flag non-exception cases
- Check for inline hex colors outside of Lucide icon `color` props

### State management (`.knowledge/conventions/state-management.md`)
- `src/hooks/`: compare files to `index.ts` barrel exports
- `src/screens/`: count `useState` per screen, flag 5+

### E2E testability (`.knowledge/conventions/e2e-testability.md`)
- `src/components/`: find interactive elements (`Pressable`, `TouchableOpacity`, `Button`) without `testID`
- Compare against `maestro/generator/screenRegistry.ts`

### Security boundary (`.knowledge/concepts/security-boundary.md`)
- Check if PII fields (passport, DOB) are persisted to WatermelonDB or MMKV
- Check for `console.log` of sensitive data

### Schemas (`.knowledge/domain/form-engine.md` + `.knowledge/patterns/add-country.md`)
- Fields without `autoFillSource` that aren't `countrySpecific: true`
- Date fields not using `type: "date"`
- Dropdown fields not using `searchable_select`
- Missing `autoFillMapping` for fields with country-specific enums

### Native modules (`.knowledge/conventions/native-modules.md`)
- Native modules on disk but not in Xcode pbxproj
- Missing web mocks or Jest mocks

## Step 3: Check knowledge test coverage

For each `.knowledge/conventions/` file, verify a structural test exists that enforces it. Compare against `__tests__/structure/`:

| Convention | Expected test |
|---|---|
| `dependency-direction.md` | `dependency-direction.test.ts` |
| `e2e-testability.md` | `maestro-registry-sync.test.ts` + `component-testids.test.ts` |
| `security-boundary.md` | `pii-boundary.test.ts` |
| `styling.md` | `no-space-x.test.ts` + `smart-component-usage.test.ts` |
| `state-management.md` | `hooks-barrel.test.ts` |
| `navigation.md` | `screen-folder-convention.test.ts` |
| `native-modules.md` | `native-module-mocks.test.ts` |
| `accessibility/` | `accessibility-props.test.ts` |
| `testing.md` | (meta — testing conventions aren't structurally testable) |
| `typography.md` | (design guideline — not structurally testable) |
| `motion.md` | (design guideline — not structurally testable) |
| `ux-writing.md` | (design guideline — not structurally testable) |

For any convention **without** a structural test:
1. Determine if the convention IS structurally testable (can you grep/parse for violations?)
2. If yes → write the test and add it to `__tests__/structure/`
3. If no (design guideline) → skip, but note it in the report

Also check `.knowledge/concepts/` and `.knowledge/domain/` for testable rules:
- `drift-detection.md` → `maestro-registry-sync.test.ts` covers Maestro drift
- `form-engine.md` → `schemaValidation.test.ts` covers schema rules

**New knowledge files added since last audit** should be flagged if they have no test.

## Step 4: Evaluate each finding

For every violation, decide:

**Code is wrong** → the convention is correct, code needs fixing
**Knowledge is stale** → the code is intentionally different, update the knowledge

## Step 5: Propose test strategy for each code fix

Every fix needs a test to prevent regression. For each violation, specify:

| Violation type | Test strategy |
|---|---|
| Dependency direction | Structural test: grep imports at `pnpm test` time (already exists in screen-folder-convention tests) |
| Store in component | Add to existing dependency-direction structural test |
| Missing testID | Add to `maestro-registry-sync.test.ts` — registers the testID in screenRegistry |
| PII in wrong storage | Unit test: verify `stripPIIFromFormData` strips the field |
| Schema field type wrong | Schema validation test in `__tests__/schemas/` |
| Hooks barrel missing export | Structural test: compare files to exports |
| Screen naming | Already covered by `screen-folder-convention.test.ts` |

If no existing test covers the violation, create one. The test should run at `pnpm test` time (< 1 second) so it catches drift immediately.

## Step 6: Write findings to gaps.md

Write findings to `.knowledge/gaps.md` with the test strategy included:

```markdown
## Code fixes
- `src/components/guide/CopyableField.tsx` — copy button missing testID. Test: add to screenRegistry + maestro-registry-sync catches it. (knowledge-audit-YYYY-MM-DD)
```

## Step 7: Fix or create stories (if not --dry-run)

- **Quick fixes** (< 5 minutes): fix inline and commit
- **Larger fixes**: create a story with the test strategy in the acceptance criteria

## What NOT to flag
- Inline styles that are acceptable per `.knowledge/conventions/styling.md` exceptions
- Fields without `autoFillSource` that are `countrySpecific: true`
- Empty `.knowledge/` directories
