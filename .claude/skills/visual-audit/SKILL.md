---
name: visual-audit
description: Audit UI/UX using vision and screenshots, get redesign suggestions, and fix usability issues
---

# Visual Audit — UI/UX Review

Analyze the app's visual state and produce a structured report of UI/UX issues. This skill is read-only — it identifies problems but does NOT implement fixes. Use `/visual-implement` to apply fixes.

## Prerequisites

- **Screenshots**: Run `/capture-screens` if screenshots are stale or missing.
  - Captured via Playwright + React Native Web — fast, local, but portal screens show iframe-blocked content
- **Stitch MCP server** (optional): For AI-generated redesign alternatives. Requires `STITCH_API_KEY` env var.
- **frontend-design-audit plugin** (optional): For code-level usability scanning

## Steps

### Step 1: Load Screenshots

1. **Find screen manifests** at `src/screens/<domain>/<ScreenName>/__screenshots__/manifest.json`. Find all: `find src/screens -path "*/__screenshots__/manifest.json"`

2. **Find component manifests** at `src/components/<domain>/<Component>/__screenshots__/manifest.json`. Find all: `find src/components -path "*/__screenshots__/manifest.json"`

3. **If screen screenshots are missing or stale**, run the screen capture:
```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

Component screenshots can be captured in parallel and are quick to regenerate when needed.

4. If the user provided specific screenshots or screen names, focus on those instead of the full set.

### Step 2: Batched Visual Critique

Process screenshots **one domain at a time** to stay within context limits.

Find screen domains by listing directories under `src/screens/`. Find component domains by listing directories under `src/components/`. Read per-domain screenshots from `__screenshots__/manifest.json` files.

To discover the current inventory:
```bash
ls src/screens/          # Screen domains
ls src/components/       # Component domains
find src/screens -path "*/__screenshots__/manifest.json"     # Screen manifests
find src/components -path "*/__screenshots__/manifest.json"  # Component manifests
```

For each domain batch:
1. **Read all screenshots** in that domain using the Read tool (it supports image files)
2. **Analyze and critique** those screenshots (see criteria below)
3. **Record findings** before moving to the next domain

Do NOT load all screenshots at once — this exhausts the context window.

#### Evaluation Criteria

**Layout & Spacing**
- Consistent spacing on 4px/8px grid
- Proper alignment (centered, left-aligned groups consistent)
- Balanced whitespace — not too cramped, not too sparse
- Content doesn't crowd edges (min 16px horizontal padding)

**Visual Hierarchy**
- Clear primary action on each screen (one dominant CTA)
- Heading → subheading → body size progression
- Important info isn't buried or competing for attention
- Proper use of font weight to create emphasis

**Color & Contrast**
- Text passes WCAG AA contrast ratio (4.5:1 for body, 3:1 for large)
- Status colors are not the only differentiator (add icons/text too)
- Consistent color palette — no random one-off colors
- Interactive elements visually distinct from static content

**Touch & Interaction**
- Touch targets at least 44x44px
- Tappable elements look tappable (buttons have visual affordance)
- Sufficient spacing between tap targets (no accidental taps)

**Mobile Patterns**
- Content reachable without stretching (important actions in thumb zone)
- No horizontal scroll on single-column layouts
- Safe area insets respected (notch, home indicator)

**Loading & Empty States**
- Empty states have helpful messaging (not blank screens)
- Error states show recovery actions

**Responsive & Scalable Design**
- Components use NativeWind responsive classes (not fixed widths) so they scale across screen sizes
- Lists, grids, and selectors handle growing item counts gracefully (e.g., 11+ country buttons should use a searchable dropdown, not a wrapping pill grid)
- Form layouts remain usable on both narrow mobile (375px) and wider web/tablet viewports
- Text doesn't overflow or get truncated at any supported viewport width

**Data Completeness**
- Every supported country in `SUPPORTED_COUNTRIES` renders a real flag (no "??" fallback placeholders)
- Every family relationship type shows a distinct, recognizable icon (not a generic placeholder)
- All dynamic content (flags, icons, badges) has a rendered implementation — not just a data entry

**Smart Component Usage**
- Hotel/accommodation name fields must use `AccommodationAutocomplete` (not plain `Input`). Look for inputs with hotel-related placeholders or accommodation-name testIDs that aren't using the smart component.
- Address fields must use `AddressAutocomplete` (not individual `Input` fields for line1, city, postal code). A single `AddressAutocomplete` should replace multiple address sub-field inputs.
- See `.knowledge/models/form-engine.md` (## Smart components) for the full mapping. Flag violations as **Major**.

**Component Consistency** (when reviewing component screenshots)
- Variants are visually consistent (same component, different states look related)
- Status colors match across components (success green, error red, warning amber)
- Disabled states are clearly distinguishable from active states
- Loading states provide visual feedback

### Step 3: Rate & Report

Rate each finding with severity:
- **Critical**: Blocks usability or causes confusion
- **Major**: Noticeably degrades experience
- **Minor**: Polish issue, good to fix

Output a structured report with:
- Screenshot reference (path to `__screenshots__/<variant>.png`)
- Screen or component name
- Issue description
- Severity
- Specific fix suggestion (NativeWind classes, component changes, layout adjustments)

### Step 4: Redesign Suggestions (Optional — requires Stitch MCP)

If Stitch is connected and there are Critical/Major issues:
1. Upload problematic screenshots to Stitch
2. Generate 2-3 redesign variations per screen
3. Present with commentary on which best addresses the issues

If Stitch is NOT connected, include specific NativeWind fix suggestions in the report.

## Screen & Component Metadata

Before auditing, read the metadata files for context on what each screen contains:

- **`src/screens/*/testIDs.ts`** — Per-screen element declarations (testID, type, zone). Helps understand what should be visible on each screen.
- **`e2e/screenshots/`** — Auto-captured screenshots from the latest E2E test run. Visual reference for current screen state.

## Project-Specific Guidelines

- **NEVER** use raw `View` styles for complex components. Use `src/components/ui/` components.
- **NEVER** use `react-native-vector-icons` directly. Use Lucide icons from `lucide-react-native`.
- **ALWAYS** wrap screens in a responsive container with appropriate max-width for web.
- **FLAGS**: Use `CountryFlag` component; verify canton and star/crescent accuracy for Malaysia.
- **STYLING**: Use NativeWind `className` everywhere. Follow existing Tailwind class patterns.
- **COMPONENTS**: Check `src/components/ui/` before suggesting new primitives.
- **SPACING**: Use Tailwind spacing scale (p-2 = 8px, p-4 = 16px). Never use arbitrary values.

## Guardrails

- Read-only — identify problems, don't implement fixes
- Process one domain at a time to stay within context limits
