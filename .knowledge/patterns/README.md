# Design Patterns

Patterns are multi-file change recipes. They tell the pipeline how to make cross-cutting changes that touch multiple files in a specific order.

## How patterns fit in the `.claude/` system

```
                     Story Issue Body
                     ├── Context: files to read
                     ├── Patterns: .claude/patterns/add-X.md
                     └── Templates: .claude/templates/module.md

   Rules (always on)    Patterns (on demand)    Templates (on demand)
   ├── tdd.md           ├── Multi-file          ├── Single-file
   ├── commit-gate.md   │   recipes with        │   structure
   └── ...              │   ordering            │   definitions
                        └───────┐               └───────┐
                                ▼                       ▼
                          Rubrics (on demand)
                          └── Quality evaluation
```

## When to create a pattern

Create a pattern when you notice a recurring type of change that:
- Touches 3+ files in a specific order
- Has steps that are easy to forget (e.g., updating a barrel export, adding E2E mock)
- A new developer (or AI agent) would get wrong without guidance

If the guidance is a simple constraint ("always do X"), it's a **rule**, not a pattern.

## Borderly-specific patterns to add

- `add-screen.md` — New screen + navigation + E2E test + screenshot
- `add-country-schema.md` — New country JSON + form engine integration + tests
- `add-component.md` — New UI component + a11y tests + barrel export
- `add-hook.md` — Extract hook from screen + tests + barrel export
- `add-native-dep.md` — Native dependency + iOS pod install + web mock + webpack alias
