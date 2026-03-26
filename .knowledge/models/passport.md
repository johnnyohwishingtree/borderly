# Model: Passport

## Entities

### TravelerProfile
- Properties: `id`, `passportNumber`, `surname`, `givenNames`, `nationality`, `dateOfBirth`, `gender`, `passportExpiry`, `issuingCountry`
- Storage: OS Keychain (PII — never in MMKV or WatermelonDB)
- One per family member, up to 8 per device

### MRZ (Machine Readable Zone)
- Format: TD3 (passport), 2 lines, 44 characters each
- Parsed by: `src/services/passport/mrzScanner.ts`
- Captured via: camera (ML Kit text recognition) or manual entry

### FamilyMember
- Relationships: self, spouse, child, parent, sibling, other
- Each has isolated Keychain storage with unique encryption keys
- Deletion securely removes all associated data

## Relationships
```
Device 1──* TravelerProfile (max 8)
TravelerProfile 1──1 MRZ (parsed from passport scan)
TravelerProfile 1──1 FamilyRelationship
TravelerProfile 1──* TripLeg (via assignedTravelers)
```

## Invariants
- Primary profile (relationship: self) cannot be deleted
- Passport expiry must be checked against travel dates
- MRZ checksum must validate before accepting scan

## Validity Checks
- Passport expired → warning on trip detail
- Passport expires within 6 months of travel → warning
- Some countries require 6+ months validity from entry date

## Key Files
- `src/services/passport/mrzScanner.ts` — MRZ parsing
- `src/services/storage/keychain.ts` — Keychain CRUD
- `src/hooks/usePassportScan.ts` — scan orchestration
- `src/hooks/usePassportValidity.ts` — expiry checks
