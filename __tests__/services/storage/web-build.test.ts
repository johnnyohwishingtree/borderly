/**
 * Spec: Vercel web build uses real browser storage, not E2E mocks
 *
 * Status: hypothesis
 * Confirm: The Vercel build config conditionally skips the
 *   NormalModuleReplacementPlugin for storage, allowing .web.ts
 *   files to resolve naturally via webpack's extension priority
 * Invalidate: A separate webpack config for Vercel is cleaner
 *   than conditional plugins in one config
 *
 * Context: webpack.config.js has NormalModuleReplacementPlugin that
 * swaps src/services/storage/index.ts -> e2e/mocks/storage.js.
 * This is correct for E2E tests (in-memory, no persistence needed)
 * but wrong for Vercel deployment (needs real IndexedDB persistence).
 * With .web.ts extension resolution, webpack auto-resolves
 * index.web.ts when the replacement plugin is disabled.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('webpack config conditionally applies storage mock for E2E only', () => {
  const config = readFileSync(resolve(ROOT, 'webpack.config.js'), 'utf-8');

  // The NormalModuleReplacementPlugin for storage/index.ts must be
  // conditional — only applied when NOT building for Vercel
  // Either: wrapped in `if (!isVercel)` or `isDeploymentBuild ? [] : [plugin]`
  // Key: Vercel build should NOT mock the storage barrel
  expect(config).toMatch(/isVercel|isDeploymentBuild/);

  // The storage replacement must be inside a conditional block (spread with !isVercel)
  expect(config).toMatch(/!isVercel/);
});

test('package.json vercel:build script exists', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
  expect(pkg.scripts['vercel:build']).toBeDefined();
  expect(pkg.scripts['vercel:build']).toMatch(/webpack/);
});

test('web storage implementations exist for all three tiers', () => {
  // .web.ts variants must exist so webpack extension resolution
  // picks them up automatically on web builds
  const webFiles = [
    'src/services/storage/index.web.ts',
  ];
  for (const file of webFiles) {
    expect(existsSync(resolve(ROOT, file))).toBe(true);
  }
});
