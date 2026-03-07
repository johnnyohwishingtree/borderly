import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import {
  AccessibilityStateHelpers,
  TouchTargetUtils,
  SemanticUtils,
  HighContrastUtils,
  ACCESSIBILITY_CONSTANTS,
} from '../../utils/accessibility';

export interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  
  // Enhanced accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'menuitem';
  accessibilityActions?: Array<{
    name: string;
    label: string;
  }>;
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
  
  // High contrast support
  highContrastMode?: boolean;
  
  // Custom styling
  className?: string;
  style?: any;
  
  // Haptic feedback
  hapticType?: HapticFeedbackTypes;
  disableHaptics?: boolean;
  
  // Testing
  testID?: string;
}

export default function AccessibleButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityActions,
  onAccessibilityAction,
  highContrastMode = false,
  className,
  style,
  hapticType = HapticFeedbackTypes.impactLight,
  disableHaptics = false,
  testID,
}: AccessibleButtonProps) {
  
  const getButtonStyles = () => {
    const baseStyles = 'rounded-xl flex-row items-center justify-center transition-all duration-150';

    // Size styles with WCAG compliant minimum touch targets
    const sizeStyles = {
      small: 'px-4 py-2.5',
      medium: 'px-6 py-3.5', 
      large: 'px-8 py-4.5',
    };

    // Ensure minimum touch target height
    const minHeights = {
      small: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET,
      medium: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET,
      large: Math.max(52, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET),
    };

    const variantStyles = highContrastMode ? {
      primary: 'bg-black border-2 border-white',
      secondary: 'bg-gray-800 border-2 border-white',
      outline: 'bg-transparent border-2 border-black',
      ghost: 'bg-transparent border-2 border-gray-600',
    } : {
      primary: 'bg-blue-600 shadow-lg shadow-blue-600/25',
      secondary: 'bg-gray-600 shadow-lg shadow-gray-600/20',
      outline: 'bg-transparent border-2 border-gray-300 shadow-sm',
      ghost: 'bg-transparent',
    };

    const disabledStyles = disabled || loading ? 'opacity-50 shadow-none' : '';
    const widthStyles = fullWidth ? 'w-full' : '';

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${widthStyles}`;
  };

  const getTextStyles = () => {
    const baseStyles = 'font-semibold tracking-wide';

    const sizeStyles = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };

    const variantStyles = highContrastMode ? {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-black',
      ghost: 'text-black',
    } : {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-gray-700',
      ghost: 'text-blue-600',
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      // Trigger haptic feedback if not disabled
      if (!disableHaptics) {
        trigger(hapticType, {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      onPress();
    }
  };

  // Generate semantic accessibility label
  const semanticLabel = accessibilityLabel || SemanticUtils.generateContentLabel(title, 'button');
  
  // Create accessibility state
  const accessibilityState = AccessibilityStateHelpers.createButtonState(
    disabled,
    loading,
    false // Not a toggle button
  );

  // Calculate touch target adjustments
  const touchTargetAdjustments = TouchTargetUtils.ensureMinimumTouchTarget(
    // Approximate button width/height based on size
    size === 'small' ? 80 : size === 'medium' ? 120 : 160,
    size === 'small' ? 36 : size === 'medium' ? 44 : 52
  );

  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <View 
        style={{ 
          marginRight: iconPosition === 'left' ? 8 : 0,
          marginLeft: iconPosition === 'right' ? 8 : 0,
        }}
        accessible={false} // Icon should not be focusable separately
      >
        {icon}
      </View>
    );
  };

  const renderContent = () => {
    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        
        {loading && (
          <ActivityIndicator
            size="small"
            color={highContrastMode 
              ? (variant === 'outline' || variant === 'ghost' ? '#000000' : '#FFFFFF')
              : (variant === 'outline' || variant === 'ghost' ? '#374151' : 'white')
            }
            style={{ marginRight: 8 }}
            accessibilityLabel="Loading"
          />
        )}
        
        <Text 
          className={getTextStyles()}
          accessible={false} // Text should not be focusable separately
        >
          {title}
        </Text>
        
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <Pressable
      className={`${getButtonStyles()} ${className || ''}`}
      style={[
        {
          minHeight: touchTargetAdjustments.minHeight,
          minWidth: touchTargetAdjustments.minWidth,
        },
        style,
        ({ pressed }) => ({
          opacity: pressed && !disabled && !loading ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.96 : 1 }],
          elevation: pressed && !disabled && !loading ? 2 : 0,
        })
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      
      // Core accessibility props
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={semanticLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      
      // Additional accessibility features
      importantForAccessibility="yes"
      hitSlop={TouchTargetUtils.getHitSlop(
        size === 'small' ? 80 : size === 'medium' ? 120 : 160,
        size === 'small' ? 36 : size === 'medium' ? 44 : 52
      )}
      
      // Testing
      testID={testID}
    >
      {renderContent()}
    </Pressable>
  );
}

// Convenience components for common button types
export const PrimaryButton = (props: Omit<AccessibleButtonProps, 'variant'>) => (
  <AccessibleButton {...props} variant="primary" />
);

export const SecondaryButton = (props: Omit<AccessibleButtonProps, 'variant'>) => (
  <AccessibleButton {...props} variant="secondary" />
);

export const OutlineButton = (props: Omit<AccessibleButtonProps, 'variant'>) => (
  <AccessibleButton {...props} variant="outline" />
);

export const GhostButton = (props: Omit<AccessibleButtonProps, 'variant'>) => (
  <AccessibleButton {...props} variant="ghost" />
);