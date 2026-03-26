# Japan (JPN)

## Portal
- **Name:** Visit Japan Web
- **URL:** https://vjw-lp.digital.go.jp/en/registration/
- **Account required:** Yes (email-based)
- **Signup URL:** https://vjw-lp.digital.go.jp/en/registration/
- **Session timeout:** 30m
- **Save progress:** Yes

## Submission Timing
- **Earliest:** 14 days before arrival
- **Latest:** 0h (can submit up to arrival)
- **Recommended:** 72h before arrival
- **Hard deadline:** 24h before arrival (`submissionDeadlineHours: 24`)

## Passport
- **Validity required:** 6 months beyond departure date

## Family Policy
- **Type:** Companion — one account covers the whole family; add companions under your registration

## Sections & Fields
1. **Passport Details** — passportNumber, surname, givenNames, nationality, dateOfBirth, passportExpiry (all auto-filled)
2. **Basic Information** — occupation, homeCountry, homeCity, gender (all auto-filled)
3. **Travel Information** — arrivalDate, flightNumber, airlineCode, arrivalAirport (auto-filled); departureCity, purposeOfVisit, durationOfStay (manual/country-specific)
4. **Accommodation** — hotelName, hotelAddress, hotelPhone (auto-filled from leg)
5. **Customs Declarations** — carryingProhibitedItems, commercialGoods, itemsToDeclareDuty (auto-filled from defaults); currencyOver1M, meatProducts, plantProducts (country-specific)

## Field Type Inventory (Dropdown Fields)
| Field | Portal Type | Schema Type | Options Source | autoFillMapping |
|-------|------------|-------------|----------------|-----------------|
| nationality | dropdown | searchable_select | countries | N/A (ISO codes match) |
| occupation | dropdown | searchable_select | inline (8 options) | canonical → portal values |
| homeCountry | dropdown | searchable_select | countries | N/A (ISO codes match) |
| gender | dropdown | searchable_select | inline (M/F) | N/A (profile uses M/F) |
| airlineCode | dropdown | searchable_select | airlines | N/A (IATA codes match) |
| arrivalAirport | dropdown | searchable_select | airports | N/A (IATA codes match) |
| purposeOfVisit | dropdown | searchable_select | inline (5 options) | canonical → portal values |
| hotelName | autocomplete | searchable_select | accommodations | N/A |

## Smart Delta Fields
Typical manual fields: `departureCity`, `purposeOfVisit`, `currencyOver1M`, `meatProducts`, `plantProducts` (3-5 questions).

## Edge Cases
- Flight number field expects only the numeric part (e.g., "0123" for NH0123)
- Gender only accepts M/F — no X option
- All meat products strictly banned (sausage, ham, jerky)
- Prescription meds with codeine/pseudoephedrine are prohibited
- Duty-free: 3 bottles alcohol (760ml), 400 cigarettes, ¥200,000 goods
- Currency threshold: ¥1,000,000 (~$7,000 USD)

## Change Detection
- Monitored selectors: `.vjw-form`, `.form-section`, `#submit-btn`
- Threshold: 10% — triggers notify action with manual verification message
