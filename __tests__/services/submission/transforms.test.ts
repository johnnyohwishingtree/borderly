/**
 * Dedicated tests for value transform functions in AutomationScriptUtils.
 *
 * These transforms convert profile data into portal-specific formats before
 * injecting into government portal forms during the auto-fill pipeline.
 *
 * Covered transforms:
 *   - date_format   : YYYY-MM-DD → YYYY/MM/DD (JPN), DD/MM/YYYY (MYS), MM/DD/YYYY (USA)
 *   - country_code  : ISO3 → full country name
 *   - boolean_to_yesno : true/false → "yes"/"no" with configurable variants
 *   - custom        : passthrough (not yet implemented)
 *   - undefined     : passthrough
 *
 * Edge cases: empty strings, null, undefined, unknown format specifiers.
 */

import { AutomationScriptUtils } from '../../../src/services/submission/automationScripts';

// ---------------------------------------------------------------------------
// date_format transform
// ---------------------------------------------------------------------------

describe('Transform: date_format', () => {
  // -------------------------------------------------------------------------
  // YYYY-MM-DD → YYYY/MM/DD (Japan portal format)
  // -------------------------------------------------------------------------
  describe('YYYY-MM-DD → YYYY/MM/DD', () => {
    const transform = {
      type: 'date_format' as const,
      config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
    };

    it('converts a standard date', () => {
      expect(AutomationScriptUtils.applyTransform('1990-06-15', transform)).toBe('1990/06/15');
    });

    it('converts year 2000 date', () => {
      expect(AutomationScriptUtils.applyTransform('2000-01-01', transform)).toBe('2000/01/01');
    });

    it('converts a future date', () => {
      expect(AutomationScriptUtils.applyTransform('2030-12-31', transform)).toBe('2030/12/31');
    });

    it('converts arrival date (2026-04-01 → 2026/04/01)', () => {
      expect(AutomationScriptUtils.applyTransform('2026-04-01', transform)).toBe('2026/04/01');
    });

    it('returns empty string unchanged', () => {
      expect(AutomationScriptUtils.applyTransform('', transform)).toBe('');
    });

    it('returns undefined unchanged (try-catch path)', () => {
      // Passing undefined: replace() throws inside try, catch returns the original value
      expect(
        AutomationScriptUtils.applyTransform(undefined as unknown as string, transform),
      ).toBeUndefined();
    });

    it('returns null unchanged (try-catch path)', () => {
      expect(
        AutomationScriptUtils.applyTransform(null as unknown as string, transform),
      ).toBeNull();
    });

    it('converts all dashes — two-digit month and day', () => {
      expect(AutomationScriptUtils.applyTransform('1985-03-15', transform)).toBe('1985/03/15');
    });
  });

  // -------------------------------------------------------------------------
  // DD/MM/YYYY (Malaysia portal format) — not yet implemented → returns original
  // -------------------------------------------------------------------------
  describe('DD/MM/YYYY (MYS — not yet implemented)', () => {
    const transform = {
      type: 'date_format' as const,
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    };

    it('returns original value (unsupported format pair)', () => {
      expect(AutomationScriptUtils.applyTransform('1990-06-15', transform)).toBe('1990-06-15');
    });

    it('returns original value for a travel date', () => {
      expect(AutomationScriptUtils.applyTransform('2026-04-12', transform)).toBe('2026-04-12');
    });

    it('returns empty string unchanged', () => {
      expect(AutomationScriptUtils.applyTransform('', transform)).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // MM/DD/YYYY (USA portal format) — not yet implemented → returns original
  // -------------------------------------------------------------------------
  describe('MM/DD/YYYY (USA — not yet implemented)', () => {
    const transform = {
      type: 'date_format' as const,
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    };

    it('returns original value (unsupported format pair)', () => {
      expect(AutomationScriptUtils.applyTransform('1990-06-15', transform)).toBe('1990-06-15');
    });

    it('returns empty string unchanged', () => {
      expect(AutomationScriptUtils.applyTransform('', transform)).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Missing / malformed config edge cases
  // -------------------------------------------------------------------------
  describe('edge cases — missing config', () => {
    it('returns original value when config is undefined', () => {
      expect(
        AutomationScriptUtils.applyTransform('1990-06-15', {
          type: 'date_format' as const,
        }),
      ).toBe('1990-06-15');
    });

    it('returns original value when config is empty object', () => {
      expect(
        AutomationScriptUtils.applyTransform('1990-06-15', {
          type: 'date_format' as const,
          config: {},
        }),
      ).toBe('1990-06-15');
    });

    it('returns original value when config has only "from" key', () => {
      expect(
        AutomationScriptUtils.applyTransform('1990-06-15', {
          type: 'date_format' as const,
          config: { from: 'YYYY-MM-DD' },
        }),
      ).toBe('1990-06-15');
    });

    it('returns original value when config has only "to" key', () => {
      expect(
        AutomationScriptUtils.applyTransform('1990-06-15', {
          type: 'date_format' as const,
          config: { to: 'YYYY/MM/DD' },
        }),
      ).toBe('1990-06-15');
    });

    it('returns original value for completely unknown format pair', () => {
      expect(
        AutomationScriptUtils.applyTransform('15/06/1990', {
          type: 'date_format' as const,
          config: { from: 'DD/MM/YYYY', to: 'MM-DD-YYYY' },
        }),
      ).toBe('15/06/1990');
    });
  });
});

// ---------------------------------------------------------------------------
// country_code transform
// ---------------------------------------------------------------------------

describe('Transform: country_code', () => {
  describe('iso3_to_name — known codes', () => {
    const transform = {
      type: 'country_code' as const,
      config: { format: 'iso3_to_name' },
    };

    it.each([
      ['USA', 'United States'],
      ['GBR', 'United Kingdom'],
      ['DEU', 'Germany'],
      ['FRA', 'France'],
      ['JPN', 'Japan'],
      ['KOR', 'South Korea'],
      ['CHN', 'China'],
      ['IND', 'India'],
      ['AUS', 'Australia'],
      ['CAN', 'Canada'],
    ])('converts %s → %s', (code, expected) => {
      expect(AutomationScriptUtils.applyTransform(code, transform)).toBe(expected);
    });
  });

  describe('iso3_to_name — unknown / edge-case codes', () => {
    const transform = {
      type: 'country_code' as const,
      config: { format: 'iso3_to_name' },
    };

    it('returns original value for unknown ISO3 code', () => {
      expect(AutomationScriptUtils.applyTransform('XYZ', transform)).toBe('XYZ');
    });

    it('returns empty string unchanged', () => {
      expect(AutomationScriptUtils.applyTransform('', transform)).toBe('');
    });

    it('returns undefined unchanged', () => {
      expect(
        AutomationScriptUtils.applyTransform(undefined as unknown as string, transform),
      ).toBeUndefined();
    });

    it('returns null unchanged', () => {
      expect(
        AutomationScriptUtils.applyTransform(null as unknown as string, transform),
      ).toBeNull();
    });

    it('is case-sensitive — lowercase code is returned as-is', () => {
      // The lookup map uses uppercase keys; lowercase misses and falls back
      expect(AutomationScriptUtils.applyTransform('usa', transform)).toBe('usa');
      expect(AutomationScriptUtils.applyTransform('jpn', transform)).toBe('jpn');
    });

    it('returns a 2-letter code unchanged (not in ISO3 map)', () => {
      expect(AutomationScriptUtils.applyTransform('JP', transform)).toBe('JP');
    });
  });

  describe('without iso3_to_name format', () => {
    it('returns value unchanged when format is missing from config', () => {
      expect(
        AutomationScriptUtils.applyTransform('USA', {
          type: 'country_code' as const,
          config: {},
        }),
      ).toBe('USA');
    });

    it('returns value unchanged when config is absent', () => {
      expect(
        AutomationScriptUtils.applyTransform('GBR', {
          type: 'country_code' as const,
        }),
      ).toBe('GBR');
    });

    it('returns value unchanged for unrecognised format string', () => {
      expect(
        AutomationScriptUtils.applyTransform('AUS', {
          type: 'country_code' as const,
          config: { format: 'iso2_to_name' },
        }),
      ).toBe('AUS');
    });
  });
});

// ---------------------------------------------------------------------------
// boolean_to_yesno transform
// ---------------------------------------------------------------------------

describe('Transform: boolean_to_yesno', () => {
  describe('default values (yes / no)', () => {
    it('converts true → "yes"', () => {
      expect(
        AutomationScriptUtils.applyTransform(true, {
          type: 'boolean_to_yesno' as const,
          config: {},
        }),
      ).toBe('yes');
    });

    it('converts false → "no"', () => {
      expect(
        AutomationScriptUtils.applyTransform(false, {
          type: 'boolean_to_yesno' as const,
          config: {},
        }),
      ).toBe('no');
    });

    it('uses default "yes"/"no" when config is missing', () => {
      expect(
        AutomationScriptUtils.applyTransform(true, {
          type: 'boolean_to_yesno' as const,
        }),
      ).toBe('yes');

      expect(
        AutomationScriptUtils.applyTransform(false, {
          type: 'boolean_to_yesno' as const,
        }),
      ).toBe('no');
    });
  });

  describe('Y / N variant', () => {
    const transform = {
      type: 'boolean_to_yesno' as const,
      config: { trueValue: 'Y', falseValue: 'N' },
    };

    it('converts true → "Y"', () => {
      expect(AutomationScriptUtils.applyTransform(true, transform)).toBe('Y');
    });

    it('converts false → "N"', () => {
      expect(AutomationScriptUtils.applyTransform(false, transform)).toBe('N');
    });
  });

  describe('YES / NO variant', () => {
    const transform = {
      type: 'boolean_to_yesno' as const,
      config: { trueValue: 'YES', falseValue: 'NO' },
    };

    it('converts true → "YES"', () => {
      expect(AutomationScriptUtils.applyTransform(true, transform)).toBe('YES');
    });

    it('converts false → "NO"', () => {
      expect(AutomationScriptUtils.applyTransform(false, transform)).toBe('NO');
    });
  });

  describe('numeric 1 / 0 variant', () => {
    const transform = {
      type: 'boolean_to_yesno' as const,
      config: { trueValue: '1', falseValue: '0' },
    };

    it('converts true → "1"', () => {
      expect(AutomationScriptUtils.applyTransform(true, transform)).toBe('1');
    });

    it('converts false → "0"', () => {
      expect(AutomationScriptUtils.applyTransform(false, transform)).toBe('0');
    });
  });

  describe('partial config', () => {
    it('uses custom trueValue and default "no" when only trueValue is set', () => {
      expect(
        AutomationScriptUtils.applyTransform(true, {
          type: 'boolean_to_yesno' as const,
          config: { trueValue: 'oui' },
        }),
      ).toBe('oui');

      expect(
        AutomationScriptUtils.applyTransform(false, {
          type: 'boolean_to_yesno' as const,
          config: { trueValue: 'oui' },
        }),
      ).toBe('no');
    });

    it('uses custom falseValue and default "yes" when only falseValue is set', () => {
      expect(
        AutomationScriptUtils.applyTransform(true, {
          type: 'boolean_to_yesno' as const,
          config: { falseValue: 'non' },
        }),
      ).toBe('yes');

      expect(
        AutomationScriptUtils.applyTransform(false, {
          type: 'boolean_to_yesno' as const,
          config: { falseValue: 'non' },
        }),
      ).toBe('non');
    });
  });

  describe('JPN carryingProhibitedItems mapping config', () => {
    // Mirrors the config used in JPN.ts fieldMappings
    const transform = {
      type: 'boolean_to_yesno' as const,
      config: { falseValue: 'no', trueValue: 'yes' },
    };

    it('converts true → "yes"', () => {
      expect(AutomationScriptUtils.applyTransform(true, transform)).toBe('yes');
    });

    it('converts false → "no"', () => {
      expect(AutomationScriptUtils.applyTransform(false, transform)).toBe('no');
    });
  });
});

// ---------------------------------------------------------------------------
// No transform / passthrough
// ---------------------------------------------------------------------------

describe('Transform: undefined (passthrough)', () => {
  it('returns string unchanged', () => {
    expect(AutomationScriptUtils.applyTransform('raw_value', undefined)).toBe('raw_value');
  });

  it('returns empty string unchanged', () => {
    expect(AutomationScriptUtils.applyTransform('', undefined)).toBe('');
  });

  it('returns null unchanged', () => {
    expect(AutomationScriptUtils.applyTransform(null, undefined)).toBeNull();
  });

  it('returns undefined unchanged', () => {
    expect(AutomationScriptUtils.applyTransform(undefined, undefined)).toBeUndefined();
  });

  it('returns numeric value unchanged', () => {
    expect(AutomationScriptUtils.applyTransform(42, undefined)).toBe(42);
  });

  it('returns boolean unchanged', () => {
    expect(AutomationScriptUtils.applyTransform(true, undefined)).toBe(true);
    expect(AutomationScriptUtils.applyTransform(false, undefined)).toBe(false);
  });

  it('returns object unchanged', () => {
    const obj = { key: 'value' };
    expect(AutomationScriptUtils.applyTransform(obj, undefined)).toBe(obj);
  });
});

// ---------------------------------------------------------------------------
// Custom transform (passthrough — not yet implemented)
// ---------------------------------------------------------------------------

describe('Transform: custom (passthrough)', () => {
  it('returns value unchanged for non-empty string', () => {
    expect(
      AutomationScriptUtils.applyTransform('some_value', {
        type: 'custom' as const,
        config: { key: 'value' },
      }),
    ).toBe('some_value');
  });

  it('returns empty string unchanged', () => {
    expect(
      AutomationScriptUtils.applyTransform('', {
        type: 'custom' as const,
        config: {},
      }),
    ).toBe('');
  });

  it('returns null unchanged', () => {
    expect(
      AutomationScriptUtils.applyTransform(null, {
        type: 'custom' as const,
        config: {},
      }),
    ).toBeNull();
  });

  it('returns undefined unchanged', () => {
    expect(
      AutomationScriptUtils.applyTransform(undefined, {
        type: 'custom' as const,
        config: {},
      }),
    ).toBeUndefined();
  });
});
