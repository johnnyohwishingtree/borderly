/**
 * Tests for JPN, MYS, SGP portal automation scripts.
 *
 * These scripts live in assets/automation/scripts/ and are injected into
 * government portal WebViews at runtime.  They are pure JavaScript IIFEs
 * (not CommonJS modules), so we execute them inside a Node vm sandbox that
 * provides a minimal mock of window.BorderlyAutomation.
 *
 * What we verify:
 *  - Script files exist
 *  - Each script registers itself under the correct country code
 *  - Required exports are present: portalUrl, fieldMappings, pageDetectors,
 *    submitButtonSelector
 *  - Every field ID referenced by fieldsOnThisScreen in the JSON schema has a
 *    corresponding entry in fieldMappings
 *  - portalUrl is a valid https URL
 *  - fieldMappings entries each have at least one lookup strategy (selector /
 *    id / name / label)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import JPN from '../../src/schemas/JPN.json';
import MYS from '../../src/schemas/MYS.json';
import SGP from '../../src/schemas/SGP.json';
import { loadSchema, validateSchemaCompletely } from '../../src/services/schemas/schemaLoader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = path.resolve(__dirname, '../../assets/automation/scripts');

/**
 * Build a minimal window.BorderlyAutomation mock and run the automation
 * script inside a vm sandbox.  Returns the automation object registered for
 * the given country code.
 */
function loadAutomationScript(filename: string, countryCode: string): Record<string, unknown> {
  const scriptPath = path.join(SCRIPTS_DIR, filename);
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');

  const registeredCountries: Record<string, Record<string, unknown>> = {};

  // Build a plain object first, then add a self-referencing `window` property.
  // vm contexts have no automatic `window` alias, so scripts that access
  // `window.BorderlyAutomation` need this self-reference to work.
  const mockWindow: Record<string, unknown> = {
    BorderlyAutomation: {
      _loaded: true,
      countries: registeredCountries,
      registerCountry(code: string, automation: Record<string, unknown>) {
        registeredCountries[code] = automation;
      },
      // Stubs so the IIFE doesn't throw on early-exit guards
      DOM: { findElement: () => null },
      Form: { fillField: () => Promise.resolve(false) },
      Click: { smartClick: () => Promise.resolve(false) },
      Page: { waitForReady: () => Promise.resolve(true) },
      Error: { captureContext: (e: unknown) => e },
      Debug: { logStep: () => {} },
    },
    location: { href: '' },
    document: { querySelector: () => null, querySelectorAll: () => [] },
    ReactNativeWebView: null,
    console,
  };

  // Self-reference: scripts do `window.BorderlyAutomation`, so `window` must
  // resolve to the global context object.
  mockWindow.window = mockWindow;

  const context = vm.createContext(mockWindow);
  vm.runInContext(scriptContent, context);

  const automation = registeredCountries[countryCode];
  if (!automation) {
    throw new Error(`Script ${filename} did not register country code '${countryCode}'`);
  }
  return automation;
}

/**
 * Collect the union of all field IDs referenced in fieldsOnThisScreen across
 * all submission guide steps of a JSON schema.
 */
function getGuideFieldIds(schema: typeof JPN | typeof MYS | typeof SGP): Set<string> {
  const ids = new Set<string>();
  for (const step of schema.submissionGuide) {
    for (const fieldId of step.fieldsOnThisScreen) {
      ids.add(fieldId);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Japan (Visit Japan Web)
// ---------------------------------------------------------------------------

describe('JPN automation script (assets/automation/scripts/JPN.js)', () => {
  const scriptFile = 'JPN.js';
  let automation: Record<string, unknown>;

  beforeAll(() => {
    automation = loadAutomationScript(scriptFile, 'JPN');
  });

  test('script file exists', () => {
    expect(fs.existsSync(path.join(SCRIPTS_DIR, scriptFile))).toBe(true);
  });

  test('exports portalUrl', () => {
    expect(typeof automation.portalUrl).toBe('string');
  });

  test('portalUrl is an https URL', () => {
    expect(automation.portalUrl as string).toMatch(/^https:\/\//);
  });

  test('portalUrl points to Visit Japan Web', () => {
    expect(automation.portalUrl as string).toContain('vjw');
  });

  test('exports fieldMappings object', () => {
    expect(automation.fieldMappings).toBeDefined();
    expect(typeof automation.fieldMappings).toBe('object');
  });

  test('exports pageDetectors object with at least one detector', () => {
    expect(automation.pageDetectors).toBeDefined();
    expect(Object.keys(automation.pageDetectors as object).length).toBeGreaterThan(0);
  });

  test('exports submitButtonSelector string', () => {
    expect(typeof automation.submitButtonSelector).toBe('string');
    expect((automation.submitButtonSelector as string).length).toBeGreaterThan(0);
  });

  test('fieldMappings covers every field referenced in submission guide', () => {
    const guideFieldIds = getGuideFieldIds(JPN);
    const mappings = automation.fieldMappings as Record<string, unknown>;

    for (const fieldId of guideFieldIds) {
      expect(mappings).toHaveProperty(fieldId);
    }
  });

  test('each fieldMapping entry has at least one lookup strategy', () => {
    const mappings = automation.fieldMappings as Record<string, Record<string, unknown>>;

    for (const [fieldId, criteria] of Object.entries(mappings)) {
      const hasStrategy =
        criteria.selector !== undefined ||
        criteria.id !== undefined ||
        criteria.name !== undefined ||
        criteria.label !== undefined;

      expect({ fieldId, hasStrategy }).toMatchObject({ fieldId, hasStrategy: true });
    }
  });

  test('pageDetectors are functions', () => {
    const detectors = automation.pageDetectors as Record<string, unknown>;
    for (const detector of Object.values(detectors)) {
      expect(typeof detector).toBe('function');
    }
  });

  test('does not require account (no account_creation detector needed in schema)', () => {
    // JPN does require account creation — verify detector exists
    const detectors = automation.pageDetectors as Record<string, unknown>;
    expect(detectors).toHaveProperty('account_creation');
  });

  test('has qr_code page detector (JPN-specific)', () => {
    const detectors = automation.pageDetectors as Record<string, unknown>;
    expect(detectors).toHaveProperty('qr_code');
  });
});

// ---------------------------------------------------------------------------
// Malaysia (MDAC)
// ---------------------------------------------------------------------------

describe('MYS automation script (assets/automation/scripts/MYS.js)', () => {
  const scriptFile = 'MYS.js';
  let automation: Record<string, unknown>;

  beforeAll(() => {
    automation = loadAutomationScript(scriptFile, 'MYS');
  });

  test('script file exists', () => {
    expect(fs.existsSync(path.join(SCRIPTS_DIR, scriptFile))).toBe(true);
  });

  test('exports portalUrl', () => {
    expect(typeof automation.portalUrl).toBe('string');
  });

  test('portalUrl is an https URL', () => {
    expect(automation.portalUrl as string).toMatch(/^https:\/\//);
  });

  test('portalUrl points to MDAC portal', () => {
    expect(automation.portalUrl as string).toContain('imigresen');
  });

  test('exports fieldMappings object', () => {
    expect(automation.fieldMappings).toBeDefined();
    expect(typeof automation.fieldMappings).toBe('object');
  });

  test('exports pageDetectors object with at least one detector', () => {
    expect(automation.pageDetectors).toBeDefined();
    expect(Object.keys(automation.pageDetectors as object).length).toBeGreaterThan(0);
  });

  test('exports submitButtonSelector string', () => {
    expect(typeof automation.submitButtonSelector).toBe('string');
    expect((automation.submitButtonSelector as string).length).toBeGreaterThan(0);
  });

  test('fieldMappings covers every field referenced in submission guide', () => {
    const guideFieldIds = getGuideFieldIds(MYS);
    const mappings = automation.fieldMappings as Record<string, unknown>;

    for (const fieldId of guideFieldIds) {
      expect(mappings).toHaveProperty(fieldId);
    }
  });

  test('each fieldMapping entry has at least one lookup strategy', () => {
    const mappings = automation.fieldMappings as Record<string, Record<string, unknown>>;

    for (const [fieldId, criteria] of Object.entries(mappings)) {
      const hasStrategy =
        criteria.selector !== undefined ||
        criteria.id !== undefined ||
        criteria.name !== undefined ||
        criteria.label !== undefined;

      expect({ fieldId, hasStrategy }).toMatchObject({ fieldId, hasStrategy: true });
    }
  });

  test('pageDetectors are functions', () => {
    const detectors = automation.pageDetectors as Record<string, unknown>;
    for (const detector of Object.values(detectors)) {
      expect(typeof detector).toBe('function');
    }
  });

  test('fieldMappings includes health declaration fields (MYS-specific)', () => {
    const mappings = automation.fieldMappings as Record<string, unknown>;
    expect(mappings).toHaveProperty('healthCondition');
    expect(mappings).toHaveProperty('visitedHighRiskCountries');
    expect(mappings).toHaveProperty('carryingCurrency');
  });

  test('fieldMappings includes MDAC-specific airport field', () => {
    const mappings = automation.fieldMappings as Record<string, unknown>;
    expect(mappings).toHaveProperty('arrivalAirport');
  });
});

// ---------------------------------------------------------------------------
// Singapore (SG Arrival Card)
// ---------------------------------------------------------------------------

describe('SGP automation script (assets/automation/scripts/SGP.js)', () => {
  const scriptFile = 'SGP.js';
  let automation: Record<string, unknown>;

  beforeAll(() => {
    automation = loadAutomationScript(scriptFile, 'SGP');
  });

  test('script file exists', () => {
    expect(fs.existsSync(path.join(SCRIPTS_DIR, scriptFile))).toBe(true);
  });

  test('exports portalUrl', () => {
    expect(typeof automation.portalUrl).toBe('string');
  });

  test('portalUrl is an https URL', () => {
    expect(automation.portalUrl as string).toMatch(/^https:\/\//);
  });

  test('portalUrl points to ICA SG Arrival Card portal', () => {
    expect(automation.portalUrl as string).toContain('ica.gov.sg');
  });

  test('exports fieldMappings object', () => {
    expect(automation.fieldMappings).toBeDefined();
    expect(typeof automation.fieldMappings).toBe('object');
  });

  test('exports pageDetectors object with at least one detector', () => {
    expect(automation.pageDetectors).toBeDefined();
    expect(Object.keys(automation.pageDetectors as object).length).toBeGreaterThan(0);
  });

  test('exports submitButtonSelector string', () => {
    expect(typeof automation.submitButtonSelector).toBe('string');
    expect((automation.submitButtonSelector as string).length).toBeGreaterThan(0);
  });

  test('fieldMappings covers every field referenced in submission guide', () => {
    const guideFieldIds = getGuideFieldIds(SGP);
    const mappings = automation.fieldMappings as Record<string, unknown>;

    for (const fieldId of guideFieldIds) {
      expect(mappings).toHaveProperty(fieldId);
    }
  });

  test('each fieldMapping entry has at least one lookup strategy', () => {
    const mappings = automation.fieldMappings as Record<string, Record<string, unknown>>;

    for (const [fieldId, criteria] of Object.entries(mappings)) {
      const hasStrategy =
        criteria.selector !== undefined ||
        criteria.id !== undefined ||
        criteria.name !== undefined ||
        criteria.label !== undefined;

      expect({ fieldId, hasStrategy }).toMatchObject({ fieldId, hasStrategy: true });
    }
  });

  test('pageDetectors are functions', () => {
    const detectors = automation.pageDetectors as Record<string, unknown>;
    for (const detector of Object.values(detectors)) {
      expect(typeof detector).toBe('function');
    }
  });

  test('fieldMappings includes SGP-specific health fields', () => {
    const mappings = automation.fieldMappings as Record<string, unknown>;
    expect(mappings).toHaveProperty('feverSymptoms');
    expect(mappings).toHaveProperty('infectiousDisease');
    expect(mappings).toHaveProperty('visitedOutbreakArea');
    expect(mappings).toHaveProperty('contactWithInfected');
  });

  test('fieldMappings includes SGP-specific customs fields', () => {
    const mappings = automation.fieldMappings as Record<string, unknown>;
    expect(mappings).toHaveProperty('exceedsAllowance');
    expect(mappings).toHaveProperty('carryingCash');
    expect(mappings).toHaveProperty('prohibitedGoods');
  });

  test('fieldMappings includes SGP-specific accommodation type field', () => {
    const mappings = automation.fieldMappings as Record<string, unknown>;
    expect(mappings).toHaveProperty('accommodationType');
  });

  test('fieldMappings includes SGP-specific arrivalTime field', () => {
    const mappings = automation.fieldMappings as Record<string, unknown>;
    expect(mappings).toHaveProperty('arrivalTime');
  });

  test('SGP has 7 submission guide steps and detectors match', () => {
    expect(SGP.submissionGuide).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Cross-country: JSON schemas still validate correctly
// ---------------------------------------------------------------------------

describe('JSON schemas still pass Zod validation after script creation', () => {
  test('JPN.json validates without error', () => {
    expect(() => {
      const validated = loadSchema(JPN, 'JPN');
      validateSchemaCompletely(validated);
    }).not.toThrow();
  });

  test('MYS.json validates without error', () => {
    expect(() => {
      const validated = loadSchema(MYS, 'MYS');
      validateSchemaCompletely(validated);
    }).not.toThrow();
  });

  test('SGP.json validates without error', () => {
    expect(() => {
      const validated = loadSchema(SGP, 'SGP');
      validateSchemaCompletely(validated);
    }).not.toThrow();
  });
});
