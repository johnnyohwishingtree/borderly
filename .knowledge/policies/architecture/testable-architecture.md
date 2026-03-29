# Policy: Testable Architecture (Meta-Policy)

## Scope
.knowledge/, __tests__/structure/, src/ (directory structure)

## Rules
- REQUIRE: every testable policy has a structural test in `__tests__/structure/`
- REQUIRE: new policies added to `knowledge-test-coverage.test.ts` mapping
- REQUIRE: code structured so conventions are greppable (clear directory boundaries)
- REQUIRE: naming patterns are predictable (structural tests can scan)
- REQUIRE: metadata is declarative/parseable (JSON, typed objects)
- REQUIRE: storage boundaries go through centralized abstractions
- DENY: conventions that can't be tested — restructure until testable

## Red Flags
| Red flag | Root cause | Fix |
|---|---|---|
| "Don't have too much logic" | No threshold | Define numeric limit |
| "Use good naming" | Too vague | Define naming pattern |
| "Keep files small" | No enforcement | Define line limit + check |
| "Don't mix concerns" | No boundaries | Separate into directories |
| "Follow the style guide" | Not parseable | Use greppable anti-patterns |

## When Adding a New Policy
Ask: "Can I write a test in `__tests__/structure/` that catches violations in under 1 second?"
- Yes → write the test, add the policy
- No, but could restructure → restructure first
- No, subjective → it's a guideline (mark as design guideline in enforcement)

## Exceptions
- Design guidelines (typography, motion, ux-writing) — mark as "not structurally testable"

## Anti-patterns
- Writing a policy without a structural test
- Adding a knowledge file without mapping it in `knowledge-test-coverage.test.ts`
- Convention expressed as prose that can't be grepped for violations

## Enforcement
- `__tests__/structure/knowledge-test-coverage.test.ts` — meta-test
- Skills reference this policy when creating new policies

## Context
Enforced by structural test. See test file for justification.
