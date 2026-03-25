# Thailand (THA)

## Portal
- **Name:** Thailand Digital Arrival Card (Coming Soon)
- **URL:** https://tp.consular.go.th/ (former Thailand Pass — new TDAC URL not yet confirmed)
- **Account required:** No
- **Session timeout:** 30m
- **Save progress:** Yes
- **Status:** `coming_soon` — Thailand Pass (COVID-era) was discontinued May 2022; TDAC is under development

## Submission Timing
- **Earliest:** 7 days before arrival
- **Latest:** 0h (can submit up to arrival)
- **Recommended:** 72h before arrival
- **Hard deadline:** 72h before arrival (`submissionDeadlineHours: 72`)
- **Processing time:** 24h

## Passport
- **Validity required:** 6 months

## Family Policy
- **Type:** None — no account required, submit directly

## Sections & Fields
1. **Personal Information** — title (select: Mr/Mrs/Ms/Dr), firstName, lastName, dateOfBirth, nationality, passportNumber, passportExpiry (auto-filled)
2. **Travel Information** — arrivalDate, flightNumber (auto-filled); departureCountry, purposeOfVisit, lengthOfStay (manual)
3. **Accommodation** — hotelName, hotelAddress, hotelPhone (auto-filled); accommodationType (country-specific select with 7 options)
4. **Health and Vaccination** — vaccinationStatus, hasInsurance, emergencyContact (all country-specific)

## Smart Delta Fields
Typical manual fields: `departureCountry`, `purposeOfVisit`, `accommodationType`, `vaccinationStatus`, `hasInsurance`, `emergencyContact` (5-6 questions).

## Edge Cases
- Schema has `implementationStatus: coming_soon` — portal may not be live
- Uses `title` field (Mr/Mrs/Ms/Dr) — most other countries don't require this
- Uses `firstName`/`lastName` instead of `givenNames`/`surname`
- Max stay: 60 days (vs 90 for most other countries)
- Accommodation booking confirmation is a prerequisite
- Vaccination certificate upload may be required
- Emergency contact in Thailand required (hotel counts)

## Change Detection
- Monitored selectors: `#main-form`, `.form-section`, `.submit-button`
- Threshold: 15% — triggers notify action
