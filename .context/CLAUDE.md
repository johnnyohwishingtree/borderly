# Context

Information about the world outside our code. Code IS the knowledge — this folder is the context that shaped it.

## What goes here

- **decisions/**: Rejected alternatives that explain why the code is the way it is. Immutable once written.
- **external/**: Truths about systems we don't control (governments, laws, human behavior, tools). Must be verifiable.

## What does NOT go here

Anything that CAN be code:
- Constraints → structural tests in `__tests__/structure/`
- Specs (pending work) → `test.skip` in `*.spec.test.ts` files (colocated with source)
- Models → TypeScript types in `src/types/`

See `SYSTEM.md` for full definitions of all terms.
