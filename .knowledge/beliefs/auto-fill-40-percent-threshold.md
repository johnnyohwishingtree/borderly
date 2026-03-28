# Belief: 40% auto-fill rate is the minimum useful threshold

## Status
Hypothesis

## Statement
A country schema needs at least 40% of its fields auto-fillable from the user's profile and trip data to provide meaningful value over manual entry. Below this threshold, the app feels like a form viewer rather than a form filler.

## Evidence
- Japan schema: 43% auto-fill rate — feels useful in practice
- Logical inference: if more than half the fields need manual entry, the time savings are marginal
- No user data or A/B testing to validate the 40% number specifically

## What would confirm
- User engagement data showing drop-off for countries below 40%
- User feedback comparing "useful" vs "not worth it" countries correlating with auto-fill rate
- Competitive analysis showing similar thresholds in 1Password-style products

## What would invalidate
- Users finding value even at 20-30% auto-fill (the guidance alone is enough)
- The submission guide + portal walkthrough providing value independent of auto-fill rate
- Users valuing the structured data storage (vault) regardless of fill percentage

## Referenced by
- `src/schemas/*.json` — each schema's implicit auto-fill rate
- `.knowledge/patterns/add-country.md` — Step 0 audits portal and targets auto-fill coverage
- `.knowledge/policies/data/schema-fields.md` — field categorization rules
