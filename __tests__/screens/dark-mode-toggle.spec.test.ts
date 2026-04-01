import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Dark mode toggle must actually switch the color scheme.
 *
 * NativeWind uses darkMode: 'class' which requires adding/removing
 * the 'dark' class on a root element. The settings toggle must:
 * 1. Update the MMKV preference
 * 2. Apply the .dark class to the root View via NativeWind's
 *    useColorScheme or colorScheme prop
 * 3. Persist across app restarts
 *
 * Currently the toggle updates preferences but doesn't apply the
 * class — CSS variables never switch, so dark mode has no effect.
 *
 * Confirm: toggling dark mode in Settings immediately changes all colors
 * Invalidate: NativeWind class-based dark mode doesn't work in RN
 */

test.skip('App root applies dark class based on theme preference', () => {
  // The root App or navigation container must read the theme preference
  // and pass it to NativeWind's color scheme provider
  const appContent = readFileSync(resolve(ROOT, 'src/app/App.tsx'), 'utf-8');

  // Must use NativeWind's colorScheme or useColorScheme
  expect(appContent).toMatch(/colorScheme|useColorScheme|DarkTheme|darkMode/i);
  // Must read from preferences/store (not hardcoded)
  expect(appContent).toMatch(/theme|darkMode|colorScheme.*store|preference/i);
});

test.skip('Settings theme toggle updates the color scheme', () => {
  const settingsContent = readFileSync(resolve(ROOT, 'src/screens/settings/SettingsScreen/SettingsScreen.tsx'), 'utf-8');

  // Must have a theme/dark mode toggle
  expect(settingsContent).toMatch(/dark.*mode|theme.*toggle|color.*scheme|appearance/i);
});

test.skip('useTheme hook provides current theme and toggle function', () => {
  // A theme hook must exist that:
  // 1. Returns current theme ('light' | 'dark' | 'system')
  // 2. Provides a toggle/set function
  // 3. Persists to MMKV
  const themeFiles = [
    'src/utils/theme.ts',
    'src/hooks/useTheme.ts',
    'src/stores/useAppStore.ts',
  ];

  let found = false;
  for (const file of themeFiles) {
    try {
      const content = readFileSync(resolve(ROOT, file), 'utf-8');
      if (content.includes('colorScheme') || content.includes('darkMode') || content.includes('setTheme')) {
        found = true;
        // Must persist to storage
        expect(content).toMatch(/mmkv|AsyncStorage|setPreference|persist/i);
        break;
      }
    } catch { /* file may not exist */ }
  }

  expect(found).toBe(true);
});
