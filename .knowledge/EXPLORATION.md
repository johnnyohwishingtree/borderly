# Exploration: Knowledge Graph as Policy Engine

## Status: COMPLETED

Migrated from documentation-oriented structure (concepts/conventions) to policy-oriented structure (policies by scope).

## Problem

Knowledge files were structured as documentation (prose paragraphs, grouped by abstraction level). Rules were buried, hard to parse, and not enforceable.

## Solution

Restructured as **policies** with consistent format: SCOPE, RULES, EXCEPTIONS, ANTI-PATTERNS, ENFORCEMENT.

### Key changes

| Aspect | Before | After |
|---|---|---|
| Grouping | By abstraction (concepts/conventions) | By scope (architecture/data/ui/state/testing/platform) |
| Content format | Prose + tables | Structured SCOPE/RULES/ENFORCEMENT |
| Enforcement | Hand-matched tests | Derivable from policy ENFORCEMENT section |

### What moved

- `concepts/` + `conventions/` → `policies/{architecture,data,ui,state,testing,platform}/`
- `domain/`, `templates/`, `patterns/`, `rubrics/` — unchanged

### Policy file format

```markdown
# Policy: <Name>

## Scope
<directories and file types governed>

## Rules
- ALLOW / DENY / REQUIRE statements

## Exceptions
## Anti-patterns
## Enforcement
<structural test file>

## References
```

See `ENGINE-TYPES.md` for full format reference.
