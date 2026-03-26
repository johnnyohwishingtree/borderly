# Testable Architecture

Structure code so conventions are mechanically verifiable. If you can't write a test for a rule, restructure until you can.

## Principle

A convention that can't be tested is a suggestion. It will be violated, nobody will notice, and the knowledge graph becomes fiction. The architecture must make rules enforceable by simple structural tests (grep, parse, file scan) that run in under 1 second.

## What makes conventions testable

### Clear directory boundaries
```
src/stores/     → can grep: "stores never import hooks"
src/services/   → can grep: "services never import stores"
src/components/ → can grep: "components never import stores"
```
If stores and services were mixed in the same directory, the import boundary rule would be untestable.

### Predictable naming patterns
```
src/hooks/use<Domain><Action>.ts    → can scan: "all hooks follow naming pattern"
src/screens/<Name>/<Name>.tsx       → can scan: "screen folder matches file name"
testID={`leg-${index}-arrival-date`} → can match: registry validates against source
```
If naming were arbitrary, structural tests couldn't distinguish hooks from utilities.

### Declarative metadata
```
src/schemas/*.json                  → can parse: "fields have autoFillSource or countrySpecific"
maestro/generator/screenRegistry.ts → can diff: "registry matches source testIDs"
.knowledge/index.md                 → can diff: "index matches files on disk"
```
If schemas were embedded in code instead of JSON, field validation would require AST parsing.

### Centralized storage boundaries
```
Keychain  → PII only
WatermelonDB → structured data (PII stripped)
MMKV → config only
```
If storage calls were scattered with no abstraction, PII boundary tests would need to trace every call site.

## Red flags — conventions that can't be tested

| Red flag | Root cause | Fix |
|---|---|---|
| "Components shouldn't have too much logic" | No measurable threshold | Define: "screens with 5+ useState need hook extraction" |
| "Use good naming" | Too vague | Define: "hooks follow use<Domain><Action>" |
| "Keep files small" | No enforcement | Define: "500-line limit" + file-size check |
| "Don't mix concerns" | No directory boundaries | Separate into stores/, services/, hooks/ |
| "Follow the style guide" | Style guide isn't parseable | Use anti-patterns list that can be grepped |

## When adding a new convention

Ask: "Can I write a test in `__tests__/structure/` that catches violations of this rule in under 1 second?"

- **Yes** → write the test, add the convention
- **No, but I could restructure** → restructure first, then add
- **No, it's subjective** → it's a guideline, not a convention. Document it but don't pretend it's enforced.
