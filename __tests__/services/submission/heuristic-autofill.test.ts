import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Portal auto-fill should use runtime DOM heuristic matching
 * instead of per-country CSS selectors.
 *
 * Like 1Password: scan live DOM for form elements, read their
 * name/id/placeholder/label/autocomplete attributes, match to
 * profile fields using fuzzy heuristics. No stored selectors.
 *
 * This works on ANY government portal without per-country maintenance.
 * When a portal updates their HTML, auto-fill still works because we
 * match by semantic meaning, not hardcoded CSS selectors.
 *
 * Confirm: auto-fill works on MDAC without any MYS-specific selectors
 * Invalidate: government portals use non-standard field names that
 *   heuristics can't match (in which case, keep per-country overrides
 *   as fallback)
 */

test('heuristic auto-fill service exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
  )).toBe(true);
});

test('heuristic filler builds JS that scans DOM elements at runtime', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Script should scan for form elements
  expect(content).toMatch(/querySelectorAll.*input|querySelectorAll.*select|querySelectorAll.*textarea/);
  // Script should read element attributes for matching
  expect(content).toMatch(/\.name|\.id|\.placeholder|autocomplete/);
});

test('heuristic filler matches fields by attribute patterns, not CSS selectors', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Should have a mapping from attribute patterns to profile field names
  // e.g., passport|passport.no|passportNumber → profile.passportNumber
  expect(content).toMatch(/passport/i);
  expect(content).toMatch(/surname|family.?name|last.?name/i);
  expect(content).toMatch(/given.?name|first.?name/i);
  expect(content).toMatch(/nationality|citizenship/i);
  expect(content).toMatch(/date.?of.?birth|dob|birth.?date/i);
  expect(content).toMatch(/email/i);
  expect(content).toMatch(/phone|mobile|tel/i);
});

test('heuristic filler takes profile data, not field specs with selectors', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Should accept a flat key-value map of profile data to fill
  // Not FieldSpec[] with per-field CSS selectors
  expect(content).not.toMatch(/interface FieldSpec/);
  expect(content).toMatch(/profileData|profile.*Record|fillData/i);
});

test('heuristic filler reports results back via postMessage', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Same result protocol as before — filled/total/results
  expect(content).toMatch(/AUTO_FILL_RESULT/);
  expect(content).toMatch(/filled/);
  expect(content).toMatch(/postMessage/);
});

test('usePortalAutoFill uses heuristic filler instead of selector-based', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePortalAutoFill.ts'),
    'utf-8',
  );
  // Should import and use the heuristic filler
  expect(content).toMatch(/heuristicFiller|heuristic/i);
  // Should NOT use buildAutoFillSpecs (selector-based)
  expect(content).not.toMatch(/buildAutoFillSpecs/);
});

test('heuristic filler also reads associated label text', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Should find <label for="..."> or parent label elements
  // This is how 1Password matches fields without id/name attrs
  expect(content).toMatch(/label|for.*=|previousSibling|parentElement/i);
});

test('heuristic filler handles select elements by matching option text', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // For <select> elements, should match option text to expected value
  // e.g., nationality select with option "UNITED STATES" matches "USA"
  expect(content).toMatch(/options|option.*text|selectedIndex/i);
});
