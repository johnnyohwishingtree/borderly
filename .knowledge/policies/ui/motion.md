# Policy: Motion

## Scope
src/components/ui/, src/components/**/

## Rules
- REQUIRE: respect `prefers-reduced-motion` via `AccessibilityInfo.isReduceMotionEnabled()`
- DENY: bounce/elastic easing — feels dated
- DENY: animations over 500ms for UI responses
- DENY: animating everything — reserve for meaningful state changes
- ALLOW: ease-out for appearing elements (100-150ms)
- ALLOW: ease-in for disappearing elements (75% of entrance duration)
- ALLOW: ease-in-out for toggles/reversible actions (200-300ms)

## Duration Rules
| Change type | Duration |
|---|---|
| Instant feedback (button, toggle) | 100-150ms |
| State transitions (modal, tab) | 200-300ms |
| Layout changes (accordion, drawer) | 300-500ms |

## Exceptions
- Progress bars and spinners kept during reduced-motion (slowed, not removed)
- Loading indicators always visible regardless of motion preference

## Anti-patterns
- `Easing.bounce` or spring with high bounce
- 800ms animation on a button press
- Animating every list item on scroll
- No `prefers-reduced-motion` check

## Enforcement
- Design guideline — not structurally testable
- Reviewed during pipeline Step 6 (self-review)
