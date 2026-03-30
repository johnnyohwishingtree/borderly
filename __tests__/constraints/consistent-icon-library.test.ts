import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Consistent Icon Library
 *
 * Scope: src/ must come from lucide-react-native. No mixing icon libraries.
 * Constraint candidate — applies to all source files.
 *
 * Decision: Lucide icons only — consistent visual weight, tree-shakeable, works
 *   with NativeWind className. One icon library = one visual language.
 * Rejected: react-native-vector-icons (inconsistent weights, larger bundle),
 *   @expo/vector-icons (Expo dependency), mixing multiple icon sets.
 *
 * DENY: Imports from react-native-vector-icons, @expo/vector-icons, FontAwesome,
 *   Ionicons, MaterialIcons, or any non-Lucide icon package
 * ALLOW: lucide-react-native only
 */

function getAllSourceFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getAllSourceFiles(full));
      else if ((full.endsWith('.ts') || full.endsWith('.tsx')) && !full.includes('.test.') && !full.includes('__')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

const FORBIDDEN_ICON_IMPORTS = [
  'react-native-vector-icons',
  '@expo/vector-icons',
  'FontAwesome',
  'Ionicons',
  'MaterialIcons',
  'MaterialCommunityIcons',
  'Feather',
  'AntDesign',
];

test('no non-Lucide icon library imports', () => {
  const files = getAllSourceFiles(resolve(ROOT, 'src'));
  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const forbidden of FORBIDDEN_ICON_IMPORTS) {
      if (content.includes(forbidden)) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}: imports ${forbidden}`);
      }
    }
  }

  expect(violations).toEqual([]);
});
