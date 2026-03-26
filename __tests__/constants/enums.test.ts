import {
  OCCUPATIONS,
  PURPOSES_OF_VISIT,
  MARITAL_STATUSES,
  getEnumLabel,
  matchFreeformToEnum,
} from '../../src/constants/enums';
import type { EnumOption } from '../../src/constants/enums';

function assertNoDuplicateValues(options: EnumOption[]) {
  const values = options.map((o) => o.value);
  const unique = new Set(values);
  expect(unique.size).toBe(values.length);
}

function assertNonEmpty(options: EnumOption[]) {
  expect(options.length).toBeGreaterThan(0);
  options.forEach((o) => {
    expect(o.value.trim()).not.toBe('');
    expect(o.label.trim()).not.toBe('');
  });
}

describe('Canonical enums', () => {
  describe.each([
    ['OCCUPATIONS', OCCUPATIONS],
    ['PURPOSES_OF_VISIT', PURPOSES_OF_VISIT],
    ['MARITAL_STATUSES', MARITAL_STATUSES],
  ])('%s', (_name, options) => {
    it('has no empty entries', () => assertNonEmpty(options));
    it('has no duplicate values', () => assertNoDuplicateValues(options));

    it('every value is UPPER_SNAKE_CASE', () => {
      options.forEach((o) => {
        expect(o.value).toMatch(/^[A-Z][A-Z0-9_]*$/);
      });
    });

    it('includes an OTHER option', () => {
      expect(options.find((o) => o.value === 'OTHER')).toBeDefined();
    });
  });

  it('OCCUPATIONS has 17 entries', () => {
    expect(OCCUPATIONS).toHaveLength(17);
  });

  it('PURPOSES_OF_VISIT has 8 entries', () => {
    expect(PURPOSES_OF_VISIT).toHaveLength(8);
  });

  it('MARITAL_STATUSES has 6 entries', () => {
    expect(MARITAL_STATUSES).toHaveLength(6);
  });
});

describe('getEnumLabel', () => {
  it('returns the label for a known value', () => {
    expect(getEnumLabel(OCCUPATIONS, 'DOCTOR')).toBe('Doctor');
  });

  it('returns the raw value when no match is found', () => {
    expect(getEnumLabel(OCCUPATIONS, 'UNKNOWN_VALUE')).toBe('UNKNOWN_VALUE');
  });
});

describe('matchFreeformToEnum', () => {
  it('returns empty string for empty input', () => {
    expect(matchFreeformToEnum(OCCUPATIONS, '')).toBe('');
  });

  it('matches exact label (case-insensitive)', () => {
    expect(matchFreeformToEnum(OCCUPATIONS, 'doctor')).toBe('DOCTOR');
    expect(matchFreeformToEnum(OCCUPATIONS, 'Doctor')).toBe('DOCTOR');
  });

  it('matches exact value (case-insensitive)', () => {
    expect(matchFreeformToEnum(OCCUPATIONS, 'STUDENT')).toBe('STUDENT');
  });

  it('matches partial label', () => {
    expect(matchFreeformToEnum(OCCUPATIONS, 'Software')).toBe(
      'SOFTWARE_DEVELOPER',
    );
  });

  it('returns OTHER for unrecognized text', () => {
    expect(matchFreeformToEnum(OCCUPATIONS, 'Astronaut')).toBe('OTHER');
  });

  it('matches marital status labels', () => {
    expect(matchFreeformToEnum(MARITAL_STATUSES, 'married')).toBe('MARRIED');
    expect(matchFreeformToEnum(MARITAL_STATUSES, 'divorced')).toBe('DIVORCED');
  });

  it('matches purpose of visit labels', () => {
    expect(matchFreeformToEnum(PURPOSES_OF_VISIT, 'vacation')).toBe(
      'VACATION',
    );
    expect(matchFreeformToEnum(PURPOSES_OF_VISIT, 'business')).toBe(
      'BUSINESS',
    );
  });
});
