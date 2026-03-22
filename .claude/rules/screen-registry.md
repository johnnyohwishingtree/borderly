# Screen Registry Sync

When modifying any screen in `src/screens/`, you MUST also update `maestro/generator/screenRegistry.ts` to match.

## What to update:

| Source change | Registry update |
|---------------|----------------|
| Add/rename/remove a `testID` | Update the `fields` or `actionButtons` array |
| Change an `Alert.alert()` title or buttons | Update the `alerts` array |
| Change the screen's header/title text | Update `waitFor` |
| Move or rename the screen file | Update `sourceFile` |
| Change a field's component type | Update `componentType` in the field entry |
| Add a new screen | Add a new entry to `SCREENS` |
| Delete a screen | Remove its entry from `SCREENS` |

## Why this matters:

The screen registry drives Maestro test generation and is used by UI/UX review skills. If the registry is out of sync:
- Maestro tests will use stale testIDs and fail
- `/visual-audit`, `/ux-review`, `/qa` skills will give wrong information
- The `screen-registry-sync` structural test will fail in CI

## Validation:

After updating the registry, run:
```bash
pnpm maestro:generate    # Verify generation still works
pnpm test -- --testPathPattern=screen-registry-sync   # Verify sync test passes
```

## Adding a new screen:

1. Create the screen following the folder convention (`src/screens/<domain>/<ScreenName>/<ScreenName>.tsx`)
2. Add an entry to `SCREENS` in `maestro/generator/screenRegistry.ts` with all testIDs, alerts, buttons
3. If the screen is part of a testable flow, add it to a journey in `maestro/generator/journeys/`
4. If it's not yet Maestro-testable, add it to `EXCLUDED_SCREENS` in `__tests__/structure/screen-registry-sync.test.ts`
