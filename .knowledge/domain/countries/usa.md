# United States (USA)

## Portal
- **Name:** CBP One (Customs Declaration)
- **URL:** https://cbpone.cbp.dhs.gov/
- **Account required:** Yes
- **Signup URL:** https://cbpone.cbp.dhs.gov/
- **Session timeout:** 7 days
- **Save progress:** Yes
- **Status:** `planned` — schema exists, implementation not yet complete

## Submission Timing
- **Earliest:** 730 days (2 years) before arrival
- **Latest:** 72h before boarding
- **Recommended:** 14 days before arrival
- **Hard deadline:** 72h before arrival (`submissionDeadlineHours: 72`)
- **Processing time:** 72h
- **Blackout:** July 4-6 (Independence Day — extended processing)

## Passport
- **Validity required:** 6 months; must be e-passport with chip

## Family Policy
- **Type:** Companion — one family account, add all travelers together in CBP One

## Sections & Fields
1. **Applicant Information** — surname, firstName, dateOfBirth, gender (auto-filled); middleName, cityOfBirth, countryOfBirth (manual); aliases (country-specific boolean)
2. **Passport Information** — passportNumber, passportCountry, passportIssueDate, passportExpirationDate (auto-filled); issuingAuthority (optional)
3. **Contact Information** — homeAddress, email (auto-filled); homePhone, workPhone (optional)
4. **Employment** — jobTitle (auto-filled from occupation); employer, employerAddress, employerPhone (manual)
5. **Emergency Contact** — emergencyContactName, emergencyContactPhone, emergencyContactEmail (all country-specific)
6. **Travel Information** — addressInUS (auto-filled from accommodation); purposeOfTravel (country-specific); contactPersonUS, contactPhoneUS (optional)
7. **Eligibility Questions** — 12 yes/no security questions (all country-specific): criminal history, drug convictions, terrorism, visa refusals, etc.

## Smart Delta Fields
Typical manual: `aliases`, `cityOfBirth`, `countryOfBirth`, `employer`, `employerAddress`, `emergencyContactName`, `emergencyContactPhone`, `purposeOfTravel` + 12 eligibility questions (~8 manual + 12 booleans).

## Edge Cases
- Separate from ESTA — travelers may need both CBP One declaration AND ESTA
- $21 authorization fee required (credit card prerequisite)
- 12 eligibility yes/no questions — "Yes" to any may require visa instead
- Change detection threshold is only 5% — very sensitive, triggers "disable" action (not just notify)
- Employer field accepts "UNEMPLOYED"; students enter school name

## Change Detection
- Monitored selectors: `.cbp-form`, `.declaration-section`, `#submit-declaration`
- Threshold: 5% — triggers **disable** action (not just notify)

## autoFillMapping Status
- `purposeOfTravel`: mapped from canonical `PURPOSES_OF_VISIT` enums
- `jobTitle`: text field, passes canonical occupation value directly
