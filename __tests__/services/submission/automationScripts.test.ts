/**
 * Tests for AutomationScriptRegistry and AutomationScriptUtils.
 */

import {
  AutomationScriptRegistry,
  AutomationScriptUtils,
  automationScriptRegistry,
} from '../../../src/services/submission/automationScripts';
import { ALL_COUNTRY_MAPPINGS } from '../../../src/services/submission/mappings';
import type { AutomationScript, PortalFieldMapping } from '../../../src/types/submission';

// ---------------------------------------------------------------------------
// AutomationScriptRegistry
// ---------------------------------------------------------------------------

describe('AutomationScriptRegistry', () => {
  let registry: AutomationScriptRegistry;

  beforeEach(() => {
    registry = new AutomationScriptRegistry();
  });

  describe('constructor / loadBuiltinScripts', () => {
    it('loads all country mappings on construction', () => {
      const countries = registry.getAvailableCountries();
      expect(countries.length).toBe(ALL_COUNTRY_MAPPINGS.length);
      expect(countries.length).toBeGreaterThanOrEqual(8);
    });

    it('has automation for JPN', () => {
      expect(registry.hasAutomation('JPN')).toBe(true);
    });

    it('has automation for MYS', () => {
      expect(registry.hasAutomation('MYS')).toBe(true);
    });

    it('has automation for SGP', () => {
      expect(registry.hasAutomation('SGP')).toBe(true);
    });
  });

  describe('getScript (async)', () => {
    it.each(['JPN', 'MYS', 'SGP'])('returns the %s script', async (countryCode) => {
      const script = await registry.getScript(countryCode);
      expect(script).not.toBeNull();
      expect(script!.countryCode).toBe(countryCode);
    });

    it('returns null for unknown country codes', async () => {
      expect(await registry.getScript('ZZZ')).toBeNull();
      expect(await registry.getScript('')).toBeNull();
      expect(await registry.getScript('INVALID')).toBeNull();
    });
  });

  describe('getScriptSync', () => {
    it('returns the JPN script synchronously', () => {
      const script = registry.getScriptSync('JPN');
      expect(script).not.toBeNull();
      expect(script!.countryCode).toBe('JPN');
    });

    it('returns null for unknown country', () => {
      expect(registry.getScriptSync('ZZZ')).toBeNull();
      expect(registry.getScriptSync('')).toBeNull();
    });

    it('returns the same object as getScript', async () => {
      const sync = registry.getScriptSync('JPN');
      const async_ = await registry.getScript('JPN');
      expect(sync).toBe(async_);
    });
  });

  describe('hasAutomation', () => {
    it.each([
      ['JPN', true],
      ['MYS', true],
      ['SGP', true],
      ['USA', true],
      ['CAN', true],
      ['GBR', true],
      ['THA', true],
      ['VNM', true],
      ['ZZZ', false],
      ['', false],
    ])('given country code %s, hasAutomation returns %s', (countryCode, expected) => {
      expect(registry.hasAutomation(countryCode)).toBe(expected);
    });
  });

  describe('getAvailableCountries', () => {
    it('returns all registered country codes', () => {
      const countries = registry.getAvailableCountries();
      expect(countries).toContain('JPN');
      expect(countries).toContain('MYS');
      expect(countries).toContain('SGP');
      expect(countries).toContain('USA');
      expect(countries).toContain('CAN');
      expect(countries).toContain('GBR');
      expect(countries).toContain('THA');
      expect(countries).toContain('VNM');
    });

    it('returns an array of strings', () => {
      const countries = registry.getAvailableCountries();
      expect(Array.isArray(countries)).toBe(true);
      countries.forEach((c) => expect(typeof c).toBe('string'));
    });
  });

  describe('registerScript', () => {
    it('registers a new script and makes it available', () => {
      const newScript: AutomationScript = {
        countryCode: 'TST',
        portalUrl: 'https://example.com',
        version: '1.0.0',
        lastUpdated: '2026-01-01T00:00:00Z',
        prerequisites: { cookiesEnabled: true, javascriptEnabled: true },
        steps: [
          {
            id: 'load',
            name: 'Load',
            description: 'Load portal',
            script: 'return true;',
            timing: { timeout: 5000 },
            critical: true,
          },
        ],
        fieldMappings: {},
        session: { maxDurationMs: 10000, keepAlive: false, clearCookiesOnStart: true },
      };

      expect(registry.hasAutomation('TST')).toBe(false);
      registry.registerScript(newScript);
      expect(registry.hasAutomation('TST')).toBe(true);
      expect(registry.getScriptSync('TST')).toBe(newScript);
    });
  });

  describe('JPN field mappings', () => {
    it('has non-empty fieldMappings for JPN', () => {
      const script = registry.getScriptSync('JPN');
      expect(script).not.toBeNull();
      expect(Object.keys(script!.fieldMappings).length).toBeGreaterThan(0);
    });

    it('each JPN field mapping has valid selector, inputType, and fieldId', () => {
      const script = registry.getScriptSync('JPN');
      expect(script).not.toBeNull();
      Object.values(script!.fieldMappings).forEach((mapping: PortalFieldMapping) => {
        expect(typeof mapping.selector).toBe('string');
        expect(mapping.selector.length).toBeGreaterThan(0);
        expect(['text', 'select', 'radio', 'checkbox', 'date', 'file']).toContain(mapping.inputType);
        expect(typeof mapping.fieldId).toBe('string');
        expect(mapping.fieldId.length).toBeGreaterThan(0);
      });
    });

    it('JPN has expected core field mappings', () => {
      const script = registry.getScriptSync('JPN');
      const fieldIds = Object.keys(script!.fieldMappings);
      expect(fieldIds).toContain('surname');
      expect(fieldIds).toContain('givenNames');
      expect(fieldIds).toContain('passportNumber');
      expect(fieldIds).toContain('nationality');
      expect(fieldIds).toContain('dateOfBirth');
    });
  });
});

// ---------------------------------------------------------------------------
// Shared singleton
// ---------------------------------------------------------------------------

describe('automationScriptRegistry singleton', () => {
  it('is an instance of AutomationScriptRegistry', () => {
    expect(automationScriptRegistry).toBeInstanceOf(AutomationScriptRegistry);
  });

  it('has automation for JPN', () => {
    expect(automationScriptRegistry.hasAutomation('JPN')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AutomationScriptUtils — applyTransform
// ---------------------------------------------------------------------------

describe('AutomationScriptUtils.applyTransform', () => {
  describe('date_format transform', () => {
    it('converts YYYY-MM-DD to YYYY/MM/DD', () => {
      const result = AutomationScriptUtils.applyTransform('1990-06-15', {
        type: 'date_format',
        config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
      });
      expect(result).toBe('1990/06/15');
    });

    it('converts all dashes in the date', () => {
      const result = AutomationScriptUtils.applyTransform('2026-03-14', {
        type: 'date_format',
        config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
      });
      expect(result).toBe('2026/03/14');
    });

    it('returns original value when config is missing', () => {
      const result = AutomationScriptUtils.applyTransform('1990-06-15', {
        type: 'date_format',
      });
      expect(result).toBe('1990-06-15');
    });

    it('returns original value for unsupported format pair', () => {
      const result = AutomationScriptUtils.applyTransform('15/06/1990', {
        type: 'date_format',
        config: { from: 'DD/MM/YYYY', to: 'MM-DD-YYYY' },
      });
      expect(result).toBe('15/06/1990');
    });
  });

  describe('country_code transform', () => {
    it('converts ISO3 code to full country name', () => {
      expect(
        AutomationScriptUtils.applyTransform('USA', {
          type: 'country_code',
          config: { format: 'iso3_to_name' },
        }),
      ).toBe('United States');
    });

    it('converts JPN to Japan', () => {
      expect(
        AutomationScriptUtils.applyTransform('JPN', {
          type: 'country_code',
          config: { format: 'iso3_to_name' },
        }),
      ).toBe('Japan');
    });

    it('converts GBR to United Kingdom', () => {
      expect(
        AutomationScriptUtils.applyTransform('GBR', {
          type: 'country_code',
          config: { format: 'iso3_to_name' },
        }),
      ).toBe('United Kingdom');
    });

    it('returns original value for unknown ISO3 code', () => {
      expect(
        AutomationScriptUtils.applyTransform('XYZ', {
          type: 'country_code',
          config: { format: 'iso3_to_name' },
        }),
      ).toBe('XYZ');
    });

    it('returns original value without iso3_to_name format', () => {
      expect(
        AutomationScriptUtils.applyTransform('USA', {
          type: 'country_code',
          config: {},
        }),
      ).toBe('USA');
    });
  });

  describe('boolean_to_yesno transform', () => {
    it('converts true to "yes"', () => {
      expect(
        AutomationScriptUtils.applyTransform(true, {
          type: 'boolean_to_yesno',
          config: {},
        }),
      ).toBe('yes');
    });

    it('converts false to "no"', () => {
      expect(
        AutomationScriptUtils.applyTransform(false, {
          type: 'boolean_to_yesno',
          config: {},
        }),
      ).toBe('no');
    });

    it('uses custom trueValue from config', () => {
      expect(
        AutomationScriptUtils.applyTransform(true, {
          type: 'boolean_to_yesno',
          config: { trueValue: 'YES', falseValue: 'NO' },
        }),
      ).toBe('YES');
    });

    it('uses custom falseValue from config', () => {
      expect(
        AutomationScriptUtils.applyTransform(false, {
          type: 'boolean_to_yesno',
          config: { trueValue: 'YES', falseValue: 'NO' },
        }),
      ).toBe('NO');
    });

    it('uses config from JPN carryingProhibitedItems mapping', () => {
      const trueResult = AutomationScriptUtils.applyTransform(true, {
        type: 'boolean_to_yesno',
        config: { falseValue: 'no', trueValue: 'yes' },
      });
      const falseResult = AutomationScriptUtils.applyTransform(false, {
        type: 'boolean_to_yesno',
        config: { falseValue: 'no', trueValue: 'yes' },
      });
      expect(trueResult).toBe('yes');
      expect(falseResult).toBe('no');
    });
  });

  describe('no transform', () => {
    it('returns value unchanged when transform is undefined', () => {
      expect(AutomationScriptUtils.applyTransform('raw_value', undefined)).toBe('raw_value');
    });
  });

  describe('custom transform', () => {
    it('returns value unchanged for custom transform (not yet implemented)', () => {
      expect(
        AutomationScriptUtils.applyTransform('value', {
          type: 'custom',
          config: {},
        }),
      ).toBe('value');
    });
  });
});

// ---------------------------------------------------------------------------
// AutomationScriptUtils — validateScript
// ---------------------------------------------------------------------------

describe('AutomationScriptUtils.validateScript', () => {
  const validScript: AutomationScript = {
    countryCode: 'TST',
    portalUrl: 'https://example.com',
    version: '1.0.0',
    lastUpdated: '2026-01-01T00:00:00Z',
    prerequisites: { cookiesEnabled: true, javascriptEnabled: true },
    steps: [
      {
        id: 'step1',
        name: 'Step One',
        description: 'First step',
        script: 'return true;',
        timing: { timeout: 5000 },
        critical: true,
      },
    ],
    fieldMappings: {},
    session: { maxDurationMs: 10000, keepAlive: false, clearCookiesOnStart: true },
  };

  it('validates a correct script without errors', () => {
    const result = AutomationScriptUtils.validateScript(validScript);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports error for missing countryCode', () => {
    const script = { ...validScript, countryCode: '' };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('countryCode'))).toBe(true);
  });

  it('reports error for missing portalUrl', () => {
    const script = { ...validScript, portalUrl: '' };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('portalUrl'))).toBe(true);
  });

  it('reports error for missing version', () => {
    const script = { ...validScript, version: '' };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('version'))).toBe(true);
  });

  it('reports error for empty steps array', () => {
    const script = { ...validScript, steps: [] };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('steps'))).toBe(true);
  });

  it('reports error when step is missing id', () => {
    const script = {
      ...validScript,
      steps: [{ ...validScript.steps[0], id: '' }],
    };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('reports error when step is missing name', () => {
    const script = {
      ...validScript,
      steps: [{ ...validScript.steps[0], name: '' }],
    };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('reports error when step is missing script', () => {
    const script = {
      ...validScript,
      steps: [{ ...validScript.steps[0], script: '' }],
    };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('script'))).toBe(true);
  });

  it('reports error when step is missing timeout', () => {
    const script = {
      ...validScript,
      steps: [{ ...validScript.steps[0], timing: { timeout: 0 } }],
    };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('timeout'))).toBe(true);
  });

  it('reports error when cookiesEnabled is missing from prerequisites', () => {
    const script = {
      ...validScript,
      prerequisites: { javascriptEnabled: true } as AutomationScript['prerequisites'],
    };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('cookiesEnabled'))).toBe(true);
  });

  it('reports error when javascriptEnabled is missing from prerequisites', () => {
    const script = {
      ...validScript,
      prerequisites: { cookiesEnabled: true } as AutomationScript['prerequisites'],
    };
    const result = AutomationScriptUtils.validateScript(script);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('javascriptEnabled'))).toBe(true);
  });

  it('validates the real JPN script without errors', () => {
    const jpnScript = automationScriptRegistry.getScriptSync('JPN');
    expect(jpnScript).not.toBeNull();
    const result = AutomationScriptUtils.validateScript(jpnScript!);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AutomationScriptUtils — getScriptStats
// ---------------------------------------------------------------------------

describe('AutomationScriptUtils.getScriptStats', () => {
  it('returns correct stats for JPN script', () => {
    const script = automationScriptRegistry.getScriptSync('JPN');
    expect(script).not.toBeNull();
    const stats = AutomationScriptUtils.getScriptStats(script!);
    expect(stats.stepCount).toBe(script!.steps.length);
    expect(stats.fieldMappingCount).toBe(Object.keys(script!.fieldMappings).length);
    expect(stats.criticalSteps).toBeGreaterThan(0);
    expect(stats.estimatedDuration).toBeGreaterThan(0);
  });
});
