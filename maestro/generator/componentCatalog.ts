/**
 * Component interaction catalog for Maestro test generation.
 *
 * Defines how each custom UI component should be interacted with in Maestro:
 * - What sub-testIDs each component generates
 * - The interaction sequence (tap → type → select, etc.)
 * - Whether it shows a keyboard, uses a modal, needs scroll
 * - Maestro-specific hints (keyboard dismiss strategy, wait targets)
 *
 * This catalog is the bridge between the screen registry (which lists
 * component types per field) and the journey DSL (which generates
 * Maestro YAML). A journey author can look up any component to know
 * exactly how to interact with it.
 */

export interface SubTestID {
  /** Suffix appended to the parent testID (e.g., '-trigger') */
  suffix: string;
  /** What this sub-element is */
  purpose: string;
}

export interface InteractionStep {
  /** DSL action type to use */
  action: 'tap' | 'fill' | 'inputText' | 'swipe' | 'tapText' | 'date' | 'alert' | 'select';
  /** Target: 'self' = the component testID, 'sub:suffix' = a sub-testID, 'text:X' = tap text */
  target: string;
  /** Value to type (for fill/inputText) */
  value?: string;
  /** Description of what this step does */
  description: string;
}

export interface ComponentSpec {
  /** Component name as it appears in JSX */
  name: string;
  /** Sub-testIDs this component generates from its base testID */
  subTestIDs: SubTestID[];
  /** Step-by-step interaction sequence for Maestro */
  interactionSequence: InteractionStep[];
  /** Whether this component shows the keyboard when interacted with */
  showsKeyboard: boolean;
  /** Whether this component uses a Modal overlay */
  usesModal: boolean;
  /** Whether scrollUntilVisible is needed before interaction */
  needsScroll: boolean;
  /** Whether a keyboard dismiss swipe is needed after interaction */
  needsKeyboardDismiss: boolean;
  /** Recommended DSL helper function */
  dslHelper: string;
  /** Maestro-specific notes and gotchas */
  maestroNotes: string[];
}

/**
 * Catalog of all interactive component types and their Maestro interaction patterns.
 */
export const COMPONENT_CATALOG: Record<string, ComponentSpec> = {
  Input: {
    name: 'Input',
    subTestIDs: [],
    interactionSequence: [
      { action: 'tap', target: 'self', description: 'Tap the input field to focus' },
      { action: 'inputText', target: 'self', value: '<value>', description: 'Type the value' },
      { action: 'swipe', target: 'self', description: 'Dismiss keyboard with small swipe' },
    ],
    showsKeyboard: true,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: true,
    dslHelper: 'fill(testID, value)',
    maestroNotes: [
      'Use fill() DSL helper — it handles scroll + tap + type + keyboard dismiss.',
    ],
  },

  Button: {
    name: 'Button',
    subTestIDs: [],
    interactionSequence: [
      { action: 'tap', target: 'self', description: 'Tap the button' },
    ],
    showsKeyboard: false,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: false,
    dslHelper: 'tap(testID)',
    maestroNotes: [
      'Use tap() DSL helper — it handles scrollUntilVisible + tap.',
    ],
  },

  SearchableSelect: {
    name: 'SearchableSelect',
    subTestIDs: [
      { suffix: '-trigger', purpose: 'The button that opens the dropdown' },
      { suffix: '-panel', purpose: 'The dropdown panel container' },
      { suffix: '-search', purpose: 'The search input inside the dropdown' },
      { suffix: '-option-{CODE}', purpose: 'Each selectable option (CODE = option value)' },
    ],
    interactionSequence: [
      { action: 'tap', target: 'sub:-trigger', description: 'Open the inline dropdown' },
      { action: 'tap', target: 'sub:-search', description: 'Focus the search field' },
      { action: 'inputText', target: 'sub:-search', value: '<search term>', description: 'Type to filter options' },
      { action: 'swipe', target: 'self', description: 'Tiny swipe (50%,40% → 50%,38%) to dismiss keyboard' },
      { action: 'tap', target: 'sub:-option-{CODE}', description: 'Tap the desired option' },
    ],
    showsKeyboard: true,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: false,
    dslHelper: 'select(testID, searchTerm, optionCode) — or raw actions for deep nesting',
    maestroNotes: [
      'Renders INLINE (not in a Modal) — dropdown appears below the trigger.',
      'Do NOT use fill() for the search — its keyboard-dismiss swipe closes the dropdown.',
      'Use inputText() instead, then a tiny swipe to dismiss keyboard.',
      'At deep nesting (Tab > Stack > Screen > ScrollView > Form), XCTest may fail to find elements.',
      'For deeply nested screens, use raw actions (tap/inputText/swipe) instead of select() DSL.',
      'The dropdown FlatList uses keyboardShouldPersistTaps="handled".',
    ],
  },

  DatePickerField: {
    name: 'DatePickerField',
    subTestIDs: [
      { suffix: '-container', purpose: 'The touchable field container' },
      { suffix: '-modal', purpose: 'The date picker modal overlay' },
      { suffix: '-clear', purpose: 'Clear button in modal header' },
      { suffix: '-confirm', purpose: 'Done/confirm button in modal header' },
    ],
    interactionSequence: [
      { action: 'tap', target: 'self', description: 'Open the date picker modal' },
      { action: 'tapText', target: 'text:Done', description: 'Confirm the default date' },
    ],
    showsKeyboard: false,
    usesModal: true,
    needsScroll: true,
    needsKeyboardDismiss: false,
    dslHelper: 'date(testID)',
    maestroNotes: [
      'Uses React Native Modal with column picker (month/day/year scroll wheels).',
      'Modal header has "Done" and "Clear" buttons — both tappable by text.',
      'To accept default date: tap field → wait for "Done" → tap "Done".',
      'Setting a SPECIFIC date is NOT supported — native column picker items are too deep in XCTest hierarchy.',
      'Use date() DSL helper — it handles scroll + tap + wait + confirm.',
    ],
  },

  AddressAutocomplete: {
    name: 'AddressAutocomplete',
    subTestIDs: [
      { suffix: '-line1', purpose: 'Address line 1 input' },
      { suffix: '-line2', purpose: 'Address line 2 input' },
      { suffix: '-city', purpose: 'City input' },
      { suffix: '-state', purpose: 'State/province input' },
      { suffix: '-postal-code', purpose: 'Postal code input' },
      { suffix: '-country', purpose: 'Country code input' },
    ],
    interactionSequence: [
      { action: 'fill', target: 'sub:-line1', value: '<address line 1>', description: 'Type address line 1' },
      { action: 'fill', target: 'sub:-city', value: '<city>', description: 'Type city' },
      { action: 'fill', target: 'sub:-country', value: '<country code>', description: 'Type country code' },
    ],
    showsKeyboard: true,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: true,
    dslHelper: 'fill() on each sub-field individually',
    maestroNotes: [
      'Composite component with 6 separate Input fields (line1, line2, city, state, postal-code, country).',
      'Google Places suggestions appear below line1 — not reliable in Maestro (API may be unavailable).',
      'For Maestro: fill each sub-field individually using fill() DSL helper.',
      'Only line1, city, and country are needed for basic tests.',
    ],
  },

  AccommodationAutocomplete: {
    name: 'AccommodationAutocomplete',
    subTestIDs: [],
    interactionSequence: [
      { action: 'fill', target: 'self', value: '<hotel name>', description: 'Type hotel name' },
    ],
    showsKeyboard: true,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: true,
    dslHelper: 'fill(testID, value)',
    maestroNotes: [
      'Wraps Input with Google Places lodging autocomplete.',
      'Graceful offline fallback to plain TextInput.',
      'For Maestro: treat as plain Input — use fill() DSL helper.',
    ],
  },

  TravelerSelector: {
    name: 'TravelerSelector',
    subTestIDs: [],
    interactionSequence: [
      { action: 'tapText', target: 'text:<traveler name>', description: 'Tap traveler name to toggle selection' },
    ],
    showsKeyboard: false,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: false,
    dslHelper: 'tapText(travelerName) — no testID available on individual toggles',
    maestroNotes: [
      'Does NOT expose testID prop — must use text-based selection.',
      'Primary profile is always pre-selected and cannot be deselected.',
      'During first trip creation with no family members, only primary profile shows (no interaction needed).',
      'Two layouts: compact (horizontal pills) and full (vertical cards).',
    ],
  },

  Select: {
    name: 'Select',
    subTestIDs: [
      { suffix: '-option-{value}', purpose: 'Each selectable option' },
    ],
    interactionSequence: [
      { action: 'tap', target: 'self', description: 'Open the modal dropdown' },
      { action: 'tap', target: 'sub:-option-{value}', description: 'Select an option' },
    ],
    showsKeyboard: false,
    usesModal: true,
    needsScroll: true,
    needsKeyboardDismiss: false,
    dslHelper: 'tap(testID) then tap(testID + "-option-" + value)',
    maestroNotes: [
      'Modal-based dropdown with fade animation (unlike SearchableSelect which is inline).',
      'No search field — just a list of options in a modal.',
      'Each option announces via ScreenReaderUtils.',
    ],
  },

  Card: {
    name: 'Card',
    subTestIDs: [],
    interactionSequence: [
      { action: 'tap', target: 'self', description: 'Tap the card (if it has onPress)' },
    ],
    showsKeyboard: false,
    usesModal: false,
    needsScroll: true,
    needsKeyboardDismiss: false,
    dslHelper: 'tap(testID)',
    maestroNotes: [
      'Cards may or may not be tappable — check if the screen wires onPress.',
    ],
  },
};

/**
 * Get the full list of testIDs a component generates from its base testID.
 * Expands sub-testID patterns (replacing {CODE}, {value} etc. with the suffix pattern).
 */
export function expandTestIDs(baseTestID: string, componentType: string): string[] {
  const spec = COMPONENT_CATALOG[componentType];
  if (!spec) return [baseTestID];

  const ids = [baseTestID];
  for (const sub of spec.subTestIDs) {
    if (sub.suffix) {
      ids.push(baseTestID + sub.suffix);
    }
  }
  return ids;
}
