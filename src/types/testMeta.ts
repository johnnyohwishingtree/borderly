/**
 * TestMeta — metadata for testIDs used by Maestro test generation.
 *
 * Components use `testID={meta.id}` — only the id string reaches React Native.
 * The generator reads the full object from testIDs.ts to determine scroll behavior,
 * interaction patterns, and other test automation metadata.
 *
 * Adding new metadata: add a field here. The generator picks it up automatically.
 * No component changes, no registry schema changes needed.
 */

export type TestZone = 'scroll' | 'header' | 'footer';

export interface TestMeta {
  /** The testID string — passed to the component via testID={meta.id} */
  id: string;

  /** Element type — determines interaction pattern in Maestro */
  type: 'button' | 'Input' | 'SearchableSelect' | 'DatePickerField' |
    'AccommodationAutocomplete' | 'AddressAutocomplete' | 'Toggle' |
    'Select' | 'container';

  /** Where the element is positioned on screen */
  zone?: TestZone;
  // scroll = inside ScrollView (may need scrolling) — DEFAULT if omitted
  // header = fixed at top (never scroll)
  // footer = fixed at bottom (never scroll)

  /** Whether the testID contains dynamic segments like ${index} */
  dynamic?: boolean;
}
