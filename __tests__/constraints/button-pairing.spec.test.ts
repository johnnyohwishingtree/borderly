import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Adjacent buttons should pair primary + secondary, not primary + outline.
 * Constraint candidate — applies to all screens.
 *
 * Decision: Button pairs use primary (solid fill) + secondary (text-only).
 *   Outline is reserved for toggle/selection states (tabs, filters).
 * Rejected: primary + outline pairing — outline's border makes it look like
 *   a competing primary button, breaking visual hierarchy.
 *
 * DENY: variant="outline" in the same parent View as variant="primary"
 * ALLOW: variant="outline" in filter/tab rows (dynamic variant based on selection state)
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

test.skip('screens do not pair primary + outline buttons in the same container', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');

    // Find View blocks that contain both primary and outline Button variants
    // Simple heuristic: if both variant="primary" and variant="outline" appear
    // within 10 lines of each other, and no dynamic variant={...}, flag it
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/variant=["']primary["']/.test(lines[i])) {
        // Check next 10 lines for outline
        const nearby = lines.slice(i + 1, Math.min(lines.length, i + 11)).join(' ');
        if (/variant=["']outline["']/.test(nearby)) {
          // Exclude if there's a dynamic variant (toggle/selection pattern)
          if (nearby.includes('variant={')) continue;
          const relative = file.replace(ROOT + '/', '');
          violations.push(`${relative}:${i + 1}`);
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
