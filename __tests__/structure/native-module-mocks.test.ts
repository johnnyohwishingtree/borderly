/**
 * Structural test: native modules have required mocks.
 *
 * Every native module aliased in webpack.config.js must have:
 * 1. A web mock in e2e/mocks/
 * 2. A Jest mock in jest.setup.js (via NativeModules or jest.mock)
 *
 * See: .knowledge/conventions/native-modules.md
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
