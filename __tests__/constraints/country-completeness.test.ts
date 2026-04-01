import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_COUNTRY_CODES } from '../../src/constants/countries';

/**
 * Constraint: Country Completeness
 *
 * Every supported country must have ALL required components.
 * Adding a country code to SUPPORTED_COUNTRY_CODES without creating
 * all components will fail this test — the test IS the recipe.
 *
 * Required per country:
 * - src/schemas/<ISO>.json (form schema)
 * - src/services/submission/mappings/<ISO>.ts (field mappings)
 * - __tests__/schemas/<ISO>.test.ts (schema tests using runSharedSchemaTests)
 * - __tests__/services/submission/mappings/<ISO>.test.ts (mapping tests)
 * - .context/external/countries/<iso>.md (portal documentation)
 * - ALPHA3_TO_ALPHA2 entry in CountryFlag.tsx (for flag emoji rendering)
 *
 * Anti-patterns:
 * - Adding a schema without a mapping file (auto-fill silently fails)
 * - Adding a mapping without tests (no validation that keys match schema)
 * - Adding code without portal documentation (agent has no context for future changes)
 */

const ROOT = path.resolve(__dirname, '../..');

const FLAG_COMPONENT_PATH = path.resolve(ROOT, 'src/components/trips/CountryFlag.tsx');

describe('Country completeness', () => {
  const flagSource = fs.readFileSync(FLAG_COMPONENT_PATH, 'utf8');
  // CountryFlag uses ALPHA3_TO_ALPHA2 map for flag emoji rendering
  const flagEntries = new Set(
    Array.from(flagSource.matchAll(/([A-Z]{3}):\s*'[A-Z]{2}'/g)).map(m => m[1]),
  );

  it('every supported country has a flag implementation', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(code => !flagEntries.has(code));
    expect(missing).toEqual([]);
  });

  it('no flag entries for unsupported countries', () => {
    const codes = new Set(SUPPORTED_COUNTRY_CODES);
    const extra = Array.from(flagEntries).filter(code => !codes.has(code));
    expect(extra).toEqual([]);
  });

  it('every supported country has a schema file', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(
      code => !fs.existsSync(path.resolve(ROOT, `src/schemas/${code}.json`)),
    );
    expect(missing).toEqual([]);
  });

  it('every supported country has a submission mapping', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(
      code => !fs.existsSync(path.resolve(ROOT, `src/services/submission/mappings/${code}.ts`)),
    );
    expect(missing).toEqual([]);
  });

  it('every supported country has schema tests', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(
      code => !fs.existsSync(path.resolve(ROOT, `__tests__/schemas/${code}.test.ts`)),
    );
    expect(missing).toEqual([]);
  });

  it('every supported country has mapping tests', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(
      code =>
        !fs.existsSync(path.resolve(ROOT, `__tests__/services/submission/mappings/${code}.test.ts`)),
    );
    expect(missing).toEqual([]);
  });

  it('every supported country has portal documentation', () => {
    const missing = SUPPORTED_COUNTRY_CODES.filter(
      code =>
        !fs.existsSync(path.resolve(ROOT, `.context/external/countries/${code.toLowerCase()}.md`)),
    );
    expect(missing).toEqual([]);
  });

  it('every schema test uses runSharedSchemaTests', () => {
    const notUsing: string[] = [];
    for (const code of SUPPORTED_COUNTRY_CODES) {
      const testPath = path.resolve(ROOT, `__tests__/schemas/${code}.test.ts`);
      if (fs.existsSync(testPath)) {
        const content = fs.readFileSync(testPath, 'utf-8');
        if (!content.includes('runSharedSchemaTests')) {
          notUsing.push(code);
        }
      }
    }
    expect(notUsing).toEqual([]);
  });

  it('every mapping test uses runSharedMappingTests', () => {
    const notUsing: string[] = [];
    for (const code of SUPPORTED_COUNTRY_CODES) {
      const testPath = path.resolve(ROOT, `__tests__/services/submission/mappings/${code}.test.ts`);
      if (fs.existsSync(testPath)) {
        const content = fs.readFileSync(testPath, 'utf-8');
        if (!content.includes('runSharedMappingTests')) {
          notUsing.push(code);
        }
      }
    }
    expect(notUsing).toEqual([]);
  });
});
