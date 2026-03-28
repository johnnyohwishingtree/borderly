# Facts: Cognitive

Truths about human perception and reasoning. These rarely change. They justify UX policies.

## f:cog:fewer-fields-higher-completion

Form completion rates decrease as visible field count increases. Cognitive load research consistently shows that reducing visible complexity improves task completion.

**Referenced by:** `beliefs/smart-delta-increases-completion.md`, `policies/ui/ux-writing.md` (empty states need action buttons)

## f:cog:users-skip-error-messages

Users read error messages less than 30% of the time. They click/tap away first, then circle back if forced. Error feedback must be inline, concise, and actionable — not modal paragraphs.

**Referenced by:** `policies/ui/ux-writing.md` (error format: what failed, why, how to fix)

## f:cog:44pt-minimum-touch-target

Apple and Google HIG specify 44x44pt as the minimum reliable touch target size on mobile. Smaller targets cause mis-taps, especially on moving vehicles (airports, planes).

**Referenced by:** `policies/ui/styling.md`, `policies/ui/accessibility.md`

## f:cog:three-font-sizes-max

Using more than 3-4 distinct font sizes on a single screen creates visual noise. The eye can't establish hierarchy with too many competing sizes.

**Referenced by:** `policies/ui/typography.md`

## f:cog:centered-text-slows-reading

Left-aligned body text is faster to read because the eye returns to a consistent left edge. Centered text forces the eye to find a new starting point for each line.

**Referenced by:** `policies/ui/typography.md`

## f:cog:reduced-motion-is-accessibility

Vestibular disorders affect ~35% of adults over 40. Animations that can't be disabled cause physical discomfort (nausea, dizziness). `prefers-reduced-motion` is not optional.

**Referenced by:** `policies/ui/motion.md`
