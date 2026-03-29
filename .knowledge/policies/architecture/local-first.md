# Policy: Local-First Architecture

## Scope
src/services/, src/stores/, src/components/ (any code handling user data)

## Rules
- REQUIRE: all PII stored on-device only (OS Keychain)
- DENY: sending PII to any external server or API
- DENY: cloud sync of passport/personal data
- ALLOW: device-to-government-portal communication (user-initiated only)
- REQUIRE: app fully functional offline (except portal submission)
- REQUIRE: each family member has isolated storage

## Exceptions
- Apple MapKit search queries send hotel name text (not PII) to Apple servers
- Photon geocoding queries send address text (not PII) to OSM servers

## Anti-patterns
- Analytics SDK that captures passport data
- Crash reporter that logs form field values
- Cloud backup that includes Keychain data
- Shared database between family members

## Enforcement
- `__tests__/structure/pii-boundary.test.ts` — PII stripped before DB persistence
- Manual review required for new external API integrations

## References
- Related: policies/data/pii-boundary.md
- Related: policies/data/storage-tiers.md

## Context
- `.context/external/regulatory/gdpr-data-minimization.md`
- `.context/external/regulatory/pii-has-special-handling-requirements.md`
- `.context/external/customer/travelers-fill-forms-at-borders.md`
- `.context/external/customer/family-travelers-share-devices.md`
- `.context/decisions/001-three-tier-storage.md`
