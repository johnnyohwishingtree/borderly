# Exploration: Knowledge Graph as Policy Engine

## Problem

Our knowledge files are structured like documentation (concepts, conventions, domain). But they function as **policies** — rules the agent must follow, with enforcement via structural tests.

The documentation framing causes issues:
- Rules buried in prose paragraphs
- Grouping by abstraction (concepts vs conventions) not by scope (what code they govern)
- File names describe what the file IS, not what it ENFORCES
- Agent has to interpret natural language instead of reading structured rules

## Hypothesis

If we restructure knowledge files as **policies** with a consistent format (SCOPE, RULES, ANTI-PATTERNS, EXCEPTIONS, ENFORCEMENT), the agent will:
1. Produce fewer convention violations
2. Spend less time interpreting rules
3. Make fewer mistakes on edge cases (exceptions are explicit)
4. The structural tests can be auto-generated from the policy definition

## Current Structure (documentation-oriented)

```
.knowledge/
├── concepts/           ← grouped by abstraction level
│   ├── dependency-direction.md
│   ├── security-boundary.md
│   ├── local-first.md
│   ├── drift-detection.md
│   └── testable-architecture.md
├── conventions/        ← grouped by abstraction level
│   ├── styling.md
│   ├── testing.md
│   ├── storage.md
│   ├── navigation.md
│   ├── state-management.md
│   ├── native-modules.md
│   ├── e2e-testability.md
│   ├── typography.md
│   ├── motion.md
│   ├── ux-writing.md
│   └── accessibility/
├── domain/             ← grouped by abstraction level
│   ├── form-engine.md
│   ├── passport.md
│   ├── qr-wallet.md
│   ├── submission-guide.md
│   └── countries/
├── templates/
├── patterns/
└── rubrics/
```

## Proposed Structure (policy-oriented)

```
.knowledge/
├── policies/
│   ├── architecture/           ← scope: code structure
│   │   ├── dependency-direction.md   (ALLOW/DENY import rules)
│   │   ├── file-boundaries.md        (directory ownership, file size limits)
│   │   └── local-first.md            (data locality principle)
│   │
│   ├── data/                   ← scope: storage + security + schemas
│   │   ├── storage-tiers.md          (Keychain/WatermelonDB/MMKV rules)
│   │   ├── pii-boundary.md           (what's sensitive, where it goes)
│   │   └── schema-fields.md          (autoFillSource, field types, mappings)
│   │
│   ├── ui/                     ← scope: components + screens
│   │   ├── styling.md                (NativeWind, spacing, anti-patterns)
│   │   ├── typography.md             (type scale, weights)
│   │   ├── motion.md                 (easing, durations, reduced-motion)
│   │   ├── accessibility.md          (a11y props, roles, labels)
│   │   └── ux-writing.md             (button labels, error messages, tone)
│   │
│   ├── state/                  ← scope: hooks + stores
│   │   ├── hook-conventions.md       (extraction, naming, barrel exports)
│   │   └── store-boundaries.md       (isolation, cross-store coordination)
│   │
│   ├── testing/                ← scope: __tests__/ + structural tests
│   │   ├── test-conventions.md       (framework, mocking, memory management)
│   │   ├── e2e-testability.md        (testIDs, registry, Maestro patterns)
│   │   └── drift-detection.md        (what drifts, how to catch it)
│   │
│   └── platform/               ← scope: native modules + build
│       ├── native-modules.md         (web mocks, Xcode, bridging header)
│       └── navigation.md             (React Navigation, screen folders)
│
├── domain/                     ← business logic (stays the same)
│   ├── form-engine.md
│   ├── passport.md
│   ├── qr-wallet.md
│   ├── submission-guide.md
│   └── countries/
│
├── templates/                  ← file structure templates (stays the same)
├── patterns/                   ← multi-file recipes (stays the same)
└── rubrics/                    ← quality criteria (stays the same)
```

## Policy File Format

Every policy file follows this structure:

```markdown
# Policy: <Name>

## Scope
<directories and file types this policy governs>

## Rules
- ALLOW: <what is permitted>
- DENY: <what is forbidden>
- REQUIRE: <what must be present>

## Exceptions
- <when the rule doesn't apply, with justification>

## Anti-patterns
- <concrete examples of violations>

## Enforcement
<structural test file that catches violations>

## References
<related policies, domain files>
```

## What Changes

| Aspect | Before (docs) | After (policies) |
|---|---|---|
| Grouping | By abstraction (concepts/conventions) | By scope (architecture/data/ui/state/testing) |
| File names | Describe the concept | Describe what's enforced |
| Content format | Prose + tables + examples | SCOPE/RULES/EXCEPTIONS/ENFORCEMENT |
| Agent reads | Paragraphs, interprets | Structured sections, looks up |
| Folder CLAUDE.md | Points to concepts + conventions | Points to policies by scope |
| Structural tests | Hand-matched to convention files | Derivable from policy ENFORCEMENT section |

## What Stays the Same

- `domain/` — business logic isn't policy, it's context
- `templates/` — file structure definitions
- `patterns/` — multi-file recipes
- `rubrics/` — quality evaluation criteria
- Folder CLAUDE.md as auto-loading mechanism
- Structural tests as enforcement
- `gaps.md` as issue tracking

## Migration Path

1. Restructure one scope group (e.g., architecture/) as proof of concept
2. Rewrite those files in policy format
3. Update folder CLAUDE.md references
4. Verify structural tests still map correctly
5. If it works, migrate remaining groups
6. Update knowledge-audit skill for new structure
