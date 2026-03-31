import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Portal auto-fill should behave like 1Password — small floating
 * icon, tap to fill all fields, brief success/failure banner. No
 * expandable field list, no "Fields for this page (14)" panel.
 *
 * The user's mental model: "I see the Borderly icon on the form,
 * I tap it, everything fills." Not "I open a panel, read 14 fields,
 * then tap auto-fill."
 *
 * Confirm: Users tap the floating icon without reading any instructions
 * Invalidate: Users need to see field values before filling
 */

test.skip('PortalSubmission has no collapsible fields panel', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen.tsx'),
    'utf-8',
  );
  // No "Fields for this page" text or togglePanel
  expect(content).not.toMatch(/Fields for this page/);
  expect(content).not.toMatch(/togglePanel/);
  expect(content).not.toMatch(/isPanelOpen/);
  // No CopyableField imports (no manual copy-paste fields)
  expect(content).not.toMatch(/CopyableField/);
});

test.skip('PortalSubmission has no Submit in App button', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen.tsx'),
    'utf-8',
  );
  // The Submit in App button added complexity — auto-fill pill replaces it
  expect(content).not.toMatch(/Submit in App/);
  expect(content).not.toMatch(/handleSubmitInApp/);
});

test.skip('AutoFillPill is a small floating icon, not a card', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/submission/AutoFillPill.tsx'),
    'utf-8',
  );
  // Should be a small circular icon (like 1Password key icon)
  // Not a multi-line card with header + profile selector + button
  expect(content).not.toMatch(/Auto-fill available/);
  expect(content).not.toMatch(/Auto-fill Now/);
  // Should have a small fixed-size touchable (icon only, not card)
  expect(content).toMatch(/w-12|w-14|width.*4[48]/); // ~44-56pt icon
  expect(content).toMatch(/h-12|h-14|height.*4[48]/);
  expect(content).toMatch(/rounded-full/); // circular
});

test.skip('tapping AutoFillPill triggers auto-fill immediately', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/submission/AutoFillPill.tsx'),
    'utf-8',
  );
  // Single tap = fill. No intermediate "Auto-fill Now" button.
  // The onPress of the pill itself calls onAutoFill
  expect(content).toMatch(/onPress.*onAutoFill|onPress.*handleAutoFill/);
});

test.skip('AutoFillPill shows Borderly logo or branded icon', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/submission/AutoFillPill.tsx'),
    'utf-8',
  );
  // Should use a Borderly-branded icon (Sparkles or custom logo)
  // Not generic text like "Auto-fill available"
  expect(content).toMatch(/Sparkles|Wand|Logo|borderly/i);
});

test.skip('AutoFillPill positions at bottom-right of WebView', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/submission/AutoFillPill.tsx'),
    'utf-8',
  );
  // 1Password positions at bottom-right, not spanning full width
  expect(content).toMatch(/bottom-/);
  expect(content).toMatch(/right-/);
  // Should NOT span full width (no left-4 right-4)
  expect(content).not.toMatch(/left-4 right-4/);
});

test.skip('auto-fill result shown as brief dismissible banner', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen.tsx'),
    'utf-8',
  );
  // AutoFillBanner should still exist for showing results
  expect(content).toMatch(/AutoFillBanner/);
  // But no manual guide or low-fill-rate panel — just a banner
  expect(content).not.toMatch(/lowFillWarning/);
});
