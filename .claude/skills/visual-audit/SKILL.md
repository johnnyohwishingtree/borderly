---
name: visual-audit
description: Audit UI/UX using vision and screenshots, get redesign suggestions, and fix usability issues
---

# Visual Audit — UI/UX Review

Analyze the app's visual state and produce a structured report of UI/UX issues. This skill is read-only — it identifies problems but does NOT implement fixes. Use `/visual-implement` to apply fixes.

## Prerequisites

- **Screenshots**: Run `/capture-screens` first, or provide your own screenshots
  - **Playwright screenshots** (default): Captured via React Native Web — fast, local, but portal screens show iframe-blocked content
  - **Native screenshots**: Captured post-merge by `screenshot-capture.yml` on Android emulator via Maestro — true native rendering
- **Stitch MCP server** (optional): For AI-generated redesign alternatives. Requires `STITCH_API_KEY` env var.
- **frontend-design-audit plugin** (optional): For code-level usability scanning

## Steps

### Step 1: Load Manifest

1. **Read `e2e/screenshots/manifest.json`** — it describes each screen's purpose, state, and domain.

2. **If no screenshots exist**, run the capture:
```bash
E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
```

3. If the user provided specific screenshots or screen names, focus on those instead of the full set.

### Step 2: Batched Visual Critique

Process screenshots **one domain at a time** to stay within context limits. The domains are:
- **onboarding** — Welcome, Tutorial, PassportScan, ConfirmProfile, BiometricSetup
- **trips** — TripList, CreateTrip, TripDetail, LegForm, SubmissionGuide (JPN/MYS/SGP/VNM/CAN), PortalSubmission (JPN/MYS/SGP/VNM/CAN)
- **wallet** — QRWallet, AddQR, QRDetail
- **profile** — Profile, EditProfile, FamilyManagement, AddFamilyMember
- **settings** — Settings, Help, FAQ, Troubleshooting, Feedback, BugReport, PrivacyPolicy

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

### Step 3: Rate & Report

Rate each finding with severity:
- **Critical**: Blocks usability or causes confusion
- **Major**: Noticeably degrades experience
- **Minor**: Polish issue, good to fix

Output a structured report with:
- Screenshot reference (filename from manifest)
- Screen name (from manifest)
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

1. **Full audit** (recommended): `/capture-screens` first, then `/visual-audit`
2. **With existing screenshots**: `/visual-audit` — reads from `e2e/screenshots/`
3. **Specific screens**: `/visual-audit` then say "audit the Settings and Profile screens"
4. **Manual screenshots**: Drop screenshots into chat, then `/visual-audit`

After the audit, use `/visual-implement` to apply the fixes.
