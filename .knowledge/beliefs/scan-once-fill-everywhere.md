# Belief: "Scan once, fill everywhere" is the core value proposition

## Status
Confirmed

## Statement
The primary value of Borderly is that users enter their identity and travel data once (via scanning or manual entry) and it auto-fills every subsequent government form for any destination. The 1Password mental model — fill once, use everywhere — is what users are buying.

## Evidence
- Product architecture is entirely organized around this flow (profile vault + form engine + country schemas)
- Every country schema defines autoFillSource paths back to the same canonical profile fields
- The smart delta design directly implements this: show only what can't be auto-filled
- User journey model starts with profile setup, then assumes data reuse across trips

## What would confirm
- Already confirmed by architecture commitment — this is the product

## What would invalidate
- Users primarily using the app for submission guidance rather than auto-fill
- Users re-entering data manually despite having a profile (trust issues)
- The form-filling value being less important than country-specific travel advice

## Referenced by
- `src/services/forms/formEngine/formEngine.ts` — the engine that implements this
- `src/services/forms/fieldMapper.ts` — dot-notation resolver from profile to fields
- `.knowledge/models/passport.md` — TravelerProfile as the canonical data source
- `.knowledge/models/form-engine.md` — Schema → AutoFillSource relationship
