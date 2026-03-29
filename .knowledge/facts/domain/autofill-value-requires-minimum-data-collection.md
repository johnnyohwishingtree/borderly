# Fact: Auto-Fill Value Requires Minimum Data Collection Before Portal

For auto-fill to deliver value (≥50% fill rate), the system must have collected:

1. **Passport data** (profile) — covers ~40% of fields across all countries
2. **Trip leg data** (flight + accommodation) — covers ~30% of fields
3. **User-entered data** (email, phone, declarations) — covers remaining ~30%

Without trip leg data (flight, accommodation, address), auto-fill drops to ~55% for Malaysia, barely above the 50% sufficiency threshold. Without passport data, auto-fill is essentially zero.

The minimum viable collection path is: passport scan → trip leg details → portal. Any UX simplification must preserve this data collection chain or auto-fill breaks.
