# Singapore (SGP)

## Portal
- **Name:** SG Arrival Card
- **URL:** https://eservices.ica.gov.sg/sgarrivalcard
- **Account required:** No
- **Session timeout:** 15m
- **Save progress:** No

## Submission Timing
- **Earliest:** 3 days before arrival
- **Latest:** 0h (can submit up to arrival)
- **Recommended:** 24h before arrival
- **Hard deadline:** 72h before arrival (`submissionDeadlineHours: 72`)

## Passport
- **Validity required:** 6 months beyond entry date

## Family Policy
- **Type:** None — no account required, submit directly

## Sections & Fields
1. **Personal Information** — surname, givenNames, dateOfBirth, nationality, passportNumber, passportExpiry, gender, email, phoneNumber (all auto-filled)
2. **Travel Information** — arrivalDate, flightNumber, airlineCode, arrivalAirport (auto-filled); arrivalTime, departureCity, purposeOfVisit, intendedLengthOfStay (manual/country-specific)
3. **Accommodation Details** — accommodationName, accommodationAddress, accommodationPhone (auto-filled); accommodationType (country-specific select)
4. **Health Declaration** — feverSymptoms, infectiousDisease, visitedOutbreakArea, contactWithInfected (all country-specific)
5. **Customs Declaration** — exceedsAllowance, carryingCash, prohibitedGoods, commercialGoods (auto-filled from defaults)

## Smart Delta Fields
Typical manual fields: `arrivalTime`, `departureCity`, `purposeOfVisit`, `accommodationType`, `feverSymptoms` + health questions (4-5 questions).

## Edge Cases
- Single-step portal (not multi-step) — all sections on one page
- Session timeout is only 15m — shortest among all portals
- Chewing gum is generally prohibited in Singapore
- Currency threshold: S$20,000
- Duty-free: 1L wine + 1L spirits, 200 cigarettes, S$150 confectionery
- Strict drug trafficking penalties
- Replaces the physical arrival card previously distributed on flights

## Change Detection
- Monitored selectors: `.sg-arrival-form`, `.ica-form`, `#submit-card`
- Threshold: 10% — triggers notify action

## autoFillMapping Status
- `purposeOfVisit`: mapped from canonical `PURPOSES_OF_VISIT` enums
