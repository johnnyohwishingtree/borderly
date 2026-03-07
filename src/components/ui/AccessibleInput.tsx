import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TextInputProps, Pressable } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import {
  AccessibilityStateHelpers,
  TouchTargetUtils,
  SemanticUtils,
  HighContrastUtils,
  ACCESSIBILITY_CONSTANTS,
  ScreenReaderUtils,
} from '../../utils/accessibility';

export interface AccessibleInputProps extends Omit<TextInputProps, 'accessibilityLabel' | 'accessibilityHint'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  
  // Enhanced accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityDescribedBy?: string;
  inputAccessibilityLabel?: string;
  
  // Field type for semantic understanding
  fieldType?: 'text' | 'email' | 'password' | 'phone' | 'numeric' | 'search' | 'url';
  
  // High contrast support
  highContrastMode?: boolean;
  
  // Icon support
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
  
  // Validation state
  isValid?: boolean;
  showValidationIcon?: boolean;
  
  // Custom styling
  className?: string;
  containerStyle?: any;
  inputStyle?: any;
  
  // Enhanced focus management
  onFocusChange?: (focused: boolean) => void;
  announceErrors?: boolean;
  
  // Testing
  testID?: string;
  labelTestID?: string;
  errorTestID?: string;
}

export default function AccessibleInput({
  label,
  error,
  helperText,
  required = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityDescribedBy,
  inputAccessibilityLabel,
  fieldType = 'text',
  highContrastMode = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  isValid,
  showValidationIcon = true,
  className,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  onFocusChange,
  announceErrors = true,
  testID,
  labelTestID,
  errorTestID,
  ...textInputProps
}: AccessibleInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const errorAnnouncedRef = useRef(false);

  // Generate unique IDs for accessibility relationships
  const inputId = testID || `input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const helperTextId = `${inputId}-helper`;

  const getContainerStyles = () => {
    const baseStyles = 'mb-5';
    return `${baseStyles} ${className || ''}`;
  };

  const getInputContainerStyles = () => {
    const baseStyles = 'flex-row items-center border-2 rounded-xl bg-white transition-all duration-200';
    const errorStyles = error 
      ? (highContrastMode ? 'border-black bg-white' : 'border-red-500 bg-red-50/30')
      : (highContrastMode ? 'border-gray-800' : 'border-gray-200');
    
    const focusStyles = isFocused 
      ? (highContrastMode 
          ? 'border-black shadow-lg' 
          : 'border-blue-500 shadow-lg shadow-blue-500/25 bg-blue-50/10 scale-[1.01]')
      : 'shadow-sm';

    return `${baseStyles} ${errorStyles} ${focusStyles}`;
  };

  const getInputStyles = () => {
    const baseStyles = 'flex-1 px-4 py-3.5 text-base';
    const minHeight = `min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]`;
    const textColor = highContrastMode ? 'text-black' : 'text-gray-900';
    
    return `${baseStyles} ${minHeight} ${textColor}`;
  };

  const getLabelStyles = () => {
    const baseStyles = 'text-sm font-semibold mb-2';
    const textColor = highContrastMode ? 'text-black' : 'text-gray-700';
    
    return `${baseStyles} ${textColor}`;
  };

  const getHelperTextStyles = () => {
    const baseStyles = 'text-sm mt-2';
    const textColor = highContrastMode ? 'text-gray-800' : 'text-gray-500';
    
    return `${baseStyles} ${textColor}`;
  };

  const getErrorStyles = () => {
    const baseStyles = 'text-sm mt-2 font-medium';
    const textColor = highContrastMode ? 'text-black' : 'text-red-600';
    
    return `${baseStyles} ${textColor}`;
  };

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    trigger('selection', { enableVibrateFallback: true });
    onFocus?.(e);
    onFocusChange?.(true);
    
    // Reset error announced flag when focusing
    errorAnnouncedRef.current = false;
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    onBlur?.(e);
    onFocusChange?.(false);
    
    // Announce error when blurring if there's an error and it hasn't been announced
    if (error && announceErrors && !errorAnnouncedRef.current) {
      ScreenReaderUtils.announce(`Error: ${error}`, { assertive: true });
      errorAnnouncedRef.current = true;
    }
  };

  const handleRightIconPress = () => {
    if (onRightIconPress) {
      trigger('selection', { enableVibrateFallback: true });
      onRightIconPress();
    }
  };

  // Generate semantic labels
  const semanticInputLabel = inputAccessibilityLabel || accessibilityLabel || 
    SemanticUtils.generateFieldLabel(label || '', required, !!error, error);

  // Create accessibility state
  const accessibilityState = AccessibilityStateHelpers.createFormFieldState(
    required,
    !!error,
    !!textInputProps.editable === false
  );

  // Build accessibility described by relationship
  const describedByIds = [];
  if (error) describedByIds.push(errorId);
  if (helperText) describedByIds.push(helperTextId);
  if (accessibilityDescribedBy) describedByIds.push(accessibilityDescribedBy);

  // Get appropriate keyboard type based on field type
  const getKeyboardType = (): TextInputProps['keyboardType'] => {
    if (textInputProps.keyboardType) return textInputProps.keyboardType;
    
    switch (fieldType) {
      case 'email': return 'email-address';
      case 'phone': return 'phone-pad';
      case 'numeric': return 'numeric';
      case 'url': return 'url';
      default: return 'default';
    }
  };

  // Get appropriate auto complete type
  const getAutoCompleteType = (): TextInputProps['autoComplete'] => {
    if (textInputProps.autoComplete) return textInputProps.autoComplete;
    
    switch (fieldType) {
      case 'email': return 'email';
      case 'password': return 'password';
      case 'phone': return 'tel';
      case 'text': return label?.toLowerCase().includes('name') ? 'name' : 'off';
      default: return 'off';
    }
  };

  const renderValidationIcon = () => {
    if (!showValidationIcon || (!error && isValid === undefined)) return null;
    
    const iconColor = error 
      ? (highContrastMode ? '#000000' : '#EF4444')
      : (highContrastMode ? '#000000' : '#10B981');
      
    // This would typically be an actual icon component
    return (
      <View
        style={{
          width: 20,
          height: 20,
          backgroundColor: iconColor,
          borderRadius: 10,
          marginRight: 8,
        }}
        accessible={false}
      />
    );
  };

  const renderRightIcon = () => {
    if (!rightIcon && !showValidationIcon) return null;
    
    const hasAction = !!onRightIconPress;
    const IconComponent = hasAction ? Pressable : View;
    
    return (
      <IconComponent
        style={TouchTargetUtils.ensureMinimumTouchTarget(24, 24)}
        onPress={hasAction ? handleRightIconPress : undefined}
        accessible={hasAction}
        accessibilityRole={hasAction ? 'button' : undefined}
        accessibilityLabel={rightIconAccessibilityLabel}
        hitSlop={hasAction ? TouchTargetUtils.getHitSlop(24, 24) : undefined}
      >
        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          {renderValidationIcon()}
          {rightIcon}
        </View>
      </IconComponent>
    );
  };

  return (
    <View style={containerStyle} className={getContainerStyles()}>
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

      <View className={getInputContainerStyles()}>
        {leftIcon && (
          <View 
            style={{ paddingLeft: 12, paddingVertical: 8 }}
            accessible={false}
          >
            {leftIcon}
          </View>
        )}

        <TextInput
          ref={inputRef}
          className={getInputStyles()}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={highContrastMode ? '#666666' : '#9CA3AF'}
          
          // Accessibility props
          accessible={true}
          accessibilityLabel={semanticInputLabel}
          accessibilityHint={accessibilityHint || helperText}
          accessibilityState={accessibilityState}
          accessibilityLabelledBy={label ? labelId : undefined}
          accessibilityDescribedBy={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
          
          // Enhanced input props
          keyboardType={getKeyboardType()}
          autoComplete={getAutoCompleteType()}
          secureTextEntry={fieldType === 'password' ? true : textInputProps.secureTextEntry}
          
          // Testing
          testID={testID}
          
          {...textInputProps}
        />

        {renderRightIcon()}
      </View>

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

// Convenience components for common input types
export const EmailInput = (props: Omit<AccessibleInputProps, 'fieldType'>) => (
  <AccessibleInput {...props} fieldType="email" />
);

export const PasswordInput = (props: Omit<AccessibleInputProps, 'fieldType'>) => (
  <AccessibleInput {...props} fieldType="password" />
);

export const PhoneInput = (props: Omit<AccessibleInputProps, 'fieldType'>) => (
  <AccessibleInput {...props} fieldType="phone" />
);

export const NumericInput = (props: Omit<AccessibleInputProps, 'fieldType'>) => (
  <AccessibleInput {...props} fieldType="numeric" />
);

export const SearchInput = (props: Omit<AccessibleInputProps, 'fieldType'>) => (
  <AccessibleInput {...props} fieldType="search" />
);