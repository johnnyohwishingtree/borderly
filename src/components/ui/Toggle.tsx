import { useRef, useEffect } from 'react';
import { Pressable, Animated } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import { 
  AccessibilityStateHelpers, 
  TouchTargetUtils, 
  ACCESSIBILITY_CONSTANTS,
  ScreenReaderUtils 
} from '../../utils/accessibility';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  
  // Enhanced accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityDescribedBy?: string;
  
  // Labels for state announcements
  onLabel?: string;
  offLabel?: string;
  
  // High contrast support
  highContrastMode?: boolean;
  
  // Testing
  testID?: string;
}

export default function Toggle({
  value,
  onValueChange,
  size = 'medium',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityDescribedBy: _accessibilityDescribedBy,
  onLabel = 'On',
  offLabel = 'Off',
  highContrastMode = false,
  testID,
}: ToggleProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const getSizeStyles = () => {
    // Visual track dimensions — kept small/oval intentionally.
    // The 44px touch target is provided by the Pressable container
    // (minWidth / minHeight below), not by the track itself.
    switch (size) {
      case 'small':
        return { width: 44, height: 24, thumbSize: 20 };
      case 'large':
        return { width: 60, height: 32, thumbSize: 28 };
      default:
        return { width: 52, height: 28, thumbSize: 24 };
    }
  };

  const sizeConfig = getSizeStyles();
  const thumbOffset = sizeConfig.width - sizeConfig.thumbSize - 2;

  const getTrackColors = () => {
    if (disabled) return ['#e5e7eb', '#e5e7eb'];
    
    if (highContrastMode) {
      return ['#ffffff', '#000000']; // High contrast colors
    }
    
    return ['#e5e7eb', '#3b82f6']; // Default colors
  };

  const trackStyle = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    borderRadius: sizeConfig.height / 2,
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: getTrackColors(),
    }),
    borderWidth: highContrastMode ? 2 : 0,
    borderColor: highContrastMode ? '#000000' : 'transparent',
    opacity: disabled ? 0.5 : 1,
  };

  const thumbStyle = {
    width: sizeConfig.thumbSize,
    height: sizeConfig.thumbSize,
    borderRadius: sizeConfig.thumbSize / 2,
    backgroundColor: highContrastMode ? (value ? '#ffffff' : '#000000') : '#ffffff',
    borderWidth: highContrastMode ? 2 : 0,
    borderColor: highContrastMode ? (value ? '#000000' : '#ffffff') : 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: highContrastMode ? 0 : 0.1,
    shadowRadius: 2,
    elevation: highContrastMode ? 0 : 2,
    transform: [
      {
        translateX: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [2, thumbOffset],
        }),
      },
    ],
  };

  const handlePress = () => {
    if (!disabled) {
      const newValue = !value;
      trigger('selection', { enableVibrateFallback: true });
      onValueChange(newValue);
      
      // Announce state change for screen readers
      const stateLabel = newValue ? onLabel : offLabel;
      const announcement = accessibilityLabel 
        ? `${accessibilityLabel}, ${stateLabel}`
        : stateLabel;
      ScreenReaderUtils.announce(announcement);
    }
  };

  // Create accessibility state for toggles
  const accessibilityState = AccessibilityStateHelpers.createToggleState(value, disabled);

  // Generate semantic accessibility label
  const currentStateLabel = value ? onLabel : offLabel;
  const semanticLabel = accessibilityLabel 
    ? `${accessibilityLabel}, ${currentStateLabel}`
    : `Toggle switch, ${currentStateLabel}`;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      
      // Core accessibility props
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={semanticLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      // Note: accessibilityDescribedBy not supported in React Native
      
      // Enhanced accessibility
      importantForAccessibility="yes"
      hitSlop={TouchTargetUtils.getHitSlop(sizeConfig.width, sizeConfig.height)}
      
      // Testing
      testID={testID}
      
      style={{ 
        opacity: disabled ? 0.6 : 1,
        minWidth: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET,
        minHeight: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View style={trackStyle}>
        <Animated.View style={thumbStyle} />
      </Animated.View>
    </Pressable>
  );
}
