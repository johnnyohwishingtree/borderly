# Gaps

Findings from audits and pipeline runs. Fix stories resolve these and remove the entry.

## Code fixes

(No current code fixes needed)

## Knowledge updates

- `.knowledge/domain/form-engine.md` missing guidance on traveler assignment model — travelers are assigned per-leg (`TripLeg.assignedTravelers`), not per-trip. Story #742 template assumed `Trip.travelers` field exists but it doesn't. (#742)

## Drift

(No current drift issues)
