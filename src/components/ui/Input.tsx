import { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | undefined;
  helperText?: string;
  required?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function Input({
  label,
  error,
  helperText,
  required,
  className,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getInputStyles = () => {
    const baseStyles = 'border-2 rounded-xl px-4 py-3.5 text-base bg-white transition-all duration-200 min-h-[44px]';
    const errorStyles = error ? 'border-red-500 bg-red-50/30' : 'border-gray-200';
    const focusStyles = isFocused 
      ? 'border-blue-500 shadow-lg shadow-blue-500/25 bg-blue-50/10 scale-[1.01]' 
      : 'shadow-sm';

    return `${baseStyles} ${errorStyles} ${focusStyles} ${className || ''}`.trim();
  };

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    trigger('selection', { enableVibrateFallback: true });
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View className="mb-5">
      {label && (
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      )}

      <TextInput
        className={getInputStyles()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor="#9CA3AF"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint || helperText}
        {...textInputProps}
      />

      {error && (
        <Text className="text-sm text-red-600 mt-2 font-medium">{error}</Text>
      )}

      {helperText && !error && (
        <Text className="text-sm text-gray-500 mt-2">{helperText}</Text>
      )}
    </View>
  );
}
