---
name: visual-audit
description: Audit UI/UX using vision and screenshots, get redesign suggestions, and fix usability issues
---

# Visual Audit — UI/UX Iteration Workflow

Perform a comprehensive UI/UX review combining screenshot analysis, AI-powered redesign suggestions, code-level usability auditing, and automated fixes.

## Overview

This skill chains three tools together:
1. **Screenshot Critique** — Claude vision analyzes your screenshots for design issues
2. **Stitch Redesign** (optional) — Google Stitch generates alternative UI designs from your screenshots
3. **Code-Level UX Audit** — The `frontend-design-audit` plugin scans your code for usability violations and auto-fixes them

## Prerequisites

- **Stitch MCP server** (optional): Requires `STITCH_API_KEY` env var. Get your key at https://stitch.withgoogle.com → Profile → Stitch Settings → API Keys → Create Key. Free tier: 350 generations/month.
- **frontend-design-audit plugin**: Should be installed at project scope. If not: `claude plugin install frontend-design-audit@frontend-design-audit --scope project`
- **frontend-design plugin**: Should be installed at project scope. If not: `claude plugin install frontend-design@claude-plugins-official --scope project`

## Steps

### Phase 1: Capture & Critique

1. **Gather screenshots** of the target screens. The user should provide:
   - Screenshots from their device/simulator (drag & drop into chat, or provide file paths)
   - OR specify which screens to audit (you can read the screen source files)

2. **Analyze each screenshot** using vision. Evaluate against these criteria:

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
   - Active/pressed states visible

   **Mobile Patterns**
   - Content reachable without stretching (important actions in thumb zone)
   - No horizontal scroll on single-column layouts
   - Keyboard doesn't obscure inputs being edited
   - Safe area insets respected (notch, home indicator)

   **Loading & Empty States**
   - Loading indicators present for async operations
   - Empty states have helpful messaging (not blank screens)
   - Error states show recovery actions
   - Skeleton screens preferred over spinners for content loading

3. **Rate each finding** with severity:
   - **Critical**: Blocks usability or causes confusion
   - **Major**: Noticeably degrades experience
   - **Minor**: Polish issue, good to fix

4. **Output a structured report** with:
   - Screenshot reference (which screen)
   - Issue description
   - Severity
   - Specific fix suggestion (NativeWind classes, component changes)

### Phase 2: Redesign Suggestions (Optional — requires Stitch MCP)

If the Stitch MCP server is connected:

1. For screens with Critical or Major issues, use Stitch to generate redesign alternatives:
   - Upload the screenshot to Stitch
   - Prompt: "Redesign this [screen type] for a mobile travel app. Modern, clean, accessible. Use the project's primary color (e.g., from tailwind.config.js), white backgrounds, subtle shadows. Focus on [specific issues found in Phase 1]."
   - Generate 2-3 variations

2. Present the variations to the user with commentary on which addresses the identified issues best.

3. If the user selects a direction, use the Stitch output as reference for implementing the redesign.

If Stitch is NOT connected, skip this phase and proceed directly to Phase 3 with specific NativeWind fix suggestions from Phase 1.

### Phase 3: Code-Level UX Audit

1. **Run the frontend-design-audit** against the screen files identified in Phase 1. The plugin evaluates against 15 usability principles and generates a severity-rated report.

2. **Cross-reference** the plugin findings with the visual findings from Phase 1. Deduplicate — don't fix the same issue twice.

3. **Apply fixes** to the code:
   - Use NativeWind `className` props (not inline styles)
   - Use existing components from `src/components/ui/` when available
   - Use Lucide icons via `lucide-react-native` (not vector-icons)
   - Follow the existing component patterns in the codebase

4. **Run checks after fixing**:
   - `pnpm typecheck` — must pass
   - `pnpm test` — must pass
   - `pnpm lint` — no new errors

### Phase 4: Before/After Summary

1. Summarize all changes made with before/after descriptions
2. List any remaining issues that require manual design decisions (the user needs to choose between options)
3. Suggest next screens to audit

## Project-Specific Guidelines

- **NEVER** use raw `View` styles for complex components. Use `src/components/ui/` components.
- **NEVER** use `react-native-vector-icons` directly. Use Lucide icons from `lucide-react-native`.
- **ALWAYS** wrap screens in a responsive container with appropriate max-width for web.
- **FLAGS**: Use `CountryFlag` component; verify canton and star/crescent accuracy for Malaysia.
- **STYLING**: Use NativeWind `className` everywhere. Follow existing Tailwind class patterns in the codebase.
- **COMPONENTS**: Check `src/components/ui/` before creating new primitive components — likely one already exists.
- **SPACING**: Use Tailwind spacing scale (p-2 = 8px, p-4 = 16px, etc). Never use arbitrary values.

## Running This Skill

The user can invoke this skill in several ways:

1. **With screenshots**: Drag screenshots into chat, then type `/visual-audit`
2. **With screen names**: `/visual-audit` then specify "audit the TripDetailScreen and CreateTripScreen"
3. **Full app audit**: `/visual-audit` then specify "audit all main screens"

For the best results, provide actual screenshots from the simulator — reading source code alone misses runtime rendering issues like icon failures, truncated text, and layout overflow.
