import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Footer CTA
 *
 * Scope: src/screens/
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * Users at borders are distracted and one-handed. The primary action must
 * be visible without scrolling. Fixed footer CTAs are the standard mobile
 * pattern (Apple HIG, Material Design).
 *
 * Confirm: Users find and tap the CTA faster when it's always visible
 * Invalidate: Some screen genuinely has no primary action (display-only)
 */
test('all screen testIDs declare primary CTA in footer zone', () => {
  const screenDirs = ['onboarding', 'trips', 'wallet', 'profile', 'settings'];
  const missing: string[] = [];

  for (const domain of screenDirs) {
    const domainPath = resolve(ROOT, 'src/screens', domain);
    if (!existsSync(domainPath)) continue;

    const screens = readdirSync(domainPath).filter(d => d.endsWith('Screen'));
    for (const screen of screens) {
      const testIDsPath = resolve(domainPath, screen, 'testIDs.ts');
      if (!existsSync(testIDsPath)) continue;

      const content = readFileSync(testIDsPath, 'utf-8');
      // Screen should have at least one button in footer zone
      const hasFooterButton = content.includes("zone: 'footer'") && content.includes("type: 'button'");
      if (!hasFooterButton) {
        missing.push(`${domain}/${screen}`);
      }
    }
  }

  // These screens have no primary action (display-only or modal-based)
  const exceptions = [
    'settings/SettingsScreen',        // navigation list, no CTA
    'profile/ProfileScreen',          // navigation list, no CTA
    'trips/ImportTripScreen',         // tab-based input, CTA is contextual per tab
    'trips/PortalSubmissionScreen',   // WebView with toolbar, CTA is close/submit in toolbar
    'trips/TripListScreen',           // FAB-based navigation, no single CTA
  ];

  const violations = missing.filter(s => !exceptions.some(e => s === e));
  expect(violations).toEqual([]);
});
