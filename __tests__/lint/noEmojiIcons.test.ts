import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures screens and components don't use emoji characters as icons.
 *
 * Many emoji (especially multi-codepoint ones like shield, lock, pencil)
 * render as "?" boxes on iOS in React Native <Text> components.
 * All icons should use lucide-react-native SVG components instead.
 */

// Matches emoji in Miscellaneous Symbols, Dingbats, Emoticons,
// Transport/Map Symbols, and Supplemental Symbols Unicode blocks.
const EMOJI_RANGE = '\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}';

// Detect emoji anywhere in a <Text> element or string literal.
// Matches: <Text ...>📊 Storage</Text>, <Text>⚠️ Warning</Text>, etc.
// Strips safe ASCII symbols before checking.
function hasEmojiInText(line: string): boolean {
  const cleaned = line.replace(SAFE_SYMBOLS, '');
  const re = new RegExp(`[${EMOJI_RANGE}]`, 'u');
  return re.test(cleaned);
}

// Detect emoji in button title props, e.g. title="EMOJI Button Text"
function hasEmojiInTitle(line: string): boolean {
  const re = new RegExp(`title=["'\`][^"'\`]*[${EMOJI_RANGE}]`, 'u');
  return re.test(line);
}

// ASCII symbols that render fine on iOS — exclude from emoji detection
const SAFE_SYMBOLS = /[✓✕○⚠⚡]/g;

// Files that are allowed to have emoji (camera overlays, non-visible utils).
const ALLOWED_FILES = new Set([
  // QR full screen overlay controls — uses ASCII ✕ which renders fine
  'components/wallet/QRFullScreen.tsx',
  // Loading state uses ASCII ✓ checkmark which renders fine
  'components/ui/LoadingStates.tsx',
]);

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('No emoji icons in UI components', () => {
  const srcDir = path.resolve(__dirname, '../../src');
  const files = [
    ...getAllTsxFiles(path.join(srcDir, 'screens')),
    ...getAllTsxFiles(path.join(srcDir, 'components')),
  ];

  it('should find tsx files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('should not have any lint violations for icons and emojis', () => {
    const emojiAsIconViolations: string[] = [];
    const emojiInTitleViolations: string[] = [];
    const bannedImportViolations: string[] = [];
    const bannedImports = [
      'react-native-vector-icons',
      'react-native-heroicons',
      '@expo/vector-icons',
    ];

    for (const file of files) {
      const relPath = path.relative(srcDir, file);
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!ALLOWED_FILES.has(relPath) && hasEmojiInText(line)) {
          emojiAsIconViolations.push(`${relPath}:${i + 1}: ${line.trim()}`);
        }

        if (hasEmojiInTitle(line)) {
          emojiInTitleViolations.push(`${relPath}:${i + 1}: ${line.trim()}`);
        }

        for (const banned of bannedImports) {
          if (line.includes(`from '${banned}`) || line.includes(`from "${banned}`)) {
            bannedImportViolations.push(`${relPath}:${i + 1}: ${line.trim()}`);
          }
        }
      }
    }

    const allViolations: string[] = [];
    if (emojiAsIconViolations.length > 0) {
      allViolations.push(
        `Found ${emojiAsIconViolations.length} emoji used as icons. ` +
          'Use lucide-react-native SVG components instead.\n\n' +
          emojiAsIconViolations.join('\n')
      );
    }
    if (emojiInTitleViolations.length > 0) {
      allViolations.push(
        `Found ${emojiInTitleViolations.length} emoji in button titles. ` +
          'Remove emoji from title props — use icon props or lucide components instead.\n\n' +
          emojiInTitleViolations.join('\n')
      );
    }
    if (bannedImportViolations.length > 0) {
      allViolations.push(
        `Found ${bannedImportViolations.length} imports from banned icon libraries. ` +
          'Use lucide-react-native as the single icon library.\n\n' +
          bannedImportViolations.join('\n')
      );
    }

    if (allViolations.length > 0) {
      throw new Error(allViolations.join('\n\n'));
    }
  });
});
