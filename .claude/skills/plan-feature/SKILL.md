---
name: plan-feature
description: Plan and implement a new feature for Borderly
argument-hint: "[feature description]"
---

# /plan-feature — Plan and Implement a Feature

Plan and implement a new feature for Borderly. Reads existing code first, plans the approach, implements with tests, and verifies.

## Prerequisites

- Project builds cleanly (`pnpm typecheck` and `pnpm test` pass)
- Relevant `.context/patterns/` and `__tests__/structure/` constraints reviewed
- Existing code in the target area has been read

## Usage
```
/plan-feature add QR code sharing      # Implement a specific feature
/plan-feature                          # Ask what to implement
```

## Steps

### Step 1: Understand Context

1. Read `CLAUDE.md` for project architecture and conventions
2. Read existing code in the area being modified — never propose changes to code you haven't read

### Step 2: Plan

1. Identify files to create or modify
2. Check if relevant patterns exist in `.context/patterns/`
3. Check `src/config/beliefs.ts` — does this feature depend on any unconfirmed beliefs? If so, note the risk and consider whether to implement defensively
4. Determine the dependency order (stores before hooks before screens)
6. List tests that need to be written

Present the plan before implementing if the scope is large (3+ files).

### Step 3: Implement

Follow the project's dependency direction: Screens -> Hooks -> Stores -> Services

**For each file:**
1. Write or modify the code
2. Run `pnpm typecheck` immediately — fix before moving on
3. Follow existing patterns in surrounding code

**Key rules:**
- Read the relevant folder `CLAUDE.md` for directory conventions before creating files
- Use NativeWind `className` for styling (no inline styles)
- Use existing UI components before creating new ones
- Use Lucide icons from `lucide-react-native` (not vector-icons)
- Extract business logic into hooks if a screen has 3+ useState calls
- Use smart components where required (see `src/types/schema.ts` for form engine types)
- Never use `any` types — fix the root cause

### Step 4: Write Tests

| What changed | Test location | Test tool |
|-------------|---------------|-----------|
| Service/util | `__tests__/<matching-path>.test.ts` | Jest |
| Component | `__tests__/components/<path>.test.tsx` | Jest + RNTL |
| Screen | `__tests__/screens/<path>.test.tsx` | Jest + RNTL |
| New screen (E2E) | `e2e/tests/<name>.spec.ts` | Playwright |
| A11y props | `__tests__/components/<path>.a11y.test.tsx` | Jest + RNTL |

### Step 5: Verify

Follow `the verification rules: run `pnpm lint`, `pnpm typecheck`, `pnpm test` in order; up to 6 attempts`.

Also run bundle check:
```bash
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js
```

### Step 6: Self-Update Check

- **New screen?** Follow `.context/patterns/add-screen.md` for the full checklist
- **New navigation route?** Update navigation type definitions (read the relevant folder `CLAUDE.md` for conventions)
- **New native dependency?** Read existing mocks in `__mocks__/` for patterns on how to add native dependency mocks

## Domain-Specific Checklists

### Adding a New Country

1. Create `src/schemas/<ISO>.json` and register in `schemaRegistry.ts`
2. Add `case '<ISO>':` in `CountryFlag.tsx` `renderFlag()` switch
3. Add `__tests__/schemas/<ISO>.test.ts`
4. Add portal config in `src/services/portal/portalIntegration.ts` (if applicable)

### Adding a New Family Relationship

1. Add icon mapping in `RELATIONSHIP_ICON` in `FamilyMemberCard.tsx`
2. Add display label case in `getRelationshipDisplay()`

## Guardrails

- Read existing code before proposing changes
- Don't skip tests for new functionality
