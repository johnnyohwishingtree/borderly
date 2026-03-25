# South Korea (KOR)

## Portal
- **Name:** Korea K-ETA
- **URL:** https://www.k-eta.go.kr/portal/apply/index.do
- **Account required:** Yes (email-based, per traveler)
- **Signup URL:** https://www.k-eta.go.kr/portal/apply/index.do
- **Session timeout:** 30m
- **Save progress:** Yes

## Submission Timing
- **Earliest:** 3 months before arrival
- **Latest:** 72h before departure (processing takes up to 72h)
- **Recommended:** 7 days before arrival
- **Hard deadline:** 72h before arrival (`submissionDeadlineHours: 72`)

## Passport
- **Validity required:** 6 months beyond entry date

## Family Policy
- **Type:** Individual — each traveler must submit a separate K-ETA application with their own account

## Sections & Fields
1. **Passport Details** — passportNumber, surname, givenNames, nationality, dateOfBirth, gender, passportExpiry, passportIssuingCountry (all auto-filled)
2. **Personal Information** — email, phoneNumber, homeCountry, homeAddress (auto-filled); occupation (country-specific select with 8 options)
3. **Travel Information** — arrivalDate, durationOfStay, flightNumber, airlineCode (auto-filled); purposeOfVisit, arrivalAirport, departureCountry (country-specific)
4. **Accommodation** — hotelName, hotelAddress, hotelPhone (auto-filled from leg)
5. **Health Declaration** — hasSymptoms, hasInfectiousDisease, visitedOutbreakArea (all country-specific)
6. **Customs Declaration** — carryingProhibitedItems, carryingCurrencyOverLimit, carryingCommercialGoods (auto-filled from defaults); exceedsDutyFreeAllowance, carryingAnimalPlantProducts, carryingMedications (country-specific)

## Smart Delta Fields
Typical manual fields: `purposeOfVisit`, `occupation`, `departureCountry`, `hasSymptoms`, `hasInfectiousDisease`, `visitedOutbreakArea` (5-6 questions).

## Edge Cases
- K-ETA approval takes up to 72h — must apply well in advance
- K-ETA valid for 2 years or until passport expiry (multiple entries)
- If denied, applicant must apply for a visa at a Korean embassy
- Duty-free allowance: USD 800 per person
- Currency declaration threshold: USD 10,000
- Strict biosecurity: all food, plant, and animal items must be declared
- Prescription meds may be controlled — carry doctor's letter and original packaging
- Occupation uses a country-specific dropdown (8 categories) instead of free text

## Change Detection
- Monitored selectors: `.k-eta-form`, `.apply-form`, `#submit-btn`
- Threshold: 10% — triggers notify action with manual verification message
