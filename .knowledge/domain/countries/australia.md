# Australia (AUS)

## Portal
- **Name:** ABF Digital Incoming Passenger Card (DIPC)
- **URL:** https://online.abf.gov.au/incoming-passenger-card/
- **Account required:** No
- **Session timeout:** 30m
- **Save progress:** No

## Submission Timing
- **Earliest:** 72h before flight
- **Latest:** 0h (before arrival)
- **Recommended:** 48h before arrival
- **Hard deadline:** None (`submissionDeadlineHours: 0`)

## Passport
- **Validity required:** 6 months beyond intended stay

## Family Policy
- **Type:** None — each traveller submits their own DIPC without registration

## Sections & Fields
1. **Personal Information** — familyName, givenNames, dateOfBirth, gender, countryOfBirth, nationality, passportNumber, passportExpiry, passportCountry (all auto-filled)
2. **Travel Information** — flightNumber, arrivalDate (auto-filled); seatClass, lastCountryVisited, purposeOfVisit (country-specific); intendedLengthOfStay (auto-filled, max 365 days)
3. **Address in Australia** — australianAddressLine1, australianAddressCity (auto-filled from leg); australianAddressState (country-specific select — 8 states/territories), australianAddressPostcode (4-digit, auto-filled)
4. **Biosecurity Declarations** — hasFoodItems, hasPlantItems, hasAnimalItems, hasBiosecurityRiskItems, hasSoilOrWater (5 country-specific booleans)
5. **Customs Declarations** — hasControlledGoods, hasCurrencyOver10000, hasGoodsExceedingAllowance, hasCommercialGoods (4 country-specific booleans)

## Smart Delta Fields
Typical manual: `seatClass`, `lastCountryVisited`, `purposeOfVisit`, `australianAddressState` + 9 biosecurity/customs booleans (4 manual + 9 booleans).

## Edge Cases
- Gender accepts X (Unspecified)
- Replaces the old paper Incoming Passenger Card
- Strict biosecurity: AUD 420 on-the-spot fine for undeclared items
- Duty-free: AUD 900 adults; alcohol 2.25L per adult 18+; tobacco 25 cigarettes or 25g
- Currency threshold: AUD 10,000
- State/territory is a fixed select of 8 options (ACT, NSW, NT, QLD, SA, TAS, VIC, WA)
- Postcode validation: exactly 4 digits
- No QR code issued — ABF verifies via passport scan at arrival

## Change Detection
- Monitored selectors: `#dipc-form`, `.form-section`, `.submit-button`, `.declaration-section`
- Threshold: 15% — triggers notify action

## autoFillMapping Status
- `purposeOfVisit`: mapped from canonical `PURPOSES_OF_VISIT` enums
