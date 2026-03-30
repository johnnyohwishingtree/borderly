# Decision: Local-First, No Cloud Storage of PII

## Status
Accepted

## Context
Travel identity data (passport numbers, visa details, family member info) is highly regulated under GDPR, CCPA, and national privacy laws. Storing it on servers creates breach liability, compliance overhead, and user trust concerns.

## Decision
All PII stays on-device. No server stores passport data. The app works fully offline except for portal submission (which is user-initiated on the government website). Cross-device sync of PII is explicitly out of scope.

## Derives from
- `facts/regulatory/gdpr-data-minimization.md`
- `facts/regulatory/pii-has-special-handling-requirements.md`
- `facts/customer/travelers-fill-forms-at-borders.md`
- `principles/security-through-storage-tiers.md`
- `beliefs/local-first-is-differentiator.md`

## Consequences
- No server infrastructure for user data (reduces cost and liability)
- No cross-device sync — users must re-scan on each device
- Backup/restore is device-local only
- If device is lost, all data is lost (mitigated by biometric lock)
