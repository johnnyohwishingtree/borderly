# Fact: Auto-Fill Requires Flight and Accommodation on the Trip Leg

The auto-fill system resolves field values from `autoFillSource` paths defined in country schemas. For Malaysia (MYS), these required fields pull from the trip leg — NOT the profile:

- `leg.flightNumber` → Flight Number (required)
- `leg.arrivalAirport` → Arrival Airport (required)
- `leg.accommodation.name` → Hotel Name (required)
- `leg.accommodation.address._formatted` → Hotel Address (required)
- `leg._calculatedDuration` → Duration of Stay (computed from arrival/departure dates)

If these fields are empty on the TripLeg object, auto-fill skips them. The form completion percentage drops from ~81% to ~55%, falling below the 50% auto-fill sufficiency threshold.

This means flight/accommodation data must be collected BEFORE portal submission for auto-fill to work. Where it's collected (create trip vs leg form) is flexible, but it must end up on the TripLeg.

Source: `src/services/forms/fieldMapper.ts`, `src/schemas/MYS.json`
