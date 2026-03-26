/**
 * Tests for schemas/validation/validationRules
 */

import {
  VALID_FIELD_TYPES,
  VALID_FILL_METHODS,
  VALID_ACTION_TYPES,
  VALID_COMPLEXITIES,
  VALID_STATUSES,
  VALID_FREQUENCIES,
  VALID_PREREQUISITE_TYPES,
  REQUIRED_SCHEMA_FIELDS,
  SEMVER_REGEX,
  DURATION_REGEX,
} from '@/services/schemas/validation/validationRules';

// ---------------------------------------------------------------------------
// Constants presence
// ---------------------------------------------------------------------------
describe('validation rule constants', () => {
  it('VALID_FIELD_TYPES includes standard form field types', () => {
    expect(VALID_FIELD_TYPES).toContain('text');
    expect(VALID_FIELD_TYPES).toContain('date');
    expect(VALID_FIELD_TYPES).toContain('select');
    expect(VALID_FIELD_TYPES).toContain('boolean');
  });

  it('VALID_FILL_METHODS includes expected methods', () => {
    expect(VALID_FILL_METHODS).toContain('input');
    expect(VALID_FILL_METHODS).toContain('select');
  });

  it('VALID_ACTION_TYPES includes navigation and form actions', () => {
    expect(VALID_ACTION_TYPES).toContain('navigate');
    expect(VALID_ACTION_TYPES).toContain('click');
    expect(VALID_ACTION_TYPES).toContain('fill');
    expect(VALID_ACTION_TYPES).toContain('submit');
  });

  it('VALID_COMPLEXITIES has expected levels', () => {
    expect(VALID_COMPLEXITIES).toEqual(['low', 'medium', 'high']);
  });

  it('VALID_STATUSES includes lifecycle states', () => {
    expect(VALID_STATUSES).toContain('planned');
    expect(VALID_STATUSES).toContain('complete');
    expect(VALID_STATUSES).toContain('deprecated');
  });

  it('VALID_FREQUENCIES includes time periods', () => {
    expect(VALID_FREQUENCIES).toContain('weekly');
    expect(VALID_FREQUENCIES).toContain('monthly');
  });

  it('VALID_PREREQUISITE_TYPES includes document and payment', () => {
    expect(VALID_PREREQUISITE_TYPES).toContain('document');
    expect(VALID_PREREQUISITE_TYPES).toContain('payment');
  });

  it('REQUIRED_SCHEMA_FIELDS includes core schema fields', () => {
    expect(REQUIRED_SCHEMA_FIELDS).toContain('countryCode');
    expect(REQUIRED_SCHEMA_FIELDS).toContain('sections');
    expect(REQUIRED_SCHEMA_FIELDS).toContain('submissionGuide');
    expect(REQUIRED_SCHEMA_FIELDS).toContain('portalUrl');
  });
});

// ---------------------------------------------------------------------------
// SEMVER_REGEX
// ---------------------------------------------------------------------------
describe('SEMVER_REGEX', () => {
  it('matches valid semver strings', () => {
    expect(SEMVER_REGEX.test('1.0.0')).toBe(true);
    expect(SEMVER_REGEX.test('12.34.56')).toBe(true);
    expect(SEMVER_REGEX.test('1.0.0-beta.1')).toBe(true);
  });

  it('rejects invalid semver strings', () => {
    expect(SEMVER_REGEX.test('1.0')).toBe(false);
    expect(SEMVER_REGEX.test('v1.0.0')).toBe(false);
    expect(SEMVER_REGEX.test('abc')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DURATION_REGEX
// ---------------------------------------------------------------------------
describe('DURATION_REGEX', () => {
  it('matches valid durations', () => {
    expect(DURATION_REGEX.test('14d')).toBe(true);
    expect(DURATION_REGEX.test('72h')).toBe(true);
    expect(DURATION_REGEX.test('1w')).toBe(true);
  });

  it('rejects invalid durations', () => {
    expect(DURATION_REGEX.test('14m')).toBe(false);
    expect(DURATION_REGEX.test('d14')).toBe(false);
    expect(DURATION_REGEX.test('')).toBe(false);
  });
});
