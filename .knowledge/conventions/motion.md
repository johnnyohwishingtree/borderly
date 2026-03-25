# Motion Conventions

## Duration rules
Match duration to the type of change:

| Change type | Duration | Examples |
|-------------|----------|----------|
| Instant feedback | 100-150ms | Button press, toggle, color shift |
| State transitions | 200-300ms | Modal open, tab switch, expand/collapse |
| Layout changes | 300-500ms | Screen transitions, accordion, drawer |

Exit animations should be ~75% of entrance duration — things disappear faster than they appear.

## Easing
- **Elements appearing**: ease-out (fast start, slow finish)
- **Elements disappearing**: ease-in (slow start, fast exit)
- **Toggles/reversible**: ease-in-out

Use `Easing.out(Easing.exp)` or `Easing.out(Easing.quad)` from React Native's `Animated` API for natural deceleration.

## What to animate
- Opacity (fade in/out)
- Transform (translate, scale, rotate)
- Layout height with `LayoutAnimation` for list changes

## Accessibility
Respect `prefers-reduced-motion` — check via `AccessibilityInfo.isReduceMotionEnabled()`. When reduced motion is on:
- Replace spatial movement with simple fades
- Keep functional animations (progress bars, spinners) but slow them down
- Never remove loading indicators entirely

## Anti-patterns
- **Bounce/elastic easing** — feels dated and amateurish; real physics is deceleration, not overshoot
- **Animations over 500ms for UI responses** — feels sluggish; users notice delays above 300ms
- **Animating everything** — animation fatigue is real; reserve motion for meaningful state changes
- **Animation as a loading mask** — don't use flashy transitions to hide slow data fetches
- **Simultaneous animations** — stagger sequential items by 50ms each (cap total at 500ms)
- **Spring animations with high bounce** — subtle springs are fine, visible bounce is not
