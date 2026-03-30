# United Kingdom (GBR)

## Portal
- **Name:** UK Electronic Travel Authorisation (ETA)
- **URL:** https://www.gov.uk/apply-electronic-travel-authorisation
- **Account required:** Yes (GOV.UK One Login)
- **Signup URL:** https://www.gov.uk/apply-electronic-travel-authorisation
- **Session timeout:** 60m
- **Save progress:** Yes
- **Status:** `planned`

## Submission Timing
- **Earliest:** 30 days before arrival
- **Latest:** 0h (any time before travel)
- **Recommended:** 72h before arrival
- **Hard deadline:** None (`submissionDeadlineHours: 0`)
- **Processing time:** up to 72h (3 working days)

## Passport
- **Validity required:** 6 months; must be from eligible country

## Family Policy
- **Type:** Individual — each traveler needs own ETA; parents can apply for children from same device

## Sections & Fields
1. **Personal Details** — givenNames, familyName, dateOfBirth, countryOfBirth, nationality, gender (auto-filled); title (optional select); otherNames (country-specific)
2. **Passport Information** — passportNumber, passportCountryOfIssue, passportIssueDate, passportExpiryDate (all auto-filled)
3. **Contact Information** — email, phoneNumber (auto-filled); confirmEmail (country-specific duplicate field)
4. **Home Address** — addressLine1, addressLine2, city, county, postalCode, country (all auto-filled from profile)
5. **Employment** — occupation, employerName (auto-filled); employmentStatus (country-specific select with 6 options)
6. **Travel Information** — arrivalDate, ukAddress (auto-filled); visitPurpose (country-specific select with 7 options)
7. **Security Questions** — criminalRecord, immigrationBreach, ukRefusal, terrorismAssociation (4 country-specific booleans)

## Smart Delta Fields
Typical manual: `visitPurpose`, `employmentStatus`, `confirmEmail`, `criminalRecord` + 3 security questions (5-6 questions).

## Edge Cases
- Requires GOV.UK One Login account (2FA recommended)
- £10 application fee (non-refundable, credit/debit card)
- ETA valid for 2 years or until passport expires — allows multiple visits up to 6 months each
- Gender accepts X (Unspecified) — one of few countries supporting this
- Passport-style photo upload required (taken within last month, plain background)
- Email confirmation field (must re-enter email)
- No physical document needed — linked electronically to passport

## Change Detection
- Monitored selectors: `.eta-application-form`, `.form-section`, `#submit-application`
- Threshold: 10% — triggers notify action

## autoFillMapping Status
- `visitPurpose`: mapped from canonical `PURPOSES_OF_VISIT` enums
- `employmentStatus`: mapped from canonical `OCCUPATIONS` enums
- `occupation`: text field, passes canonical occupation value directly
