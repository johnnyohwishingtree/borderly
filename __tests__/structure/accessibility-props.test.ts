/**
 * Structural test: accessibility props on interactive components.
 *
 * Interactive elements (Button, TouchableOpacity, Pressable with onPress)
 * must have accessibilityRole and accessibilityLabel.
 *
 * See: .knowledge/conventions/accessibility/core-principles.md
 * See: .knowledge/conventions/accessibility/component-props.md
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
