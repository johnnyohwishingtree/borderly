# New Zealand (NZL)

## Portal
- **Name:** New Zealand Traveller Declaration (NZTD)
- **URL:** https://www.nztravellerdeclaration.govt.nz
- **Account required:** No (submit as guest with email for reference code)
- **Session timeout:** 30m
- **Save progress:** No

## Submission Timing
- **Earliest:** 72h before arrival
- **Latest:** 24h before arrival
- **Recommended:** 48h before arrival
- **Hard deadline:** 24h before arrival (`submissionDeadlineHours: 24`)

## Passport
- **Validity required:** 3 months beyond intended stay (lower than most countries' 6 months)

## Family Policy
- **Type:** None — no account required, submit as guest with email

## Sections & Fields
1. **Personal Information** — familyName, givenNames, dateOfBirth, gender, nationality, passportNumber, passportExpiry, passportCountry, email (all auto-filled)
2. **Travel Information** — flightNumber, arrivalDate, arrivalAirport (auto-filled); purposeOfVisit, departureCountry (country-specific); intendedLengthOfStay (auto-filled, max 365 days)
3. **Address in New Zealand** — nzAddressLine1, nzAddressCity (auto-filled from leg); nzAddressPostcode (4-digit, auto-filled)
4. **Biosecurity Declarations** — hasFoodItems, hasPlantItems, hasAnimalItems, hasSoilOrWaterItems (4 country-specific booleans)
5. **Goods Declarations** — hasCurrencyOver10000, hasControlledItems, hasGoodsExceedingAllowance (3 country-specific booleans)

## Smart Delta Fields
Typical manual: `purposeOfVisit`, `departureCountry` + 7 biosecurity/goods booleans (2 manual + 7 booleans).

## Edge Cases
- Only 3 months passport validity required (vs 6 months elsewhere)
- Latest submission is 24h before arrival (not 0h like most)
- Gender accepts X ("Another gender")
- Among strictest biosecurity in the world — NZD 400 fine for undeclared items
- Duty-free: NZD 700 goods, 3L alcohol (18+), 50 cigarettes or 50g tobacco (18+)
- Currency threshold: NZD 10,000
- Postcode validation: exactly 4 digits
- Multiple international airports: AKL, CHC, WLG, ZQN
- No QR code issued — border officers verify via passport scan
- Reference code sent by email after submission

## Change Detection
- Monitored selectors: `#nztd-form`, `.nztd-section`, `.submit-button`, `.declaration-section`
- Threshold: 15% — triggers notify action
