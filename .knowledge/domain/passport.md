# Passport & MRZ

## MRZ (Machine Readable Zone)
The 2-line code at the bottom of passport photo pages. TD3 format, 44 chars per line. Contains: name, passport number, nationality, DOB, gender, expiry.

Parsed by `src/services/passport/mrzParser.ts`. Camera scanning via `mrzScanner.ts` using ML Kit text recognition.

## Passport validity
`src/services/passport/passportValidity.ts` — checks if passport meets destination country's minimum validity requirement (varies by country, stored in schema as `passportValidityMonths`).

## Family profiles
Up to 8 family members per device. Each has isolated Keychain storage with unique encryption keys. Relationships: self, spouse, child, parent, sibling, other.

## Known gaps
