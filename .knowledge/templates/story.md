**Parent Epic:** #<epic_number>
**Skill:** /plan-feature (or /test-suite, /visual-implement, etc.)

## Description

<What needs to be implemented. Be specific — name the components, screens, hooks, and behaviors. Avoid vague verbs like "handle", "process", "deal with".>

## Acceptance Criteria

- [ ] <Observable outcome, not just "implementation complete">
- [ ] <Another observable outcome>
- [ ] All new functions have tests (happy path + at least one error path)
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm test` passes with all tests green

## Files to Create/Modify

- `src/<path/to/file.ts>` — <what changes>
- `__tests__/<path/to/file.test.ts>` — <what tests>

## Context (read these before implementing)

<List the minimum files/line-ranges the implementer needs to read. This prevents exploratory reading of the entire codebase.>

- `src/<path/to/file.ts>` — <why: "you're adding a hook here">
- `src/<path/to/file.ts:N-M>` — <why: "see how existing screens are structured">

## Gap

<Every story exists because of a gap between what IS (facts) and what SHOULD BE (beliefs). State both clearly.>

**Fact:** `.knowledge/facts/<type>/<relevant>.md` — <what is currently true about the system>
**Belief:** `.knowledge/beliefs/<relevant>.md` — <what we believe should be true>
**Gap:** <the delta between fact and belief — this IS the story>

<If the fact or belief doesn't exist yet, create it before creating the story.>

## Knowledge

<Additional policies and constraints relevant to implementation.>

- `.knowledge/policies/<relevant>.md` — <constraint to follow>

<If none apply, write "Standard policies.">

## Patterns & Templates

<Which patterns/templates apply to this story? Read these INSTEAD of reverse-engineering conventions from existing code.>

- `.knowledge/patterns/<relevant>.md` — <when to follow it>
- `.knowledge/templates/<relevant>.md` — <which files to structure this way>

If none apply, write "Standard — follow existing patterns in the codebase."

## Key Types

<Inline the type definitions the implementer needs. Avoids reading type files for a few lines.>

```typescript
// Only the types relevant to this story
interface ExampleType {
  field: string;
}
```

## Dependencies

None / Depends on #<number>

## Verification Notes

<Any specific things to check. Leave blank if standard verification is sufficient.>

**After implementation:** Update the fact referenced in ## Gap to reflect the new state. The fact should now match the belief. If it doesn't, the story isn't complete.
