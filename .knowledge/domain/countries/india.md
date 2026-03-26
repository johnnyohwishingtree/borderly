# India (IND) — Air Suvidha / e-Arrival Card

## Portal
- **Name:** Air Suvidha / e-Arrival Card
- **URL:** https://www.newdelhiairport.in/airsuvidha
- **Account required:** No
- **Fee:** Free

## Form Structure
The India e-Arrival Card has 6 sections:

### 1. Personal Information
- Surname, given name, middle name (as on passport)
- Date of birth, place of birth
- Gender (Male / Female / Other — India legally recognizes third gender)
- Nationality
- Occupation/Profession (dropdown with Indian categories: Business/Trade, Government Service, Professional, Student, Retired, Homemaker, Journalist/Media, Diplomat, Other)

### 2. Passport Information
- Passport type (Ordinary, Diplomatic, Official, Service)
- Passport number, issue date, expiry date, issuing country
- Visa number and visa type (Tourist, Business, Employment, Student, Medical, Conference, Transit, e-Tourist, e-Business, e-Medical, Visa on Arrival, Other)

### 3. Travel Information
- Purpose of visit (Tourism, Business, Employment, Study, Medical, Conference, Transit, Pilgrimage, Family Visit, Other)
- Date of arrival, flight number
- Port of arrival (10 major international airports: DEL, BOM, BLR, MAA, CCU, HYD, COK, GOI, AMD, JAI)
- Country of departure
- Intended length of stay (1–180 days for tourist visa)
- Address and city in India
- Previous India visit (yes/no)

### 4. Health Declaration
- Countries visited in last 14 days
- Fever/cough/breathing difficulty (yes/no)
- Contact with infected persons in last 14 days (yes/no)

### 5. Customs Declaration
- Currency exceeding USD 5,000 (yes/no) + amount if yes
- Dutiable goods: alcohol, tobacco, electronics exceeding duty-free allowance
- Prohibited/restricted items: narcotics, firearms, wildlife products
- Commercial goods (yes/no)

### 6. Contact Information
- Permanent home address
- Phone number, email
- Emergency contact name and phone

## Country-Specific Notes
- India recognizes three genders legally (Male, Female, Other)
- "Pilgrimage" is a distinct purpose of visit — India is a major religious tourism destination
- Visa types include multiple e-Visa categories (e-Tourist, e-Business, e-Medical)
- Duty-free allowances: 1L alcohol, 100 cigarettes or 25 cigars, electronics up to INR 50,000
- Currency declaration threshold: USD 5,000 or equivalent in foreign currency
- Passport must be valid for at least 6 months from date of arrival
- Each traveler submits individually (no family/group submissions)
- The arrival card can be submitted up to 14 days before arrival; no fee required

## autoFillMapping Status
- `occupation`: mapped from canonical `OCCUPATIONS` enums (updated to canonical keys)
- `purposeOfVisit`: mapped from canonical `PURPOSES_OF_VISIT` enums
