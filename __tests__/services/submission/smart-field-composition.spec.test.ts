// Spec: Heuristic filler must compose profile values to match any portal format.
//
// Profile stores canonical values (ISO dates, country codes, gender codes).
// Government portals use wildly different input formats for the same data.
// The filler must decompose and recompose values to fit:
//
// Dates:
//   "1985-06-15" → 3 Year/Month/Day dropdowns, or DD/MM/YYYY, or MM/DD/YYYY
//
// Names:
//   "JOHN MICHAEL" → single input, or split First + Middle fields
//
// Nationality/Country:
//   "USA" → match dropdown text "United States" or value "US" or "USA"
//
// Gender:
//   "M" → match "Male", "MALE", "M", or value="1"
//
// General principle: the filler matches by MEANING, not exact string.
// For selects: try value match, then text match (case-insensitive, partial).
// For split fields: decompose the value into parts.
//
// Status: hypothesis
// Confirm: All fields fill correctly on Visit Japan Web
// Invalidate: Portal formats are too varied for heuristic matching

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('filler decomposes dates into year/month/day for split selects', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  expect(content).toMatch(/year.*month.*day|getFullYear|splitDate/i);
});

test.skip('filler matches select options by text AND value (case-insensitive)', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Must try both option.value and option.text for matching
  expect(content).toMatch(/option.*text.*toLowerCase|option.*value.*toLowerCase/i);
});

test.skip('filler handles gender codes mapping to display text', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // "M" must match "Male", "MALE", etc.
  expect(content).toMatch(/Male|Female|gender.*map/i);
});

test.skip('filler handles country code to country name mapping for selects', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // "USA" must match "United States" in a dropdown
  expect(content).toMatch(/countryCode.*name|USA.*United States|country.*map/i);
});
