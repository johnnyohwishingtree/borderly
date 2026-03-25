# Canada (CAN)

## Portal
- **Name:** Electronic Travel Authorization (eTA) — Archived
- **URL:** https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html
- **Account required:** No
- **Session timeout:** 20m
- **Save progress:** No
- **Status:** `archived` — ArriveCAN discontinued Oct 2023; eTA still required but not browser-automatable

## Submission Timing
- **Earliest:** 730 days (2 years) before arrival
- **Latest:** 0h (any time before boarding)
- **Recommended:** 72h before arrival
- **Hard deadline:** None (`submissionDeadlineHours: 0`)
- **Processing time:** 24h (most approved within minutes)

## Passport
- **Validity required:** 6 months; must be from visa-exempt country

## Family Policy
- **Type:** None — no account required, apply directly

## Sections & Fields
1. **Personal Information** — surname, givenNames, dateOfBirth, countryOfBirth, gender (auto-filled); previousNames, maritalStatus (country-specific)
2. **Nationality and Citizenship** — nationality (auto-filled); dualCitizenship, immigrationStatus (country-specific)
3. **Passport Information** — passportNumber, passportCountry, passportIssueDate, passportExpiryDate (all auto-filled)
4. **Contact Information** — email (auto-filled); confirmEmail (country-specific duplicate)
5. **Address Information** — homeAddress, homeCountry (auto-filled)
6. **Employment** — occupation, employerName (auto-filled)
7. **Travel Information** — purposeOfVisit, fundingSource (both country-specific)
8. **Background Information** — 7 yes/no questions: criminalOffence, immigrationOffence, medicalCondition, tuberculosis, governmentPosition, militaryService, warCrimes

## Smart Delta Fields
Typical manual: `maritalStatus`, `previousNames`, `dualCitizenship`, `immigrationStatus`, `confirmEmail`, `purposeOfVisit`, `fundingSource` + 7 background questions (7 manual + 7 booleans).

## Edge Cases
- ArriveCAN discontinued — no pre-arrival digital declaration needed currently
- eTA is CAD $7 (credit card), valid for 5 years or until passport expires
- US citizens do not need an eTA
- Cannot save progress — must complete in one session (20m timeout)
- Marital status includes "Common-law" and "Annulled" options (unique to Canada)
- Tuberculosis question is country-specific (unusual)
- "Funding source" question (how you support yourself) — unique to Canada

## Change Detection
- Monitored selectors: `.eta-form`, `.form-group`, `#submit-eta`
- Threshold: 10% — triggers notify action
