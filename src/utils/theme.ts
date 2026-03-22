/**
 * Theme utilities for Borderly dark-mode support.
 *
 * - `ThemePreference` / `ResolvedTheme` — shared type aliases
 * - `colorTokens` — semantic colour map keyed by resolved scheme
 * - `useTheme()` — hook that reads the store preference and resolves it
 *   against the OS appearance, re-rendering whenever the OS changes
 * - `applyTheme()` — helper for the NativeWind "class" strategy
 */

import { useColorScheme } from 'react-native';
import { useAppStore, ThemePreference } from '@/stores/useAppStore';

export type { ThemePreference };
export type ResolvedTheme = 'light' | 'dark';

// ---------------------------------------------------------------------------
// Semantic color tokens
// ---------------------------------------------------------------------------

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentForeground: string;
  error: string;
  errorBackground: string;
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
}

const lightTokens: ColorTokens = {
  background: '#ffffff',
  surface: '#f9fafb',
  surfaceElevated: '#ffffff',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textDisabled: '#9ca3af',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  accent: '#2563eb',
  accentForeground: '#ffffff',
  error: '#dc2626',
  errorBackground: '#fef2f2',
  success: '#16a34a',
  successBackground: '#f0fdf4',
  warning: '#d97706',
  warningBackground: '#fffbeb',
};

const darkTokens: ColorTokens = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textDisabled: '#475569',
  border: '#334155',
  borderStrong: '#475569',
  accent: '#3b82f6',
  accentForeground: '#ffffff',
  error: '#f87171',
  errorBackground: '#450a0a',
  success: '#4ade80',
  successBackground: '#052e16',
  warning: '#fbbf24',
  warningBackground: '#451a03',
};

export const colorTokens: Record<ResolvedTheme, ColorTokens> = {
  light: lightTokens,
  dark: darkTokens,
};

// ---------------------------------------------------------------------------
// useTheme hook
// ---------------------------------------------------------------------------

export interface UseThemeResult {
  /** The user's raw preference (may be 'system'). */
  preference: ThemePreference;
  /** The resolved colour scheme after applying system appearance. */
  resolvedTheme: ResolvedTheme;
  /** Convenience shorthand — true when resolved theme is 'dark'. */
  isDark: boolean;
  /** Semantic colour tokens for the resolved theme. */
  colors: ColorTokens;
}

/**
 * Returns the resolved theme and colour tokens.
 *
 * Re-renders automatically when:
 *  - The user changes their preference via `useAppStore.setTheme()`
 *  - The OS appearance changes (light ↔ dark) while preference is 'system'
 */
export function useTheme(): UseThemeResult {
  const preference = useAppStore(s => s.theme);
  // useColorScheme() subscribes to OS appearance changes.
  // Narrow the result: treat null / 'unspecified' / any unknown value as 'light'.
  const rawScheme = useColorScheme();
  const systemScheme: ResolvedTheme = rawScheme === 'dark' ? 'dark' : 'light';

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? systemScheme : preference;

  return {
    preference,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    colors: colorTokens[resolvedTheme],
  };
}

// ---------------------------------------------------------------------------
// applyTheme — NativeWind "class" strategy helper
// ---------------------------------------------------------------------------

/**
 * Returns the root-level className string for the NativeWind class strategy.
 *
 * Usage:
 * ```tsx
 * const { resolvedTheme } = useTheme();
 * <View className={applyTheme(resolvedTheme)}>...</View>
 * ```
 */
export function applyTheme(resolvedTheme: ResolvedTheme): string {
  return resolvedTheme === 'dark' ? 'dark' : '';
}
