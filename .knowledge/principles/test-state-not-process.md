# Principle: Test State, Not Process

Validate that the system is in a correct state NOW, not that the correct process was followed to get there. State tests are self-contained and avoid infinite recursion ("who tests the tests?").

Example: don't test "did Claude create facts before policies?" — test "does every policy have valid Derives From references?" If the graph is valid, it doesn't matter what order things were created.

## Derives from
- `facts/organizational/llm-instruction-compliance-is-probabilistic.md`
- `facts/craft/tests-are-specifications.md`

## Implemented by
- `__tests__/structure/knowledge-graph-integrity.test.ts` — validates graph state, not creation order
- `__tests__/structure/knowledge-test-coverage.test.ts` — validates coverage state
