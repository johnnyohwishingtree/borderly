import { useState } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import { 
  ACCESSIBILITY_CONSTANTS,
  AccessibilityStateHelpers,
  SemanticUtils 
} from '../../utils/accessibility';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | undefined;
  helperText?: string;
  required?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  highContrastMode?: boolean;
  testID?: string;
  labelTestID?: string;
  errorTestID?: string;
}

export default function Input({
  label,
  error,
  helperText,
  required = false,
  className,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  highContrastMode = false,
  testID,
  labelTestID,
  errorTestID,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Generate unique IDs for accessibility relationships
  const inputId = testID || `input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const helperTextId = `${inputId}-helper`;

  const getInputStyles = () => {
    const baseStyles = `border-2 rounded-xl px-4 py-3.5 text-base bg-white transition-all duration-200 min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]`;
    
    let errorStyles, focusStyles;
    
    if (highContrastMode) {
      errorStyles = error ? 'border-black bg-white' : 'border-gray-800';
      focusStyles = isFocused 
        ? 'border-black shadow-lg bg-gray-50 scale-[1.01]' 
        : 'shadow-sm';
    } else {
      errorStyles = error ? 'border-red-500 bg-red-50/30' : 'border-gray-200';
      focusStyles = isFocused 
        ? 'border-blue-500 shadow-lg shadow-blue-500/25 bg-blue-50/10 scale-[1.01]' 
        : 'shadow-sm';
    }

    return `${baseStyles} ${errorStyles} ${focusStyles} ${className || ''}`.trim();
  };

  const getLabelStyles = () => {
    const baseStyles = 'text-sm font-semibold mb-2';
    const colorStyles = highContrastMode ? 'text-black' : 'text-gray-700';
    return `${baseStyles} ${colorStyles}`;
  };

  const getErrorStyles = () => {
    const baseStyles = 'text-sm mt-2 font-medium';
    const colorStyles = highContrastMode ? 'text-black' : 'text-red-600';
    return `${baseStyles} ${colorStyles}`;
  };

  const getHelperTextStyles = () => {
    const baseStyles = 'text-sm mt-2';
    const colorStyles = highContrastMode ? 'text-gray-800' : 'text-gray-500';
    return `${baseStyles} ${colorStyles}`;
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

  // Generate semantic accessibility label
  const semanticLabel = accessibilityLabel || SemanticUtils.generateFieldLabel(
    label || '',
    required,
    !!error,
    error
  );

  // Create accessibility state
  const accessibilityState = AccessibilityStateHelpers.createFormFieldState(
    required,
    !!error,
    !!textInputProps.editable === false
  );


  return (
    <View className="mb-5">
      {label && (
        <Text 
          className={getLabelStyles()}
          nativeID={labelId}
          accessible={true}
          accessibilityRole="text"
          testID={labelTestID}
        >
          {label}
          {required && (
            <Text 
              className={highContrastMode ? 'text-black' : 'text-red-500'}
              accessibilityLabel="required"
            >
              {' *'}
            </Text>
          )}
        </Text>
      )}

      <TextInput
        className={getInputStyles()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={highContrastMode ? '#666666' : '#9CA3AF'}
        
        // Core accessibility props
        accessible={true}
        accessibilityLabel={semanticLabel}
        accessibilityHint={accessibilityHint || helperText}
        accessibilityState={accessibilityState}
        accessibilityLabelledBy={label ? labelId : undefined}
        
        // Testing
        testID={testID}
        
        {...textInputProps}
      />

      {error && (
        <Text 
          className={getErrorStyles()}
          nativeID={errorId}
          accessible={true}
          accessibilityRole="text"
          accessibilityLiveRegion="assertive"
          testID={errorTestID}
        >
          {error}
        </Text>
      )}

      {helperText && !error && (
        <Text 
          className={getHelperTextStyles()}
          nativeID={helperTextId}
          accessible={true}
          accessibilityRole="text"
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}
