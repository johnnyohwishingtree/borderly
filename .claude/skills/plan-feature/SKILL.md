---
name: plan-feature
description: Plan and implement a new feature
argument-hint: "[feature description]"
---

# Plan Feature

Plan and implement a new feature for this project.

## Steps

1. **Read CLAUDE.md** for project context and conventions
2. **Explore the codebase** to understand existing patterns
3. **Plan the implementation** — identify files to create/modify
4. **Implement** — write the code following existing patterns
5. **Test** — write tests and verify they pass
6. **Commit** — stage specific files, commit with descriptive message, push

## Implementation Guidelines

- Follow existing code patterns and conventions
- Add tests for new functionality
- Handle error cases explicitly
- Keep changes focused — don't refactor unrelated code
- Commit and push frequently (every 2-3 file changes)

## Domain-Specific Checklists

### Adding a New Country

When adding a country to `SUPPORTED_COUNTRIES`, complete ALL of these:

1. **Schema**: Create `src/schemas/<ISO>.json` and register in `schemaRegistry.ts`
2. **Flag**: Add a `case '<ISO>':` in `src/components/trips/CountryFlag.tsx`'s `renderFlag()` switch — the `country-completeness` structural test enforces this
3. **Schema tests**: Add `__tests__/schemas/<ISO>.test.ts`
4. **Portal integration** (if applicable): Add portal config in `src/services/portal/portalIntegration.ts`

### Adding a New Family Relationship

When adding a relationship to `FamilyRelationship`:

1. **Icon**: Add a mapping in `RELATIONSHIP_ICON` in `src/components/profile/FamilyMemberCard.tsx`
2. **Display label**: Add a case in `getRelationshipDisplay()` in the same file

## After Implementation

- Run the full test suite to verify nothing is broken
- Create a PR with `Closes #N` if working from an issue
