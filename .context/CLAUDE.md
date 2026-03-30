# Context

Information about the world outside our code — decisions, external facts, and staging.
Code IS the knowledge. This folder is the context that shaped it.

## Adding new context

- **decisions/**: Rejected alternatives that explain why the code is the way it is. Immutable once written.
- **external/**: Truths about systems we don't control (governments, laws, human behavior, tools). Must be verifiable.
- **unvalidated/**: Fresh observations not yet promoted to code. Review within 30 days — promote or delete.
- **patterns/**: Multi-step recipes for tasks not yet automated by generator scripts.

## What does NOT go here

Anything that CAN be code:
- Constraints → structural tests in `__tests__/structure/`
- Beliefs → `test.skip` in `*.beliefs.test.ts` files (colocated with source)
- Models → TypeScript types in `src/types/`
- Principles → deleted (the tests they justified exist)
