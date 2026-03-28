# Facts: Customer

Truths about Borderly's users derived from observation, research, or product architecture. These change as the user base evolves.

## f:cust:travelers-fill-forms-at-borders

Users typically fill customs forms at airports, in transit, or at borders — public, distracted, time-pressured environments. The app must work offline and lock quickly when idle.

**Referenced by:** `policies/architecture/local-first.md` (offline requirement), `policies/data/pii-boundary.md` (5-minute app lock)

## f:cust:multi-leg-trips-are-common

Core users travel to 3+ countries per trip (e.g., Japan → Malaysia → Singapore). The app's trip-leg model and per-destination forms are designed for this pattern, not single-destination travel.

**Referenced by:** `models/user-journeys.md` (Trip creation journey), `models/form-engine.md`

## f:cust:users-dont-understand-portal-jargon

Government portal fields use bureaucratic language ("place of issue", "port of embarkation") that confuses travelers. The app must translate jargon into plain language.

**Referenced by:** `policies/ui/ux-writing.md` (no technical jargon rule)

## f:cust:users-wont-verify-auto-filled-values-carefully

When fields are pre-filled, users tend to skip review and assume correctness. Auto-fill accuracy is critical because users won't catch errors. The smart delta approach (showing only manual fields) relies on auto-fill being correct.

**Referenced by:** `beliefs/smart-delta-increases-completion.md`

## f:cust:family-travelers-share-devices

Families sharing a device need isolated data per family member. One person's passport data must not leak into another's form. Each family member needs separate encryption keys and Keychain entries.

**Referenced by:** `policies/data/pii-boundary.md` (family member isolation), `policies/architecture/local-first.md`, `models/passport.md` (FamilyMember entity)
