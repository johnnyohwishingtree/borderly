---
name: visual-audit
description: Audit UI/UX using vision and screenshots, get redesign suggestions, and fix usability issues
---

# Visual Audit — UI/UX Review

Analyze the app's visual state and produce a structured report of UI/UX issues. This skill is read-only — it identifies problems but does NOT implement fixes. Use `/visual-implement` to apply fixes.

## Prerequisites

- **Screenshots**: Component screenshots are captured automatically in CI on every PR. Screen screenshots may need a manual `/capture-screens` run if they're stale.
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

Component screenshots are captured automatically in CI — you usually don't need to capture them manually.

4. If the user provided specific screenshots or screen names, focus on those instead of the full set.

### Step 2: Batched Visual Critique

Process screenshots **one domain at a time** to stay within context limits.

**Screen domains** (at `src/screens/<domain>/<ScreenName>/__screenshots__/`):
- **onboarding** — Welcome, Tutorial, PassportScan, ConfirmProfile, AddCompanions, BiometricSetup
- **trips** — TripList, CreateTrip, TripDetail, LegForm, SubmissionGuide (JPN/MYS/SGP/VNM/CAN), PortalSubmission (JPN/MYS/SGP/VNM/CAN)
- **wallet** — QRWallet, AddQR, QRDetail
- **profile** — Profile, EditProfile, FamilyManagement, AddFamilyMember
- **settings** — Settings, PrivacyPolicy
- **support** — Help, Feedback, BugReport
- **help** — FAQ, Troubleshooting

**Component domains** (at `src/components/<domain>/<Component>/__screenshots__/`):
- **ui** — Button, Card, StatusBadge, Toggle, Input, Select, ProgressBar, LoadingStates, etc.
- **trips** — TripCard, CountryFlag, DeadlineBadge, PassportValidityWarning
- **guide** — StepCard, CopyableField, GuideProgress
- **forms** — AutoFilledBadge
- **profile** — DocumentValidityCard, FamilyMemberCard, PassportExpiryBadge
- **submission** — AutoFillBanner

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

## Project-Specific Guidelines

- **NEVER** use raw `View` styles for complex components. Use `src/components/ui/` components.
- **NEVER** use `react-native-vector-icons` directly. Use Lucide icons from `lucide-react-native`.
- **ALWAYS** wrap screens in a responsive container with appropriate max-width for web.
- **FLAGS**: Use `CountryFlag` component; verify canton and star/crescent accuracy for Malaysia.
- **STYLING**: Use NativeWind `className` everywhere. Follow existing Tailwind class patterns.
- **COMPONENTS**: Check `src/components/ui/` before suggesting new primitives.
- **SPACING**: Use Tailwind spacing scale (p-2 = 8px, p-4 = 16px). Never use arbitrary values.

## Running This Skill

1. **Full audit** (recommended): `/visual-audit` — reads existing screen + component screenshots
2. **Fresh screenshots first**: `/capture-screens` then `/visual-audit` — if screenshots are stale
3. **Specific screens**: `/visual-audit` then say "audit the Settings and Profile screens"
4. **Manual screenshots**: Drop screenshots into chat, then `/visual-audit`

After the audit, use `/visual-implement` to apply the fixes.
