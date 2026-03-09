---
name: visual-audit
description: Audit the UI/UX using vision and screenshots
---

# Visual Audit

Perform a comprehensive visual review of the application's UI/UX to ensure high-fidelity design, consistent layout, and professional aesthetics across all platforms.

## Steps

1. **Capture Screenshots**: Run the application on Web, iOS, or Android and capture high-resolution screenshots of the target screens.
2. **Analyze Aesthetics**:
    - **Icons**: Are icons rendering correctly as SVGs/Fonts, or are they broken as text labels?
    - **Alignment**: Check for consistent spacing (use 4px/8px grid), centering, and margins.
    - **Typography**: Verify font weights and sizes are hierarchy-correct.
    - **Color Palette**: Ensure use of defined primary/secondary colors.
3. **Platform Check**:
    - **Web**: Does the layout "stretch" unnaturally on wide screens? (Max-width should be applied).
    - **Mobile**: Are touch targets large enough (min 44px)?
4. **Identify Component Regressions**:
    - Compare against "Gold Standard" reference screens (e.g., `WelcomeScreen.tsx`).
5. **Document & Fix**:
    - Document visual bugs with specific CSS/Tailwind class suggestions.
    - Apply fixes using Gluestack UI components to ensure cross-platform consistency.

## Guidelines

- **NEVER** use raw `View` styles for complex components. Use `src/components/ui/gluestack` components.
- **NEVER** use `react-native-vector-icons` directly on Web without font injection. Prefer `Icon` from our Gluestack wrapper (Lucide-based).
- **ALWAYS** wrap screens in a responsive container with appropriate max-width for web.
- **FLAGS**: Use `CountryFlag` component; verify canton and star/crescent accuracy for Malaysia.
