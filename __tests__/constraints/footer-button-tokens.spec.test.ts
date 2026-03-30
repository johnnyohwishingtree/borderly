import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Footer CTA buttons must use consistent design tokens.
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

test.skip('footer buttons use size="large" not size="medium" or size="small"', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');

    // Find footer sections (after </ScrollView> or in action-buttons-bar)
    const scrollClose = content.lastIndexOf('</ScrollView>');
    if (scrollClose === -1) continue;

    const footerContent = content.slice(scrollClose);

    // Check for Button with size="medium" or size="small" in footer
    const mediumInFooter = footerContent.match(/size=["']medium["']/g);
    const smallInFooter = footerContent.match(/size=["']small["']/g);

    if (mediumInFooter || smallInFooter) {
      const relative = file.replace(ROOT + '/', '');
      const count = (mediumInFooter?.length || 0) + (smallInFooter?.length || 0);
      violations.push(`${relative} (${count} non-large buttons in footer)`);
    }
  }

  expect(violations).toEqual([]);
});
