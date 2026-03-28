# Belief: Smart delta increases form completion

## Status
Working assumption

## Statement
Showing users only the country-specific fields they need to manually fill (the "smart delta") rather than all 30-65 fields increases completion rates and reduces abandonment.

## Evidence
- Form engine docs describe reducing "10-15 min to under 2 min" completion time
- Cognitive load research supports fewer visible fields = higher completion
- No direct user testing data confirming this for Borderly specifically

## What would confirm
- User testing showing >80% form completion rate
- App store reviews mentioning ease of use or speed
- A/B test comparing full-form vs smart-delta completion rates

## What would invalidate
- Users confused about what was auto-filled vs what they entered
- Support tickets about wrong auto-filled values going unnoticed
- Users wanting to review/verify all fields before submission

## Referenced by
- `src/services/forms/formEngine/formEngine.ts` — core smart delta logic
- `.knowledge/models/form-engine.md` — Smart Components section
- `src/components/forms/DynamicForm.tsx` — renders only delta fields
