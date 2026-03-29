# Belief: Trip Creation Should Be Lightweight

Creating a trip should require only the essential fields: trip name and destination country. All other details (flight, accommodation, address, phone) should be filled on the leg form after trip creation, or auto-populated from previous trips.

Rationale:
- Users often don't have flight/accommodation details when planning
- 12 fields on a single scrolling screen creates friction
- The leg form already handles destination-specific fields — duplicating them on create trip is redundant
- Faster trip creation → faster time to value (auto-fill)

Certainty: Medium — needs validation that users would actually fill details later rather than abandoning.
