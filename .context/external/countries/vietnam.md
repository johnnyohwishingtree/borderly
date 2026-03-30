# Vietnam (VNM)

## Portal
- **Name:** Vietnam e-Visa Portal
- **URL:** https://evisa.xuatnhapcanh.gov.vn/
- **Account required:** No
- **Session timeout:** 20m
- **Save progress:** No
- **Status:** `planned` — schema exists but implementation not yet complete

## Submission Timing
- **Earliest:** 30 days before arrival
- **Latest:** 3 days before arrival (business days)
- **Recommended:** 14 days before arrival
- **Hard deadline:** 72h before arrival (`submissionDeadlineHours: 72`)
- **Processing time:** 72h (2-3 business days)

## Passport
- **Validity required:** 6 months

## Family Policy
- **Type:** None — no account required, apply directly

## Sections & Fields
1. **Personal Information** — surname, givenName, dateOfBirth, gender, nationality (auto-filled); middleName, placeOfBirth (manual); religion (country-specific select with 7 options)
2. **Passport Information** — passportNumber, passportExpiry (auto-filled); passportType (select), passportIssuedDate, passportIssuingAuthority (manual)
3. **Travel Information** — entryDate (auto-filled); purposeOfVisit, entryPort (country-specific selects); stayDuration (auto-filled); previousVietnamVisit (country-specific boolean)
4. **Accommodation** — hotelName, hotelAddress, hotelPhone (auto-filled); accommodationType, cityOfStay (country-specific selects with 7-9 options)
5. **Contact Information** — homeAddress, phoneNumber, email (auto-filled); emergencyContactName, emergencyContactPhone (country-specific)

## Smart Delta Fields
Typical manual fields: `religion`, `placeOfBirth`, `passportIssuingAuthority`, `purposeOfVisit`, `entryPort`, `previousVietnamVisit`, `accommodationType`, `cityOfStay`, `emergencyContactName`, `emergencyContactPhone` (8-10 questions — higher than average).

## Edge Cases
- More manual fields than most countries (~10 smart delta questions)
- Religion field is mandatory — unusual among travel forms
- Place of birth required (city + country)
- Passport issue date and issuing authority required (not just expiry)
- Port of entry is a fixed select of 7 airports/borders (not a searchable airport list)
- Tourist e-visa max 30 days (shorter than most countries' 90-day limit)
- Visa fee ~$25 USD, credit card payment required (prerequisite)
- Document upload required: passport data page photo + portrait photo (JPEG, max 1MB)
- Cannot save progress — must complete in one session within 20m

## Change Detection
- Monitored selectors: `.evisa-form`, `.application-section`, `#submit-application`
- Threshold: 20% — triggers notify action

## autoFillMapping Status
- `purposeOfVisit`: mapped from canonical `PURPOSES_OF_VISIT` enums
