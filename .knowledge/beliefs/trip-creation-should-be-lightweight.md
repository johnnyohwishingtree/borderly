# Belief: Trip Creation Should Be Lightweight

Creating a trip should require only the essential fields: trip name and destination country. Flight and accommodation details should be collected on the **leg form** before portal submission — not on the create trip screen.

**Constraint:** Auto-fill requires flight/accommodation data on the TripLeg object (see `facts/domain/autofill-requires-leg-data.md`). These fields must be filled SOMEWHERE before portal submission. Moving them from create trip to leg form is valid — removing them entirely is not.

Rationale:
- Users often don't have flight/accommodation details when first creating a trip
- The leg form already exists and handles destination-specific fields
- Faster trip creation → faster time to first value
- The leg form can prompt for missing required fields before allowing portal submission

Certainty: Medium — the data still needs to be collected somewhere. The question is whether the leg form is the right place, or if it creates a different friction point (longer leg form).
