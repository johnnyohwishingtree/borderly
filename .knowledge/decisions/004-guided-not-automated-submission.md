# Decision: Guided Submission, Not Automated

## Status
Accepted

## Context
Government portal Terms of Service commonly prohibit automated access. Automated submission makes the app the legal actor of record, creating liability. Portal DOM changes would break scrapers and create support burden.

## Decision
The app pre-fills and validates form data, then guides the user through the government portal submission. The user always opens the portal, authenticates with their own credentials, reviews the data, and submits manually. The app never submits on behalf of the user.

## Derives from
- `facts/regulatory/portal-tos-prohibit-automation.md`
- `facts/regulatory/human-must-be-actor-of-record.md`
- `facts/domain/portals-are-not-apis.md`
- `facts/market/government-portals-have-no-third-party-integrations.md`
- `facts/domain/submission-deadlines-vary-widely.md`
- `principles/user-always-submits.md`
- `beliefs/guided-submission-over-automation.md`

## Consequences
- No portal scraping service needed (eliminates maintenance burden)
- User must manually interact with each portal (friction)
- App value is in data preparation and guidance, not automation
- Submission guide UI must be clear enough to walk users through unfamiliar portals
