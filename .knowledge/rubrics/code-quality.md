# Code Quality Rubric

Evaluate source modules (following `.knowledge/templates/module.md`) against these criteria.

## Architecture (weight: 35%)
- Functions are small and single-purpose
- Dependencies flow correctly: Screens -> Hooks -> Stores -> Services
- Types are precise (no `any`, no loose unions)
- Errors are handled explicitly, not swallowed
- No side effects at module level
- Components receive data via props or hooks, not direct store imports

## Testing (weight: 30%)
- New functions have corresponding tests
- Tests cover the happy path AND at least one error path
- Mocks are minimal — prefer testing real logic
- No snapshot files (use inline assertions)
- Component tests use accessibility queries (getByRole, getByLabelText)

## Code Style (weight: 20%)
- TypeScript strict mode passes
- No unused imports or variables
- Consistent naming: camelCase for functions, PascalCase for types/components
- NativeWind className for styling, not inline styles
- Tailwind spacing scale (p-2, p-4), never arbitrary values

## Error Handling (weight: 15%)
- Functions that can fail throw descriptive errors or return result types
- External input is validated at boundaries
- No silent catch blocks that swallow errors
- Accessibility: error messages use `accessibilityLiveRegion="polite"`
