# Malaysia (MYS)

## Portal
- **Name:** Malaysia Digital Arrival Card (MDAC)
- **URL:** https://imigresen-online.imi.gov.my/mdac/main
- **Account required:** No
- **Session timeout:** 20m
- **Save progress:** No

## Submission Timing
- **Earliest:** 3 days before arrival
- **Latest:** 0h (any time before arrival)
- **Recommended:** 24h before arrival
- **Hard deadline:** None (`submissionDeadlineHours: 0`)

## Passport
- **Validity required:** 6 months beyond departure date

## Family Policy
- **Type:** None — no account required, submit directly without registration

## Sections & Fields
1. **Personal Information** — surname, givenNames, dateOfBirth, nationality, passportNumber, passportExpiry, gender, email, phoneNumber (all auto-filled)
2. **Travel Information** — arrivalDate, flightNumber (auto-filled); arrivalAirport, purposeOfVisit, durationOfStay (country-specific/manual)
3. **Accommodation** — hotelName, hotelAddress, hotelPhone (auto-filled from leg)
4. **Health and Travel Declarations** — carryingCurrency, carryingProhibitedItems (auto-filled from defaults); healthCondition, visitedHighRiskCountries (country-specific)

## Smart Delta Fields
Typical manual fields: `arrivalAirport`, `purposeOfVisit`, `healthCondition`, `visitedHighRiskCountries` (3-4 questions).

## Edge Cases
- No account needed — form submitted directly (cannot save progress)
- KLIA and KLIA2 are different airports — select correctly
- Currency threshold: RM10,000 or foreign equivalent
- Maximum 90 days stay for tourism
- Session timeout is only 20m — complete promptly

## Change Detection
- Monitored selectors: `.mdac-form`, `.arrival-form`, `#submit-application`
- Threshold: 15% — triggers notify action
