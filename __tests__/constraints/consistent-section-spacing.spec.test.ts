import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Top-level section spacing should use a consistent mb class.
 * Constraint candidate — applies to all screens.
 *
 * Decision: mb-6 (24px) between major sections, mb-4 (16px) for subsections.
 *   No mb-2, mb-3, mb-5, mb-8+ between Card or View sections.
 * Rejected: Mixed spacing (mb-2 through mb-8 on same screen) — breaks rhythm.
 *
 * This checks Card components specifically — the primary section container.
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getScreenFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test.skip('Card components use mb-4 or mb-6 for section spacing', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<Card') && lines[i].includes('mb-')) {
        // Extract the mb value
        const mbMatch = lines[i].match(/mb-(\d+)/);
        if (mbMatch) {
          const val = parseInt(mbMatch[1], 10);
          if (val !== 4 && val !== 6) {
            const relative = file.replace(ROOT + '/', '');
            violations.push(`${relative}:${i + 1}: mb-${val} (should be mb-4 or mb-6)`);
          }
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
