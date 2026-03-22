/**
 * ThemeSelector — segmented control for the app colour-scheme preference.
 *
 * Renders three inline buttons (System / Light / Dark) that map to the
 * `ThemePreference` union type used by `useAppStore`.  The currently active
 * option is highlighted and announced to screen readers via
 * `accessibilityState.selected`.
 */

import { View, Text, Pressable } from 'react-native';
import type { ThemePreference } from '@/utils/theme';
import { ACCESSIBILITY_CONSTANTS, TouchTargetUtils } from '@/utils/accessibility';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeSelectorProps {
  /** The currently active theme preference. */
  value: ThemePreference;
  /** Called whenever the user selects a different option. */
  onValueChange: (value: ThemePreference) => void;
  /** Base testID — individual option buttons are suffixed with `-option-<value>`. */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Static option list
// ---------------------------------------------------------------------------

interface ThemeOption {
  label: string;
  value: ThemePreference;
  accessibilityLabel: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    label: 'System',
    value: 'system',
    accessibilityLabel: 'Use system default theme',
  },
  {
    label: 'Light',
    value: 'light',
    accessibilityLabel: 'Use light theme',
  },
  {
    label: 'Dark',
    value: 'dark',
    accessibilityLabel: 'Use dark theme',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ThemeSelector({
  value,
  onValueChange,
  testID = 'theme-selector',
}: ThemeSelectorProps) {
  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityRole="radiogroup"
      accessibilityLabel="Theme preference"
    >
      <View className="flex-row rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {THEME_OPTIONS.map((option, index) => {
          const isSelected = option.value === value;
          const isFirst = index === 0;

          return (
            <Pressable
              key={option.value}
              testID={`${testID}-option-${option.value}`}
              onPress={() => onValueChange(option.value)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={option.accessibilityLabel}
              accessibilityState={{ selected: isSelected }}
              hitSlop={TouchTargetUtils.getHitSlop(
                100,
                ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET,
              )}
              style={{ minHeight: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET }}
              className={[
                'flex-1 py-2.5 items-center justify-center',
                isSelected
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : 'bg-white dark:bg-gray-800',
                !isFirst
                  ? 'border-l border-gray-200 dark:border-gray-700'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Text
                accessible={false}
                className={[
                  'text-sm font-medium',
                  isSelected
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300',
                ].join(' ')}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
