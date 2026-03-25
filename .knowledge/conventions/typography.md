# Typography Conventions

## Type scale
Use a modular scale with clear contrast between levels — not many similar sizes.

| Level | Use | Example size |
|-------|-----|-------------|
| Display | Hero headings | 32-40px |
| Title | Screen titles | 22-28px |
| Heading | Section headers | 18-20px |
| Body | Primary content | 16px (minimum) |
| Caption | Secondary info, timestamps | 13-14px |

Use semantic names (`text-lg`, `text-sm`) not arbitrary values (`text-[17px]`).

## Font weight hierarchy
- Bold (`font-bold`) for titles and primary actions only
- Semibold (`font-semibold`) for section headers and emphasis
- Medium (`font-medium`) for interactive elements (buttons, links)
- Regular (`font-normal`) for body text
- Don't use more than 3 weights on a single screen

## Rules
- Minimum 16px for body text — smaller causes readability issues on mobile
- Line height: 1.4-1.6x font size for body text, tighter (1.2x) for headings
- Use system fonts (San Francisco on iOS, Roboto on Android) unless brand requires custom
- Tabular numbers for data displays (prices, dates, counts) — prevents layout shift

## Anti-patterns
- **Arbitrary font sizes** (`text-[17px]`, `text-[15px]`) — use the Tailwind scale
- **Too many sizes on one screen** — 3-4 distinct sizes max; more flattens hierarchy
- **Light/thin font weights for body text** — hard to read on mobile screens
- **ALL CAPS for long text** — only for short labels, badges, or section headers
- **Centering body paragraphs** — left-align for readability; center only for short headings
- **Font size as the only hierarchy tool** — combine with weight, color, and spacing
