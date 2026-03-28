# Fact: Jest Fake Timers Hang with renderHook

Jest's `useFakeTimers()` combined with `renderHook` from RNTL causes infinite loops or OOM. Tests using both must use real timers or alternative patterns.

## Referenced by
- `policies/testing/test-conventions.md` (Anti-patterns)
