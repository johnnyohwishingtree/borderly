# Smart Components

When a specialized component exists for a field type, ALWAYS use it instead of a plain `<Input>`. Plain Input loses autocomplete, platform autofill hints, and API-powered suggestions.

## Required Smart Components

| Field type | Component | Instead of |
|-----------|-----------|------------|
| Hotel / accommodation name | `AccommodationAutocomplete` | `<Input>` with hotel placeholder |
| Address (street, city, postal) | `AddressAutocomplete` | Multiple `<Input>` fields for address sub-fields |

## Where to import

Both components are exported from `@/components/ui`:
```tsx
import { AccommodationAutocomplete, AddressAutocomplete } from '@/components/ui';
```

## How to identify violations

- Any `<Input>` with a testID containing `accommodation-name` or a placeholder like "hotel", "Park Hyatt", etc.
- Any `<Input>` with a testID containing `address-line1` or a placeholder like "Start typing an address"
- Multiple `<Input>` fields for address sub-fields (line1, city, postal code) when `AddressAutocomplete` should handle them as a group

## Enforcement

A structural test at `__tests__/structure/smart-component-usage.test.ts` scans all screen files and fails CI if plain `<Input>` is used where a smart component should be.

## When adding new smart components

1. Add the component to `src/components/ui/`
2. Add a rule to `__tests__/structure/smart-component-usage.test.ts`
3. Update this file with the new mapping
