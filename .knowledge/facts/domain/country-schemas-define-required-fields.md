# Fact: Country Schemas Define Required Fields for Customs Declarations

Each supported country has a JSON schema (`src/schemas/{CODE}.json`) that defines the exact fields required for its customs/immigration declaration. Fields are categorized by source:

**Profile-sourced** (auto-filled from passport scan):
- surname, givenNames, dateOfBirth, nationality, passportNumber, passportExpiry, gender

**Trip-sourced** (auto-filled from trip leg data):
- arrivalDate, flightNumber, arrivalAirport, accommodation (name + address), duration

**User-entered** (must be manually provided per trip):
- email, phoneNumber, purposeOfVisit, health declarations, customs declarations

The `autoFillSource` field in each schema entry defines the dot-notation path to resolve the value (e.g., `profile.surname`, `leg.flightNumber`). Fields without an `autoFillSource` require manual entry.

Currently 14 countries supported. Each has different required fields, but all share the profile-sourced core.
