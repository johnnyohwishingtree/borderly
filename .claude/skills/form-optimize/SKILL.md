---
name: form-optimize
description: Audit and fix form inputs for platform autofill, keyboard types, and autocomplete integration
argument-hint: "[specific area, e.g. 'accommodation fields', 'passport inputs', 'all schemas']"
---

# Form Optimize — Input Autofill & Platform Hints

Audit form fields across the app for missing platform autofill hints, incorrect keyboard types, and opportunities to use smart autocomplete components. Can run as read-only audit or apply fixes directly.

**How this differs from other skills:**
- `/visual-audit` checks screen-level visual issues (spacing, contrast)
- `/ux-review` checks flow-level journeys (tap counts, navigation)
- `/form-optimize` checks field-level input quality (autofill, keyboards, autocomplete)

## What It Audits

### 1. Platform Autofill Hints

Operating systems and browsers can auto-fill form fields when given the right hints. Missing hints means users type everything manually.

| Platform | Prop | Documentation |
|----------|------|---------------|
| iOS | `textContentType` | `name`, `givenName`, `familyName`, `emailAddress`, `telephoneNumber`, `streetAddressLine1`, `addressCity`, `addressState`, `postalCode`, `countryName`, `birthdate`, `organizationName` |
| Android | `autoComplete` | `name`, `given-name`, `family-name`, `email`, `tel`, `street-address`, `address-line1`, `postal-code`, `country-name`, `bday`, `organization` |
| Web | `autoComplete` (HTML) | Same as Android — React Native Web maps the prop |

### 2. Keyboard Types

Each field should present the keyboard that matches its expected input:

| Field content | `keyboardType` | `inputMode` (web) |
|---------------|----------------|-------------------|
| Email | `email-address` | `email` |
| Phone | `phone-pad` | `tel` |
| Numbers only | `numeric` | `numeric` |
| URL | `url` | `url` |
| General text | `default` | `text` |

### 3. Autocomplete Components

The app has smart autocomplete components that should be used where applicable:

| Component | Location | When to use |
|-----------|----------|-------------|
| `AccommodationAutocomplete` | `src/components/ui/AccommodationAutocomplete.tsx` | Hotel/lodging name fields — fetches Google Places suggestions filtered to lodging types |
| `AddressAutocomplete` | `src/components/ui/AddressAutocomplete.tsx` | Address fields — fetches Google Places address suggestions |

### 4. Input Constraints

| Check | Why |
|-------|-----|
| `autoCapitalize` | Names should use `words`, passport numbers `characters`, general text `sentences` |
| `maxLength` | Passport numbers (9), flight numbers (7), postal codes vary by country |
| `returnKeyType` | `next` for mid-form fields, `done` for last field — enables keyboard tab-through |
| `secureTextEntry` | Password fields in portal credential prompts |

### 5. Schema-to-Input Mapping

Country schemas define field `type` and `autoFillSource`. The audit checks that:
- Schema `autoFillSource` paths correctly map to platform autofill types
- Fields with `type: "accommodation"` use `AccommodationAutocomplete`
- Fields with `type: "address"` use `AddressAutocomplete`
- The `FormField` component passes appropriate props for each field type

## Steps

### Step 1: Inventory Form Fields

1. **Read all country schemas** from `src/schemas/*.json` — extract every field's `id`, `type`, `autoFillSource`, and `label`
2. **Read `FormField.tsx`** — understand how field types map to components and what props are passed
3. **Read `AccessibleInput.tsx`** — check existing keyboard/autocomplete inference logic
4. **Read `Input.tsx`** — check what props it forwards to `TextInput`

### Step 2: Build the Gap Report

For each field across all schemas, check:

| autoFillSource | Expected iOS `textContentType` | Expected Android `autoComplete` |
|----------------|-------------------------------|-------------------------------|
| `profile.passportNumber` | — | — |
| `profile.surname` | `familyName` | `family-name` |
| `profile.givenNames` | `givenName` | `given-name` |
| `profile.nationality` | `countryName` | `country-name` |
| `profile.dateOfBirth` | `birthdate` (iOS 17+) | `bday` |
| `profile.gender` | — (select, not text) | — |
| `profile.occupation` | `organizationName` | `organization` |
| `profile.homeAddress.city` | `addressCity` | `address-level2` |
| `profile.homeAddress.country` | `countryName` | `country-name` |
| `profile.homeAddress.postalCode` | `postalCode` | `postal-code` |
| `profile.homeAddress.street` | `streetAddressLine1` | `street-address` |
| `profile.email` | `emailAddress` | `email` |
| `profile.phone` | `telephoneNumber` | `tel` |
| `leg.flightNumber` | — | — |
| `leg.accommodation.*` | Handled by `AccommodationAutocomplete` | — |

For each gap, record:
- Field ID and label
- Schema file(s) where it appears
- What's missing (autofill hint, keyboard type, autocomplete component)
- Suggested fix

### Step 3: Apply Fixes (if requested)

Fixes are applied at two levels:

**Level 1: `FormField.tsx`** — Add per-field-type props based on `autoFillSource`:
```tsx
// Example: map autoFillSource to platform hints
const getAutofillProps = (field: FilledFormField) => {
  const source = field.autoFillSource;
  if (source?.includes('surname')) return { textContentType: 'familyName', autoComplete: 'family-name' };
  if (source?.includes('givenNames')) return { textContentType: 'givenName', autoComplete: 'given-name' };
  // ... etc
};
```

**Level 2: `AccessibleInput.tsx`** — Enhance the existing `getAutoCompleteType()` and `getKeyboardType()` inference to cover more field types.

**Level 3: Schema-level** — If a schema field should use `AccommodationAutocomplete` or `AddressAutocomplete` but has `type: "text"`, update the schema `type` to `"accommodation"` or `"address"`.

**Styling fixes follow project rules:**
- Use NativeWind `className` for any visual changes
- Use existing `src/components/ui/` components
- Run `pnpm typecheck` after each file change

### Step 4: Verify

```bash
pnpm typecheck    # Must pass
pnpm test         # Must pass — especially form-related tests
pnpm lint         # No new errors
```

### Step 5: Report

Output a structured report:

```
## Form Optimization Report

### Autofill Gaps
| Field | Schema(s) | Missing | Fix |
|-------|-----------|---------|-----|
| surname | JPN, MYS, SGP | textContentType, autoComplete | Add familyName / family-name |

### Keyboard Type Gaps
| Field | Current | Expected | Fix |
|-------|---------|----------|-----|

### Autocomplete Component Gaps
| Field | Current Component | Should Use | Fix |
|-------|-------------------|------------|-----|

### Summary
- X fields missing autofill hints
- Y fields with wrong keyboard type
- Z fields that should use smart autocomplete
```

## What NOT to Do

- **Don't change field validation logic** — only input presentation props
- **Don't add new dependencies** — use existing components
- **Don't modify schema field values** — only `type` if it maps to the wrong component
- **Don't refactor FormField architecture** — just add the missing props

## Running This Skill

1. **Audit only**: `/form-optimize` — produces gap report without changes
2. **Audit + fix**: `/form-optimize` then say "apply all fixes"
3. **Specific area**: `/form-optimize accommodation fields`
4. **As part of UX audit**: Integrated into the `ux-audit.yml` pipeline
