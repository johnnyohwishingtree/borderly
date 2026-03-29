# Fact: Create Trip Screen Has 12+ Fields

The Create Trip screen requires filling 12+ fields in a single scrolling form:
- Trip name
- Country selection
- Arrival date
- Flight number, airline code, arrival airport
- Accommodation name
- Address: line 1, line 2, city, state, postal code, country
- Phone

The screen scrolls significantly past the fold. The E2E test requires 12 `fillById`/`selectById` calls for this single screen.

Source: `src/screens/trips/CreateTripScreen/`
