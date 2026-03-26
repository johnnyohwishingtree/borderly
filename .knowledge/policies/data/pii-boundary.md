# Policy: PII Boundary

## Scope
src/services/, src/hooks/, src/utils/, src/schemas/

## Rules
- DENY: passport number, DOB, passport expiry persisted to WatermelonDB
- DENY: surname, givenNames persisted to WatermelonDB
- REQUIRE: `stripPIIFromFormData()` called before any form data save to DB
- DENY: PII in `console.log` — even in development
- DENY: PII sent to analytics, crash reporters, or external APIs
- REQUIRE: clipboard auto-clear after 60 seconds when passport data is copied
- REQUIRE: app lock after 5 minutes of inactivity
- REQUIRE: each family member has isolated Keychain entries + encryption keys
- REQUIRE: family member deletion securely removes all associated data

## Exceptions
- PII is loaded into memory for form generation (auto-fill) — this is expected
- PII appears in the UI for display — this is expected
- Shared Keychain access group for AutoFill extension — same device, same user

## Anti-patterns
- `updateTripLeg(leg.id, { formData: getFormData() })` — raw form data contains PII
- `console.log(profile)` — logs passport data
- Crash reporter capturing form field values
- Shared database between family members

## Enforcement
- `__tests__/structure/pii-boundary.test.ts` — verifies stripPIIFromFormData usage + field stripping

## References
- Related: policies/data/storage-tiers.md
- Related: policies/architecture/local-first.md
