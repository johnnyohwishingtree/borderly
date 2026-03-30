/**
 * Constraint: Native Module Mocks
 *
 * Scope: ios/, e2e/mocks/, jest.setup.js, webpack.config.js
 *
 * REQUIRE: web mock in e2e/mocks/ + webpack alias for every native module
 * REQUIRE: Jest mock in jest.setup.js for every native module
 * REQUIRE: cd ios && pod install after adding iOS dependencies
 * REQUIRE: custom Swift modules added to Xcode project.pbxproj
 * REQUIRE: platform service abstraction for cross-platform features
 * DENY:    bumping react independently of react-native
 * DENY:    importing native modules directly in components — wrap in services
 *
 * Country Code Formats:
 * - Borderly uses ISO alpha-3 (JPN, USA) everywhere
 * - Apple MapKit isoCountryCode returns alpha-2 (JP, US)
 * - Always convert at the service boundary using alpha2ToAlpha3()
 *
 * Exceptions:
 * - None — every native module needs all three (web mock, Jest mock, pod install)
 *
 * Anti-patterns:
 * - Native module file on disk but not in Xcode pbxproj -> NativeModules.X is null
 * - Missing web mock -> E2E crashes with no useful error
 * - Comparing alpha-3 (JPN) with alpha-2 (JP) — always fails silently
 *
 * Why: Native modules must be mocked for both Jest tests and Playwright E2E.
 *      Missing mocks cause silent failures that are hard to debug.
 *      See .context/decisions/005-bare-react-native.md
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

describe('Native module mocks', () => {
  it('every webpack alias has a corresponding mock file', () => {
    const webpackConfig = readFileSync(resolve(ROOT, 'webpack.config.js'), 'utf-8');

    // Extract mock file paths from webpack aliases
    const mockPattern = /path\.resolve\(__dirname,\s*'(e2e\/mocks\/[^']+)'\)/g;
    const mockPaths: string[] = [];
    let match;
    while ((match = mockPattern.exec(webpackConfig)) !== null) {
      mockPaths.push(match[1]);
    }

    const missing = mockPaths.filter(p => !existsSync(resolve(ROOT, p)));

    expect(missing).toEqual([]);
  });

  it('NativeModules mock in jest.setup.js includes custom modules', () => {
    const setupContent = readFileSync(resolve(ROOT, 'jest.setup.js'), 'utf-8');

    // Check that ApplePlacesModule is mocked (our custom native module)
    expect(setupContent).toContain('ApplePlacesModule');
  });
});
