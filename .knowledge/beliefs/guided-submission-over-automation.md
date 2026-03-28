# Belief: Guided submission is better than portal automation

## Status
Confirmed

## Statement
The app should guide users through portal submission (showing what to enter where) rather than automating portal interaction directly. The user always submits manually on the government portal.

## Evidence
- Government portal ToS commonly prohibit automated access
- Legal liability: automated submission makes Borderly the actor of record
- Portal instability: automated scrapers break when portals change, creating support burden
- User trust: travelers need to see and confirm what's being submitted to customs
- 1Password model validates this — it fills, the user submits

## What would confirm
- Already confirmed — this is a regulatory and legal constraint, not just a preference

## What would invalidate
- Government portals publishing official APIs for third-party submission
- Legal frameworks explicitly authorizing automated customs declaration submission
- Users consistently requesting "just submit it for me" and churning without it

## Referenced by
- `.knowledge/models/submission-guide.md` — the guided submission model
- `src/screens/SubmissionGuide/` — portal walkthrough screens
- `.knowledge/models/user-journeys.md` — Portal submission journey
