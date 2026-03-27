/**
 * Maestro registry sync — verifies screenRegistry.ts matches actual source code.
 *
 * Catches drift between:
 * - testIDs in screenRegistry.ts ↔ testIDs in actual source files
 * - Hand-written subflows ↔ testIDs in registry
 *
 * Runs at `pnpm test` time (< 1 second) instead of Maestro runtime (minutes).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

import { SCREENS } from '../../maestro/generator/screenRegistry';

const ROOT = resolve(__dirname, '../..');

/** Recursively collect all .tsx/.ts file contents under a directory */
function collectAllSource(dir: string): string {
  const absDir = resolve(ROOT, dir);
  if (!existsSync(absDir)) return '';
  const parts: string[] = [];

  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__' || entry === '__screenshots__') continue;
        walk(full);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        parts.push(readFileSync(full, 'utf-8'));
      }
    }
  }
  walk(absDir);
  return parts.join('\n');
}

// Pre-load all source content once (fast — just string concat)
const allSourceContent = collectAllSource('src');

/** Check if a static testID exists anywhere in src/ */
function testIDExistsInSource(testID: string): boolean {
  return allSourceContent.includes(testID);
}

/** Check if a dynamic testID pattern exists (strip ${...} placeholders and check base) */
function dynamicPatternExistsInSource(testID: string): boolean {
  // For `leg-${index}-arrival-date`, check that source contains both
  // the prefix (`leg-`) and suffix (`-arrival-date`) near a template literal
  const parts = testID.split(/\$\{[^}]+\}/);
  // Every non-empty part should exist in source
  return parts.filter(Boolean).every(part => allSourceContent.includes(part));
}

describe('Maestro screenRegistry ↔ source code sync', () => {
  const screenEntries = Object.entries(SCREENS);

  it('every registry screen has an existing source file', () => {
    const missing: string[] = [];
    for (const [name, spec] of screenEntries) {
      if (!existsSync(resolve(ROOT, spec.sourceFile))) {
        missing.push(`${name}: ${spec.sourceFile}`);
      }
    }
    expect(missing).toEqual([]);
  });

  describe.each(screenEntries)('%s', (_name, spec) => {
    it('action button testIDs exist in source', () => {
      const missing: string[] = [];
      for (const btn of spec.actionButtons) {
        if (btn.testID.includes('${')) {
          if (!dynamicPatternExistsInSource(btn.testID)) {
            missing.push(`${btn.testID} (${btn.label})`);
          }
        } else {
          if (!testIDExistsInSource(btn.testID)) {
            missing.push(`${btn.testID} (${btn.label})`);
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it('field testIDs exist in source', () => {
      const missing: string[] = [];
      for (const field of spec.fields) {
        if (field.dynamic || field.testID.includes('${')) {
          if (!dynamicPatternExistsInSource(field.testID)) {
            missing.push(`${field.testID} (${field.label})`);
          }
        } else {
          if (!testIDExistsInSource(field.testID)) {
            missing.push(`${field.testID} (${field.label})`);
          }
        }
      }
      expect(missing).toEqual([]);
    });
  });

  it('hand-written subflows only reference testIDs that exist in source', () => {
    const subflowDir = resolve(ROOT, 'maestro/flows/subflows');
    if (!existsSync(subflowDir)) return;

    const subflows = readdirSync(subflowDir).filter(f => f.endsWith('.yaml'));
    const unknownRefs: string[] = [];

    // Build set of known component sub-testID suffixes
    const componentSuffixes = ['-trigger', '-search', '-line1', '-line2', '-city', '-state', '-postal-code', '-country', '-container'];

    for (const file of subflows) {
      const content = readFileSync(resolve(subflowDir, file), 'utf-8');
      const idPattern = /id:\s*["']?([a-zA-Z][a-zA-Z0-9_-]+)["']?/g;
      let match;
      while ((match = idPattern.exec(content)) !== null) {
        const id = match[1];
        // Skip option IDs — data-driven (country codes, relationship types)
        if (id.includes('-option-')) continue;
        // Skip trip-card-* — dynamic testIDs based on trip name
        if (id.startsWith('trip-card-')) continue;

        // Direct match in source
        if (testIDExistsInSource(id)) continue;

        // Check if it's a component sub-testID (e.g., nationality-field-trigger)
        const isComponentSub = componentSuffixes.some(suffix => {
          if (!id.endsWith(suffix)) return false;
          const base = id.slice(0, -suffix.length);
          return testIDExistsInSource(base);
        });
        if (isComponentSub) continue;

        // Check if it's an instantiated dynamic testID (e.g., leg-0-arrival-date, gender-Male-button)
        // Strip the variable segment and check if the template pattern exists in source
        // e.g., "leg-0-arrival-date" → check source has "leg-" and "-arrival-date"
        // e.g., "gender-Male-button" → check source has "gender-" and "-button"
        const segments = id.split('-');
        const prefix = segments[0] + '-';
        const suffix = '-' + segments[segments.length - 1];
        const templateExists = allSourceContent.includes(prefix) && allSourceContent.includes(suffix) &&
          // Also verify a template literal testID exists with this prefix
          allSourceContent.includes(`\`${prefix}`);
        if (templateExists) continue;

        unknownRefs.push(`${file}: "${id}" not found in source`);
      }
    }

    expect(unknownRefs).toEqual([]);
  });
});
