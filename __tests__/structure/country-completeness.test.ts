import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_COUNTRY_CODES } from '../../src/constants/countries';

/**
 * Constraint: Country Flag Coverage
 *
 * Ensures every supported country has a matching flag implementation in
 * CountryFlag.tsx and no orphaned flag cases exist for unsupported countries.
 */

const FLAG_COMPONENT_PATH = path.resolve(
  __dirname,
  '../../src/components/trips/CountryFlag.tsx'
);

describe('Country completeness', () => {
  const flagSource = fs.readFileSync(FLAG_COMPONENT_PATH, 'utf8');

  // Extract all case 'XXX': entries from the switch statement
  const flagCases = new Set(
    Array.from(flagSource.matchAll(/case\s+'([A-Z]{3})':/g)).map(m => m[1])
  );

  it('should have a flag implementation for every supported country', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(code => !flagCases.has(code));

    if (missing.length > 0) {
      throw new Error(
        `Missing flag implementation in CountryFlag.tsx for: ${missing.join(', ')}.\n` +
        `Every country in SUPPORTED_COUNTRIES must have a case in the renderFlag() switch.\n` +
        `Add a case '<CODE>': return (...) for each missing country.`
      );
    }
  });

  it('should not have flag cases for unsupported countries', () => {
    const codes = new Set(SUPPORTED_COUNTRY_CODES);
    const extra = Array.from(flagCases).filter(code => !codes.has(code));

    if (extra.length > 0) {
      throw new Error(
        `CountryFlag.tsx has flag cases for unsupported countries: ${extra.join(', ')}.\n` +
        `Either add them to SUPPORTED_COUNTRIES or remove the flag case.`
      );
    }
  });
});
