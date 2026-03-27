/**
 * Tests for src/utils/theme.ts
 *
 * Covers:
 * - colorTokens map completeness for both modes
 * - applyTheme() helper
 * - useTheme() hook – all combinations of preference × system scheme
 */

import { renderHook } from '@testing-library/react-native';
import { useTheme, applyTheme, colorTokens } from '../../src/utils/theme';
import { useAppStore } from '../../src/stores/useAppStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// useColorScheme is added to the global react-native mock in jest.setup.js.
// Grab the mock function so individual tests can control its return value.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUseColorScheme = require('react-native').useColorScheme as jest.Mock;

jest.mock('../../src/stores/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

const mockUseAppStore = useAppStore as unknown as jest.Mock;

function mockPreference(pref: string) {
  mockUseAppStore.mockImplementation((selector: (s: { theme: string }) => unknown) =>
    selector({ theme: pref }),
  );
}

// ---------------------------------------------------------------------------
// colorTokens
// ---------------------------------------------------------------------------

describe('colorTokens', () => {
  const requiredTokens = [
    'background',
    'surface',
    'surfaceElevated',
    'textPrimary',
    'textSecondary',
    'textDisabled',
    'border',
    'borderStrong',
    'accent',
    'accentForeground',
    'error',
    'errorBackground',
    'success',
    'successBackground',
    'warning',
    'warningBackground',
  ] as const;

  test.each(['light', 'dark'] as const)('%s mode has all required tokens', mode => {
    requiredTokens.forEach(token => {
      expect(typeof colorTokens[mode][token]).toBe('string');
      expect(colorTokens[mode][token].length).toBeGreaterThan(0);
    });
  });

  it('light and dark tokens differ for background', () => {
    expect(colorTokens.light.background).not.toBe(colorTokens.dark.background);
  });

  it('light and dark tokens differ for textPrimary', () => {
    expect(colorTokens.light.textPrimary).not.toBe(colorTokens.dark.textPrimary);
  });
});

// ---------------------------------------------------------------------------
// applyTheme
// ---------------------------------------------------------------------------

describe('applyTheme', () => {
  it('returns "dark" className for dark theme', () => {
    expect(applyTheme('dark')).toBe('dark');
  });

  it('returns empty string for light theme', () => {
    expect(applyTheme('light')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// useTheme hook
// ---------------------------------------------------------------------------

describe('useTheme', () => {
  beforeEach(() => {
    mockUseColorScheme.mockReturnValue('light');
  });

  describe('when preference is "light"', () => {
    beforeEach(() => {
      mockPreference('light');
    });

    it('resolves to light regardless of system scheme', () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('returns light color tokens', () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.colors).toBe(colorTokens.light);
    });

    it('returns "light" as preference', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.preference).toBe('light');
    });
  });

  describe('when preference is "dark"', () => {
    beforeEach(() => {
      mockPreference('dark');
    });

    it('resolves to dark regardless of system scheme', () => {
      mockUseColorScheme.mockReturnValue('light');
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('returns dark color tokens', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.colors).toBe(colorTokens.dark);
    });
  });

  describe('when preference is "system"', () => {
    beforeEach(() => {
      mockPreference('system');
    });

    it('resolves to light when system scheme is light', () => {
      mockUseColorScheme.mockReturnValue('light');
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('resolves to dark when system scheme is dark', () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('falls back to light when system scheme is null', () => {
      mockUseColorScheme.mockReturnValue(null);
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('falls back to light when system scheme is an unknown value', () => {
      // Some RN versions return 'unspecified' or other strings
      mockUseColorScheme.mockReturnValue('unspecified');
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('light');
    });
  });
});
