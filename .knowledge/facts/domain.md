# Facts: Domain

Truths about customs declarations, immigration portals, and travel documents. These change when governments change their rules.

## f:domain:every-country-unique-rules

No two countries share an identical customs declaration schema, required fields, submission process, or deadline rules. Japan has companion accounts; Singapore has no account; the US requires ESTA separately.

**Referenced by:** `policies/data/schema-fields.md`, `patterns/add-country.md`, all country files in `domain/countries/`

## f:domain:portals-are-not-apis

Most government customs portals are web interfaces designed for humans, not machines. They have no official API, no versioned contract, and no guaranteed stability.

**Referenced by:** `beliefs/guided-submission-over-automation.md`, `models/submission-guide.md`

## f:domain:forms-change-without-notice

Government customs portals update forms, fields, and validation rules without versioned APIs or advance notice. A field that existed yesterday may be renamed or removed today.

**Referenced by:** `policies/testing/drift-detection.md`, schema `changeDetection` blocks in `src/schemas/*.json`

## f:domain:errors-have-consequences

An incorrect customs declaration can result in shipment delays, financial penalties, goods seizure, or denial of entry. The stakes for auto-fill accuracy are real.

**Referenced by:** `beliefs/smart-delta-increases-completion.md` (users must review before submitting)

## f:domain:passport-mrz-is-standardized

ICAO 9303 defines the Machine Readable Zone format for all passports. MRZ lines contain identity fields in a fixed-width format extractable by standard OCR frameworks.

**Referenced by:** `models/passport.md`, `src/services/passport/`

## f:domain:field-semantics-stable-labels-vary

While field labels vary across portals ("surname", "family name", "last name"), the semantic meaning is consistent. A canonical-to-portal mapping layer resolves label variance.

**Referenced by:** `models/form-engine.md` (AutoFillMapping entity), `policies/data/schema-fields.md`

## f:domain:submission-deadlines-vary-widely

Japan requires submission 24h before arrival. Singapore allows up to 72h. Some countries allow submission at the border. Deadline enforcement varies from hard blocks to soft recommendations.

**Referenced by:** `domain/countries/*.md` (Submission Timing sections)

## f:domain:boolean-fields-default-false

For customs declarations, boolean fields (carrying prohibited items, currency over threshold) should default to false/"No" because the vast majority of travelers answer negatively. This matches traveler reality and reduces form friction.

**Referenced by:** `src/services/forms/formEngine/formEngine.ts` (boolean default logic)
