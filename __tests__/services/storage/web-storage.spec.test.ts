/**
 * Spec: Web storage barrel exports real browser implementations (not mocks)
 *
 * Status: hypothesis
 * Confirm: `src/services/storage/index.web.ts` exists and exports the same
 *   named symbols as `index.ts`, backed by IndexedDB + Web Crypto + localStorage
 * Invalidate: WatermelonDB's LokiJS adapter works better than raw IndexedDB
 *
 * Context: The current Vercel build replaces the entire storage barrel with
 * `e2e/mocks/storage.js` via NormalModuleReplacementPlugin. This means the
 * deployed web app uses in-memory storage that vanishes on refresh. For a
 * real production web deployment, we need persistent browser storage:
 *   - Keychain (PII) -> IndexedDB + Web Crypto API (AES-GCM, PBKDF2 key derivation)
 *   - WatermelonDB (trips) -> IndexedDB
 *   - MMKV (prefs) -> localStorage (already working in e2e/mocks/mmkv.js)
 *
 * Webpack resolves .web.ts before .ts, so `index.web.ts` auto-resolves on
 * web builds without any plugin changes.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('web storage barrel exists at src/services/storage/index.web.ts', () => {
  expect(existsSync(resolve(ROOT, 'src/services/storage/index.web.ts'))).toBe(true);
});

test.skip('web storage barrel exports same named symbols as native barrel', () => {
  const webBarrel = readFileSync(resolve(ROOT, 'src/services/storage/index.web.ts'), 'utf-8');

  // Must export the core service singletons (same as index.ts)
  const requiredExports = ['keychainService', 'mmkvService', 'databaseService'];
  for (const name of requiredExports) {
    expect(webBarrel).toMatch(new RegExp(`export.*${name}`));
  }
});

test.skip('webpack Vercel build does not replace storage barrel', () => {
  const webpackConfig = readFileSync(resolve(ROOT, 'webpack.config.js'), 'utf-8');

  // NormalModuleReplacementPlugin for storage should be conditional (E2E only, not Vercel)
  // The replacement regex targets src/services/storage/index.ts
  // For Vercel builds, this replacement must be skipped so .web.ts resolves naturally
  //
  // Check: either the plugin is wrapped in a condition, or it's removed entirely
  // and the .web.ts extension resolution handles it
  expect(webpackConfig).toMatch(/isVercel|vercel/);
});
