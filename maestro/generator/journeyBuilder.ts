/**
 * Journey builder — dynamically generates journey steps from screen registry.
 *
 * Instead of hardcoding waitFor text, testIDs, and interaction patterns,
 * journey authors use these helpers to look up metadata at generation time.
 * The builder:
 *
 * 1. Auto-populates `waitFor` from the screen registry
 * 2. Picks the correct DSL action based on `componentType` in the catalog
 * 3. Validates that screens, fields, and buttons exist in the registry
 * 4. Resolves dynamic testIDs (e.g., `leg-${index}-arrival-date` → `leg-0-arrival-date`)
 */
import { getScreen, getRequiredFields } from './screenRegistry';
import { step as dslStep, tap, fill, select, date, alert } from './dsl';
import type { Action, JourneyStep } from './types';

// ── Dynamic testID resolution ──

/** Replace `${index}` and `${value}` placeholders in testIDs. */
export function resolveTestID(testID: string, vars?: Record<string, string | number>): string {
  if (!vars) return testID;
  let resolved = testID;
  for (const [key, val] of Object.entries(vars)) {
    resolved = resolved.replace(`\${${key}}`, String(val));
  }
  return resolved;
}

// ── Screen step builder ──

/**
 * Create a journey step with waitFor auto-populated from the screen registry.
 *
 * - `waitFor` defaults to the registry value; pass explicit value to override,
 *   or `null` to skip waitFor entirely (for screens with conditional rendering).
 */
export function screenStep(
  screenName: string,
  opts: {
    comment?: string;
    waitFor?: string | string[] | null;
    waitTimeout?: number;
    actions: Action[];
  },
): JourneyStep {
  const screen = getScreen(screenName);
  if (!screen) {
    throw new Error(`screenStep: "${screenName}" not found in screen registry`);
  }
  const waitFor = opts.waitFor === null
    ? undefined
    : (opts.waitFor ?? screen.waitFor);
  return dslStep(screenName, {
    comment: opts.comment ?? screenName.toUpperCase(),
    waitFor: waitFor || undefined,
    waitTimeout: opts.waitTimeout,
    actions: opts.actions,
  });
}

// ── Field value types ──

/** Value input for filling a field — varies by component type. */
export type FieldInput =
  | { text: string }                         // Input, AccommodationAutocomplete
  | { search: string; code: string }         // SearchableSelect
  | { option: string }                       // Select (modal)
  | 'default';                               // DatePickerField (accept default date)

/**
 * Generate the correct DSL action for a field based on its componentType.
 *
 * Looks up the field in the screen registry, resolves the testID,
 * and returns the appropriate action(s) from the component catalog.
 *
 * @param screenName - Screen containing the field
 * @param fieldTestID - The field's testID template (may contain ${index})
 * @param value - Value to enter (type depends on componentType)
 * @param vars - Variables for resolving dynamic testIDs (e.g., { index: 0 })
 * @returns Array of actions (usually 1, but some components need multiple)
 */
export function fillField(
  screenName: string,
  fieldTestID: string,
  value?: FieldInput,
  vars?: Record<string, string | number>,
): Action[] {
  const screen = getScreen(screenName);
  if (!screen) throw new Error(`fillField: screen "${screenName}" not in registry`);

  const field = screen.fields.find(f => f.testID === fieldTestID);
  if (!field) throw new Error(`fillField: field "${fieldTestID}" not in screen "${screenName}"`);

  const resolved = resolveTestID(field.testID, vars);

  switch (field.componentType) {
    case 'Input':
    case 'AccommodationAutocomplete': {
      if (!value || value === 'default') {
        throw new Error(`fillField: Input "${fieldTestID}" requires { text: string }`);
      }
      if (!('text' in value)) {
        throw new Error(`fillField: Input "${fieldTestID}" requires { text: string }`);
      }
      return [fill(resolved, value.text)];
    }

    case 'SearchableSelect': {
      if (!value || value === 'default') {
        throw new Error(`fillField: SearchableSelect "${fieldTestID}" requires { search, code }`);
      }
      if (!('search' in value) || !('code' in value)) {
        throw new Error(`fillField: SearchableSelect "${fieldTestID}" requires { search, code }`);
      }
      return [select(resolved, value.search, value.code)];
    }

    case 'DatePickerField':
      return [date(resolved)];

    case 'Select': {
      if (!value || value === 'default') {
        throw new Error(`fillField: Select "${fieldTestID}" requires { option: string }`);
      }
      if (!('option' in value)) {
        throw new Error(`fillField: Select "${fieldTestID}" requires { option: string }`);
      }
      return [tap(resolved), tap(`${resolved}-option-${value.option}`)];
    }

    case 'AddressAutocomplete': {
      // Address requires filling sub-fields individually — return empty for auto,
      // caller should use fillField on each sub-field or manual actions.
      return [];
    }

    case 'other':
      // 'other' componentType means no catalog pattern — caller must handle manually.
      throw new Error(
        `fillField: "${fieldTestID}" has componentType 'other' — use manual actions. ` +
        `Notes: ${screen.notes?.join('; ') ?? 'none'}`,
      );

    default:
      throw new Error(`fillField: unknown componentType "${field.componentType}" for "${fieldTestID}"`);
  }
}

/**
 * Tap an action button on a screen.
 * Validates the button exists in the registry.
 */
export function tapButton(screenName: string, buttonTestID: string): Action {
  const screen = getScreen(screenName);
  if (!screen) throw new Error(`tapButton: screen "${screenName}" not in registry`);

  const btn = screen.actionButtons.find(b => b.testID === buttonTestID);
  if (!btn) {
    const available = screen.actionButtons.map(b => b.testID).join(', ');
    throw new Error(
      `tapButton: "${buttonTestID}" not in screen "${screenName}". ` +
      `Available: [${available}]`,
    );
  }

  return tap(buttonTestID, { scroll: true });
}

/**
 * Handle an alert using the happy-path button from the registry.
 * Looks up the alert by matching the trigger string.
 */
export function handleAlert(screenName: string, trigger: string): Action {
  const screen = getScreen(screenName);
  if (!screen) throw new Error(`handleAlert: screen "${screenName}" not in registry`);

  const alertSpec = screen.alerts.find(a => a.trigger.includes(trigger));
  if (!alertSpec) {
    const available = screen.alerts.map(a => `"${a.trigger}"`).join(', ');
    throw new Error(
      `handleAlert: no alert with trigger "${trigger}" in screen "${screenName}". ` +
      `Available: [${available}]`,
    );
  }
  if (!alertSpec.happyPathButton) {
    throw new Error(`handleAlert: alert "${alertSpec.title}" has no happyPathButton`);
  }

  return alert(alertSpec.title, alertSpec.happyPathButton);
}

/**
 * Generate actions to fill all required fields on a screen.
 *
 * @param screenName - The screen to fill
 * @param values - Map from field testID → FieldInput value
 * @param vars - Variables for dynamic testIDs (e.g., { index: 0 })
 * @returns Flat array of all actions needed to fill the required fields
 *
 * Fields with componentType 'other' are skipped — handle them manually.
 * DatePickerField fields default to 'default' if not in the values map.
 */
export function fillRequiredFields(
  screenName: string,
  values: Record<string, FieldInput>,
  vars?: Record<string, string | number>,
): Action[] {
  const required = getRequiredFields(screenName);
  const actions: Action[] = [];

  for (const field of required) {
    // Skip 'other' type fields — must be handled manually
    if (field.componentType === 'other') continue;

    const val = values[field.testID]
      ?? (field.componentType === 'DatePickerField' ? 'default' : undefined);

    if (val !== undefined) {
      actions.push(...fillField(screenName, field.testID, val, vars));
    }
  }

  return actions;
}

/**
 * Get the registry's waitFor value for a screen.
 * Useful when you need the value outside of screenStep.
 */
export function getWaitFor(screenName: string): string | string[] | undefined {
  return getScreen(screenName)?.waitFor || undefined;
}
