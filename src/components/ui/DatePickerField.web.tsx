import { View, Text } from 'react-native';
import type { DatePickerFieldProps } from './DatePickerField';

// On web (Playwright E2E / React Native Web), render a native HTML date input.
// Webpack resolves .web.tsx before .tsx, so this file is used for the web build only.
// We use a type-cast to avoid needing lib.dom in tsconfig (the project targets React Native).
const NativeInput = 'input' as unknown as React.ComponentType<{
  type: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (e: any) => void;
  min?: string | undefined;
  max?: string | undefined;
  disabled?: boolean | undefined;
  'data-testid'?: string | undefined;
  'aria-label'?: string | undefined;
  style?: Record<string, unknown> | undefined;
  placeholder?: string | undefined;
}>;

export default function DatePickerField({
  value = '',
  onChange,
  label,
  minDate,
  maxDate,
  error,
  disabled = false,
  testID,
  placeholder = 'Select a date',
  required = false,
}: DatePickerFieldProps) {
  return (
    <View className="mb-4" testID={testID ? `${testID}-container` : undefined}>
      {label && (
        <Text className="text-sm font-semibold text-secondary mb-2">
          {label}
          {required && <Text className="text-red-500">{' *'}</Text>}
        </Text>
      )}

      <NativeInput
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value as string)}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        data-testid={testID}
        aria-label={label}
        placeholder={placeholder}
        style={{
          width: '100%',
          border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '16px',
          backgroundColor: disabled ? '#f3f4f6' : error ? '#fef2f2' : '#ffffff',
          color: value ? '#111827' : '#9ca3af',
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: '44px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      />

      {error && (
        <Text className="text-sm text-red-600 mt-1">{error}</Text>
      )}
    </View>
  );
}

export type { DatePickerFieldProps };
