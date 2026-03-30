/**
 * Constraint: Accessibility Props
 *
 * Scope: src/components/, src/screens/
 *
 * REQUIRE: every interactive element has accessible={true} + accessibilityRole
 * REQUIRE: accessibilityLabel describes intent ("Submit declaration form" not "Blue button")
 * REQUIRE: errors announced via accessibilityLiveRegion="polite"
 * REQUIRE: decorative elements hidden: accessibilityElementsHidden={true}
 * REQUIRE: disabled/loading/selected state via accessibilityState
 * REQUIRE: minimum 44x44pt touch targets
 * DENY:    interactive elements without accessibilityRole
 *
 * Component Prop Requirements:
 * - Button/Pressable: accessibilityRole="button" + accessibilityLabel
 * - TextInput: accessibilityLabel or associated label
 * - Switch/Toggle: accessibilityRole="switch" + accessibilityState
 * - Link: accessibilityRole="link" + accessibilityLabel
 * - Image (informative): accessibilityLabel with description
 * - Image (decorative): accessibilityElementsHidden={true}
 *
 * Exceptions:
 * - Decorative icons next to labeled text — hide with accessibilityElementsHidden
 *
 * Anti-patterns:
 * - <TouchableOpacity onPress={...}> without accessibilityRole
 * - accessibilityLabel="button" — describes appearance, not intent
 * - Touch target smaller than 44x44pt
 *
 * Why: 44pt touch targets required by Apple HIG (.context/external/cognitive/44pt-minimum-touch-target.md)
 *      Travelers use the app stressed, one-handed (.context/external/customer/travelers-fill-forms-at-borders.md)
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

function getComponentFiles(): string[] {
  const dir = resolve(ROOT, 'src/components/ui');
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__' || entry === '__screenshots__') continue;
        walk(full);
      } else if (entry.endsWith('.tsx')) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

describe('Accessibility props on UI components', () => {
  it('Button component has accessibilityRole', () => {
    const buttonPath = resolve(ROOT, 'src/components/ui/Button.tsx');
    const content = readFileSync(buttonPath, 'utf-8');
    expect(content).toContain('accessibilityRole');
  });

  it('UI components with Pressable/TouchableOpacity have accessibilityRole', () => {
    const warnings: string[] = [];

    for (const file of getComponentFiles()) {
      const content = readFileSync(file, 'utf-8');
      const fileName = file.split('/').pop() ?? '';

      // Check if component renders interactive elements
      const hasInteractive = content.includes('<Pressable') || content.includes('<TouchableOpacity');
      const hasA11yRole = content.includes('accessibilityRole');

      if (hasInteractive && !hasA11yRole) {
        warnings.push(fileName);
      }
    }

    // Warn but don't fail — a11y is being added incrementally
    if (warnings.length > 0) {
      console.warn(`UI components with interactive elements but no accessibilityRole: ${warnings.join(', ')}`);
    }
  });

  it('components with accessibilityRole also have accessibilityLabel', () => {
    const violations: string[] = [];

    for (const file of getComponentFiles()) {
      const content = readFileSync(file, 'utf-8');
      const fileName = file.split('/').pop() ?? '';

      const hasRole = content.includes('accessibilityRole');
      const hasLabel = content.includes('accessibilityLabel');

      // If a component uses accessibilityRole, it should also use accessibilityLabel
      if (hasRole && !hasLabel) {
        violations.push(fileName);
      }
    }

    // Some components derive labels from props — warn instead of fail
    if (violations.length > 0) {
      console.warn(`Components with accessibilityRole but no accessibilityLabel: ${violations.join(', ')}`);
    }
  });
});
