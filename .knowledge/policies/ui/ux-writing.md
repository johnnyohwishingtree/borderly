# Policy: UX Writing

## Scope
src/screens/, src/components/ (user-facing text)

## Rules
- REQUIRE: button labels are outcome-focused (verb + object: "Submit declaration")
- DENY: generic buttons ("Submit", "OK", "Cancel") without context
- REQUIRE: destructive actions name what's destroyed ("Delete 3 trips")
- REQUIRE: error messages answer: what failed, why, how to fix
- DENY: blaming the user ("You entered an invalid...")
- REQUIRE: empty states include: brief message + value prop + action button
- DENY: dead-end empty states ("No items")
- REQUIRE: one term per concept (pick "Delete" or "Remove", not both)
- DENY: technical jargon in user-facing text ("JSON parse error")
- DENY: abbreviations in labels (`govt`, `dept`, `addr`)

## Tone by Context
| Context | Tone |
|---|---|
| Success | Brief, not excessive ("Trip created") |
| Error | Empathetic + constructive (what to do next) |
| Loading | Reassuring ("Scanning passport...") |
| Destructive confirm | Serious + specific ("This will permanently delete all form data") |
| Error states | Never humorous — users are frustrated |

## Exceptions
- Internal developer-facing text (logs, debug screens) doesn't follow these rules

## Anti-patterns
- "Submit" button without saying what's submitted
- "Are you sure?" dialog without context
- "Something went wrong" without recovery steps
- Error showing `leg0.accommodation: required` to the user
- Wall of text (> 2 sentences most users won't read)

## Enforcement
- Design guideline — not structurally testable
- Reviewed during pipeline Step 6 (self-review)

## Context
- `.context/external/cognitive/fewer-fields-higher-completion.md`
- `.context/external/cognitive/users-skip-error-messages.md`
- `.context/external/customer/users-dont-understand-portal-jargon.md`
- `.context/external/countries/errors-have-consequences.md`
