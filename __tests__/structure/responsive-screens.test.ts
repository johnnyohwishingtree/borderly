import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures all screen files use the responsive ScreenContainer wrapper.
 *
 * ScreenContainer adds a max-width constraint on web/tablet so forms and
 * lists don't stretch edge-to-edge on wide viewports. On mobile it's a
 * transparent passthrough (just flex-1).
 *
 * Without this, screens render at 100% width on web — a 1440px-wide form
 * field is unusable. This test catches the root cause (missing responsive
 * container) rather than relying on multi-viewport screenshot capture.
 */

const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');

// Screens exempt from the ScreenContainer requirement.
// Each entry needs a justification comment.
const EXEMPT_SCREENS = new Set([
  // Lock screen is intentionally full-bleed (dark overlay with centered PIN)
  'LockScreen',
  // Portal submission uses SafeAreaView + WebView that must be full-width
  'PortalSubmissionScreen',
]);

function findScreenFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findScreenFiles(fullPath));
    } else if (entry.name.endsWith('Screen.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Responsive screen containers', () => {
  const screenFiles = findScreenFiles(SCREENS_DIR);

  it('should find screen files', () => {
    expect(screenFiles.length).toBeGreaterThan(0);
  });

  it('should use ScreenContainer in all non-exempt screens', () => {
    const missing: string[] = [];

    for (const file of screenFiles) {
      const screenName = path.basename(file, '.tsx');
      if (EXEMPT_SCREENS.has(screenName)) continue;

      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('ScreenContainer')) {
        const relPath = path.relative(path.resolve(__dirname, '../..'), file);
        missing.push(relPath);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `${missing.length} screen(s) missing ScreenContainer wrapper:\n\n` +
        missing.map(p => `  - ${p}`).join('\n') +
        '\n\nWrap each screen\'s root element with <ScreenContainer> from @/components/ui.\n' +
        'If a screen genuinely needs full-width, add it to EXEMPT_SCREENS with a comment.'
      );
    }
  });
});
