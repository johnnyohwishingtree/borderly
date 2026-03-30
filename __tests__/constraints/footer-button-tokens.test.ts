import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Footer Button Tokens
 *
 * Scope: src/screens/ buttons must use consistent design tokens.
 * Constraint candidate — applies to all screens with footer CTAs.
 *
 * Decision: Footer primary CTAs are always variant="primary" size="large" fullWidth.
 *   Secondary footer actions use variant="outline" size="large".
 * Rejected: Mixed sizes in footers (medium + small) — looks inconsistent, smaller
 *   buttons are harder to tap.
 *
 * Context: .context/external/cognitive/44pt-minimum-touch-target.md
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

test('footer buttons use size="large" not size="medium" or size="small"', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');

    // Find footer sections (after </ScrollView> or in action-buttons-bar)
    const scrollClose = content.lastIndexOf('</ScrollView>');
    if (scrollClose === -1) continue;

    const footerContent = content.slice(scrollClose);

    // Check for Button components with size="medium" or size="small" in footer
    const footerLines = footerContent.split('\n');
    let inButton = false;
    let nonLargeCount = 0;
    for (const line of footerLines) {
      if (line.includes('<Button')) inButton = true;
      if (inButton && /size=["'](medium|small)["']/.test(line)) nonLargeCount++;
      if (line.includes('/>') || line.includes('</Button>')) inButton = false;
    }

    if (nonLargeCount > 0) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${nonLargeCount} non-large buttons in footer)`);
    }
  }

  expect(violations).toEqual([]);
});
