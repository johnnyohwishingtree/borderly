---
name: review-pr
description: Perform a comprehensive code review of a Pull Request
argument-hint: "[PR number or 'this PR']"
---

# Review PR

Perform a comprehensive code review of a Pull Request, including static analysis and verification of tests/types.

## Steps

1. **Understand the PR**: Read the PR title, description, and linked issues to understand the context and goal.
2. **Analyze the Diff**:
    - Identify all changed files.
    - Review code for logic errors, architectural alignment, and security issues.
    - Check for adherence to project conventions (naming, structure, etc.).
    - Verify that no sensitive data (PII) is being exposed or logged.
3. **Verify Integrity**:
    - Run `pnpm typecheck` to ensure no type regressions.
    - Run `pnpm test` (or relevant subset) to ensure behavioral correctness.
    - If applicable, verify E2E tests: `pnpm e2e`.
4. **Draft Feedback**:
    - Identify specific lines or blocks needing improvement.
    - Formulate constructive feedback.
5. **Post Review**:
    - Write the summary to a temporary file for security: `echo "$SUMMARY" > /tmp/review_summary.txt`
    - Use `gh pr review --comment -F /tmp/review_summary.txt` for a general review.
    - Use `gh pr review --approve` if the PR is perfect.
    - Use `gh pr review --request-changes -F /tmp/review_summary.txt` if there are blockers.
    - Clean up: `rm /tmp/review_summary.txt`

## Review Guidelines

- **Be Constructive**: Focus on the code, not the author. Suggest solutions, don't just point out problems.
- **Prioritize Impact**: Focus on correctness, security, and architecture first; then style and minor optimizations.
- **Verify Assumptions**: Don't just look at the diff; read the surrounding code to ensure the changes are safe in context.
- **Check Tests**: Ensure new features have corresponding tests and that existing tests still pass.

## Final Output Structure

Your final review should include:
- **High-level Summary**: What does this PR do well?
- **Key Concerns**: Are there any blockers or architectural risks?
- **Specific Feedback**: Categorized by file or impact (Security, Performance, Style).
- **Verification Status**: Results of typechecks and tests.
