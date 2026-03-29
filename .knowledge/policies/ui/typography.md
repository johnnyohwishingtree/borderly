# Policy: Typography

## Scope
src/components/ui/, src/screens/

## Rules
- REQUIRE: minimum 16px for body text
- REQUIRE: semantic Tailwind sizes (text-lg, text-sm) — no arbitrary (text-[17px])
- REQUIRE: max 3-4 distinct font sizes per screen
- DENY: light/thin font weights for body text (hard to read on mobile)
- DENY: ALL CAPS for body paragraphs (only for short labels, badges, headers)
- DENY: centered body paragraphs — left-align for readability
- ALLOW: centered short headings

## Type Scale
| Level | Use | Size |
|---|---|---|
| Display | Hero headings | 32-40px |
| Title | Screen titles | 22-28px |
| Heading | Section headers | 18-20px |
| Body | Primary content | 16px min |
| Caption | Secondary info | 13-14px |

## Font Weight Hierarchy
- Bold — titles and primary actions only
- Semibold — section headers and emphasis
- Medium — interactive elements (buttons, links)
- Regular — body text
- Max 3 weights per screen

## Exceptions
- None — these are universal mobile typography rules

## Anti-patterns
- `text-[17px]` arbitrary size
- 6 different font sizes on one screen
- `font-light` on body text
- Centering a 3-line paragraph

## Enforcement
- Design guideline — not structurally testable
- Reviewed during pipeline Step 6 (self-review)

## Context
- `.context/external/cognitive/three-font-sizes-max.md`
- `.context/external/cognitive/centered-text-slows-reading.md`
