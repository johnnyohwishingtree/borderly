# Belief: Test Count Is Not a Goal

## Status
Confirmed

## Statement
The number of tests is meaningless as a quality metric. A codebase with 500 tests that each catch a specific bug class is more valuable than 10,000 tests that verify "it renders." The pipeline should never create stories to "increase test count" — only to "catch bug class X."

## Evidence
- 10,222 tests exist but missed all 3 real bugs
- Test-quality policy already says "test coverage is not a goal, catching bugs is"
- Epic planning policy already deprioritizes test coverage epics

## What would confirm
- Already confirmed by the project's bug history

## What would invalidate
- Nothing — this is a confirmed engineering principle, not a hypothesis

## Referenced by
- `decisions/006-testing-strategy.md`
- `policies/workflow/epic-planning.md`
