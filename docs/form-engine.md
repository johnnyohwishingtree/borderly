# Form Engine Architecture

The Borderly Form Engine is the core system that transforms traveler profiles and trip information into country-specific customs and immigration forms. This document provides comprehensive technical documentation for the form generation pipeline.

## Overview

The Form Engine implements Borderly's "Smart Delta" approach — automatically filling out 70%+ of form fields from stored profile data, while only presenting users with country-specific questions they need to answer.

### Key Benefits

- **Fast Form Completion**: Reduces form completion time from 10-15 minutes to under 2 minutes
- **Consistency**: Eliminates data entry errors across multiple countries
- **Local-First**: All processing happens on-device with no server dependency
- **Schema-Driven**: Supports any country through declarative JSON schemas

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Form Engine Pipeline                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Profile + Trip Leg + Country Schema                       │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐      ┌─────────────────┐             │
│  │  Field Mapper   │ ──── │  Auto-fill      │             │
│  │                 │      │  Resolution     │             │
│  └─────────────────┘      └─────────────────┘             │
│           │                         │                      │
│           ▼                         ▼                      │
│  ┌─────────────────┐      ┌─────────────────┐             │
│  │ Form Generation │      │ Statistics      │             │
│  │                 │      │ Calculation     │             │
│  └─────────────────┘      └─────────────────┘             │
│           │                         │                      │
│           ▼                         ▼                      │
│       FilledForm ──────────── FormStats                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Data Flow

1. **Input**: TravelerProfile + TripLeg + CountryFormSchema
2. **Processing**: Auto-fill resolution via dot-notation paths
3. **Output**: FilledForm with completion statistics

## Core Interfaces

### FilledForm

The primary output of the form engine, representing a country-specific form with auto-filled and user-provided data.

```typescript
interface FilledForm {
  countryCode: string;        // ISO 3166-1 alpha-3 (e.g., "JPN")
  countryName: string;        // Human-readable name (e.g., "Japan")
  portalName: string;         // Government portal name (e.g., "Visit Japan Web")
  portalUrl: string;          // Official submission URL
  sections: FilledFormSection[];  // Form sections with fields
  stats: FormStats;           // Completion statistics
}
```

### FilledFormField

Individual form fields with their resolved values and metadata.

```typescript
interface FilledFormField extends FormField {
  currentValue: unknown;      // Resolved field value
  source: 'auto' | 'user' | 'default' | 'empty';  // Value source
  needsUserInput: boolean;    // Whether user input is required
}
```

### FormStats

Tracks form completion progress and auto-fill efficiency.

```typescript
interface FormStats {
  totalFields: number;        // Total number of fields
  autoFilled: number;         // Fields auto-filled from profile
  userFilled: number;         // Fields filled by user
  remaining: number;          // Fields still needing input
  completionPercentage: number;  // Overall completion (0-100)
}
```

## Field Resolution System

### Auto-fill Sources

The Form Engine uses dot-notation paths to resolve field values from the traveler's profile and trip data.

#### Common Auto-fill Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| `profile.*` | `profile.surname` | Direct profile fields |
| `profile.homeAddress.*` | `profile.homeAddress.city` | Nested address fields |
| `profile.defaultDeclarations.*` | `profile.defaultDeclarations.carryingProhibitedItems` | Declaration preferences |
| `leg.*` | `leg.arrivalDate` | Trip leg information |
| `leg.accommodation.*` | `leg.accommodation.name` | Hotel/accommodation data |
| `leg._computed*` | `leg._calculatedDuration` | Computed values |

#### Computed Fields

Special auto-fill sources that perform calculations:

- **`leg._calculatedDuration`**: Calculates trip duration in days
- **`leg.accommodation.address._formatted`**: Formats address as comma-separated string

### Field Type Validation

The engine validates auto-filled values match expected field types:

```typescript
// Text fields: Non-empty strings
profile.surname: "JOHNSON" ✓
profile.nonExistentField: undefined ✗

// Number fields: Valid numbers
leg._calculatedDuration: 7 ✓  
profile.surname: "JOHNSON" ✗

// Date fields: Valid ISO 8601 dates or Date objects
profile.dateOfBirth: "1990-04-08" ✓
profile.surname: "JOHNSON" ✗

// Boolean fields: Boolean values
profile.defaultDeclarations.carryingProhibitedItems: false ✓
profile.surname: "JOHNSON" ✗
```

## API Reference

### Core Functions

#### generateFilledForm()

The main form generation function.

```typescript
function generateFilledForm(
  profile: TravelerProfile,
  leg: TripLeg,
  schema: CountryFormSchema,
  existingFormData?: Record<string, unknown>
): FilledForm
```

**Parameters:**
- `profile`: Complete traveler profile with passport and personal data
- `leg`: Trip leg for the destination country
- `schema`: Country-specific form schema (JSON)
- `existingFormData`: Optional user-provided form data

**Returns:** FilledForm with auto-filled fields and completion statistics

**Example:**

```typescript
import { generateFilledForm } from '@/services/forms/formEngine';
import japanSchema from '@/schemas/JPN.json';

const form = generateFilledForm(travelerProfile, japanLeg, japanSchema);
console.log(form.stats.completionPercentage); // e.g., 85
```

#### updateFormData()

Immutably updates form data with new user input.

```typescript
function updateFormData(
  currentFormData: Record<string, unknown>,
  fieldId: string,
  value: unknown
): Record<string, unknown>
```

**Example:**

```typescript
let formData = {};
formData = updateFormData(formData, 'purposeOfVisit', 'tourism');
formData = updateFormData(formData, 'currencyOver1M', false);
```

#### validateFormCompletion()

Validates whether all required fields have values.

```typescript
function validateFormCompletion(form: FilledForm): {
  isComplete: boolean;
  missingFields: string[];
}
```

#### exportFormData()

Exports form data suitable for government portal submission.

```typescript
function exportFormData(form: FilledForm): Record<string, unknown>
```

Excludes empty values and includes only auto-filled or user-filled fields.

### Utility Functions

#### getCountrySpecificFields()

Returns only country-specific fields that need user input (implements "Smart Delta").

```typescript
function getCountrySpecificFields(form: FilledForm): FilledFormField[]
```

#### calculateFormProgress()

Calculates completion progress by section.

```typescript
function calculateFormProgress(form: FilledForm): {
  totalSections: number;
  completedSections: number;
  sectionProgress: Array<{
    sectionId: string;
    completed: number;
    total: number;
  }>;
}
```

## Country Schema Format

Country schemas define the fields and auto-fill mappings for each destination.

### Schema Structure

```json
{
  "countryCode": "JPN",
  "countryName": "Japan", 
  "schemaVersion": "1.0.0",
  "portalUrl": "https://vjw-lp.digital.go.jp/en/",
  "portalName": "Visit Japan Web",
  
  "submission": {
    "earliestBeforeArrival": "14d",
    "latestBeforeArrival": "0h", 
    "recommended": "72h"
  },
  
  "sections": [
    {
      "id": "personal",
      "title": "Personal Information",
      "fields": [
        {
          "id": "surname",
          "label": "Surname (as on passport)",
          "type": "text",
          "required": true,
          "autoFillSource": "profile.surname",
          "countrySpecific": false,
          "portalFieldName": "Last Name"
        }
      ]
    }
  ]
}
```

### Field Types

| Type | Description | Default Value |
|------|-------------|---------------|
| `text` | Single-line text | `""` |
| `textarea` | Multi-line text | `""` |
| `number` | Numeric value | `0` or `validation.min` |
| `date` | Date (ISO 8601) | `""` |
| `boolean` | True/false | `false` |
| `select` | Single choice | First option value |

### Field Properties

- **`required`**: Whether the field must be filled
- **`autoFillSource`**: Dot-notation path for auto-fill
- **`countrySpecific`**: Whether field is unique to this country
- **`options`**: Available choices for select fields
- **`validation`**: Validation rules (pattern, min/max, etc.)
- **`helpText`**: User-facing explanation
- **`portalFieldName`**: Label used in government portal

## Performance Characteristics

### Benchmarks (Target Performance)

| Operation | Threshold | Actual Performance |
|-----------|-----------|-------------------|
| Single form generation | < 10ms | ~2-5ms |
| Multi-country trip (3 forms) | < 100ms | ~15-25ms |
| Form data update | < 5ms | ~1-2ms |
| Form validation | < 2ms | ~0.5ms |
| Data export | < 5ms | ~1ms |

### Optimization Strategies

1. **Lazy Evaluation**: Auto-fill resolution only when needed
2. **Immutable Updates**: Efficient object spreading for form data
3. **Schema Caching**: Country schemas loaded once and reused
4. **Field Batching**: Process multiple fields in single pass

## Error Handling

### Graceful Degradation

The Form Engine handles missing or invalid data gracefully:

- **Missing Profile Data**: Fields marked as `needsUserInput: true`
- **Invalid Auto-fill Values**: Falls back to default values
- **Schema Errors**: Logs warnings but continues processing
- **Type Mismatches**: Treats as empty and requests user input

### Common Error Scenarios

```typescript
// Missing accommodation address
leg.accommodation.address = { line1: "", city: "", ... };
// Result: Address field needs user input

// Invalid date format  
profile.dateOfBirth = "invalid-date";
// Result: Date field needs user input

// Non-existent auto-fill path
autoFillSource: "profile.nonExistentField";
// Result: Field marked as empty, needs user input
```

## Testing Strategy

### Test Coverage Areas

1. **Unit Tests** (`__tests__/services/formEngine.test.ts`)
   - All API functions with various inputs
   - Edge cases and error conditions
   - Field type validation
   - Auto-fill resolution

2. **Integration Tests** (`__tests__/integration/formFlow.test.ts`)
   - End-to-end form workflows
   - Multi-country scenarios
   - Real schema validation

3. **Performance Tests** (`__tests__/performance/formGeneration.test.ts`)
   - Benchmark compliance
   - Memory leak detection
   - Stress testing with large datasets

### Test Fixtures

Comprehensive test data is available in `__tests__/fixtures/`:

- **`testProfiles.ts`**: Various traveler personas and nationalities
- **`testTrips.ts`**: Different trip scenarios and edge cases

### Demo Data

Development utilities in `src/utils/testData.ts`:

- **`demoProfiles`**: Realistic user personas for UI development
- **`demoTrips`**: Sample trips for testing workflows
- **`generateDemoFormData()`**: Pre-filled forms for demos

## Usage Examples

### Basic Form Generation

```typescript
import { generateFilledForm } from '@/services/forms/formEngine';
import { testProfiles } from '__tests__/fixtures/testProfiles';
import japanSchema from '@/schemas/JPN.json';

// Generate form for US traveler going to Japan
const profile = testProfiles.usa;
const leg = japanTrip.legs[0]; // Japan leg
const form = generateFilledForm(profile, leg, japanSchema);

console.log(`Auto-filled: ${form.stats.autoFilled}/${form.stats.totalFields} fields`);
console.log(`Completion: ${form.stats.completionPercentage}%`);
```

### Interactive Form Workflow

```typescript
// 1. Generate initial form
let formData = {};
let form = generateFilledForm(profile, leg, schema, formData);

// 2. Get country-specific fields for user
const countryFields = getCountrySpecificFields(form);
console.log(`User needs to fill ${countryFields.length} fields`);

// 3. User provides input
formData = updateFormData(formData, 'purposeOfVisit', 'tourism');
formData = updateFormData(formData, 'currencyOver1M', false);

// 4. Regenerate form with user data
form = generateFilledForm(profile, leg, schema, formData);

// 5. Validate completion
const validation = validateFormCompletion(form);
if (validation.isComplete) {
  const exportedData = exportFormData(form);
  // Ready for submission
}
```

### Multi-Country Trip

```typescript
import { testTrips } from '__tests__/fixtures/testTrips';

const trip = testTrips.asiaTrip; // Japan → Malaysia → Singapore
const schemas = { JPN: japanSchema, MYS: malaysiaSchema, SGP: singaporeSchema };

// Generate forms for all countries
const forms = trip.legs.map(leg => {
  const schema = schemas[leg.destinationCountry];
  return {
    country: leg.destinationCountry,
    form: generateFilledForm(profile, leg, schema)
  };
});

// Calculate total completion
const totalFields = forms.reduce((sum, { form }) => sum + form.stats.totalFields, 0);
const totalAutoFilled = forms.reduce((sum, { form }) => sum + form.stats.autoFilled, 0);
const overallCompletion = Math.round((totalAutoFilled / totalFields) * 100);

console.log(`Trip auto-fill rate: ${overallCompletion}%`);
```

## Best Practices

### Schema Design

1. **Maximize Auto-fill**: Map as many fields as possible to profile data
2. **Mark Country-Specific**: Set `countrySpecific: true` for unique fields
3. **Provide Help Text**: Include `helpText` for complex fields
4. **Use Validation**: Add appropriate validation rules

### Performance

1. **Cache Schemas**: Load country schemas once at app startup
2. **Batch Updates**: Group multiple field updates together
3. **Avoid Regeneration**: Only regenerate forms when necessary

### Error Handling

1. **Validate Schemas**: Test schemas against all supported field types
2. **Handle Missing Data**: Design forms to work with incomplete profiles
3. **Provide Fallbacks**: Always have sensible default values

### Testing

1. **Test All Countries**: Validate forms against all supported country schemas
2. **Cover Edge Cases**: Test with minimal profiles and missing data
3. **Benchmark Performance**: Ensure form generation meets mobile app requirements

## Troubleshooting

### Common Issues

#### Auto-fill Not Working

```typescript
// Check auto-fill source path
const field = { autoFillSource: "profile.homeAddress.city" };

// Debug resolution
console.log(resolveAutoFillPath(field.autoFillSource, { profile, leg }));
```

#### Fields Marked as Requiring Input

Verify the field type matches the resolved value type:

```typescript
// Date field with text value
autoFillSource: "profile.surname"  // Returns "JOHNSON"
type: "date"                       // Expects date format
// Result: needsUserInput = true
```

#### Performance Issues

Monitor form generation time:

```typescript
const startTime = performance.now();
const form = generateFilledForm(profile, leg, schema);
const endTime = performance.now();
console.log(`Generation time: ${endTime - startTime}ms`);
```

### Debug Utilities

Enable detailed logging during development:

```typescript
// Add to form engine for debugging
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) {
  console.log('Auto-fill result:', { fieldId, resolved, source });
}
```

## Future Enhancements

### Planned Features

1. **Conditional Fields**: Show/hide fields based on other field values
2. **Field Dependencies**: Auto-update fields when related fields change  
3. **Smart Defaults**: Learn from user patterns to improve auto-fill
4. **Schema Versioning**: Support schema migrations and backwards compatibility
5. **Custom Validators**: Allow country-specific validation logic

### Performance Optimizations

1. **Web Workers**: Move form generation to background thread
2. **Incremental Updates**: Only process changed fields
3. **Field Virtualization**: Lazy-load large forms
4. **Caching Layer**: Cache generated forms for repeat visitors

---

For more information, see:
- [MVP Proposal](mvp-proposal.md) - Overall app architecture
- [Country Schemas](../src/schemas/) - Supported country definitions
- [API Documentation](../src/services/forms/) - Implementation details