import { useRef, useEffect } from 'react';
import { 
  View, 
  ViewProps, 
  Pressable, 
  Animated
} from 'react-native';
import { HapticFeedback } from './HapticFeedback';
import { TouchTargetUtils, ACCESSIBILITY_CONSTANTS } from '../../utils/accessibility';
import { ANIMATION_PRESETS, combineAnimations } from '../../styles/animations';
import { SCALE_ANIMATIONS, ANIMATION_DURATION } from '../../utils/animations';

export interface AnimatedCardProps extends Omit<ViewProps, 'style'> {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  padding?: 'none' | 'small' | 'medium' | 'large';
  radius?: 'small' | 'medium' | 'large';
  animationType?: 'scale' | 'fade' | 'slide' | 'bounce' | 'none';
  entranceDelay?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  swipeEnabled?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none' | 'text';
  accessibilityState?: any;
  highContrastMode?: boolean;
  testID?: string;
  className?: string;
}

export default function AnimatedCard({
  variant = 'default',
  padding = 'medium',
  radius = 'medium',
  animationType = 'scale',
  entranceDelay = 0,
  className,
  children,
  onPress,
  onLongPress,
  onSwipe,
  swipeEnabled = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = onPress ? 'button' : 'none',
  accessibilityState,
  highContrastMode = false,
  testID,
  ...viewProps
}: AnimatedCardProps) {
  const scaleAnim = useRef(new Animated.Value(animationType === 'scale' ? 0.95 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(animationType === 'slide' ? 20 : 0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation
  useEffect(() => {
    const delay = entranceDelay;
    
    if (animationType !== 'none') {
      const animations = [
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION.normal,
          useNativeDriver: true,
        }),
      ];

      if (animationType === 'scale') {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
          })
        );
      }

      if (animationType === 'slide') {
        animations.push(
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: ANIMATION_DURATION.normal,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'bounce') {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 120,
            friction: 4,
          })
        );
      }

      const timer = setTimeout(() => {
        Animated.parallel(animations).start();
      }, delay);

      return () => clearTimeout(timer);
    } else {
      opacityAnim.setValue(1);
    }
    return undefined;
  }, [animationType, entranceDelay, opacityAnim, scaleAnim, translateYAnim]);

  const getCardStyles = () => {
    const baseStyles = highContrastMode 
      ? 'bg-white border-2 border-black' 
      : 'bg-white';
    
    const radiusStyles = {
      small: 'rounded-lg',
      medium: 'rounded-xl',
      large: 'rounded-2xl',
    };

    const variantStyles = highContrastMode ? {
      default: '',
      outlined: 'border-2 border-black',
      elevated: 'border-2 border-black',
      ghost: 'bg-gray-100 border-2 border-gray-800',
    } : {
      default: '',
      outlined: 'border border-gray-200',
      elevated: 'shadow-lg shadow-gray-900/10 border border-gray-100',
      ghost: 'bg-gray-50/50',
    };

    const paddingStyles = {
      none: '',
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6',
    };

    const interactiveStyles = onPress ? `min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]` : '';
    const disabledStyles = disabled ? 'opacity-50' : '';
    const loadingStyles = loading ? 'opacity-75' : '';

    const animationStyles = ANIMATION_PRESETS.card.base;

    return combineAnimations(
      baseStyles,
      radiusStyles[radius],
      variantStyles[variant],
      paddingStyles[padding],
      interactiveStyles,
      disabledStyles,
      loadingStyles,
      animationStyles,
      className || ''
    );
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      // Press animation
      const pressScale = SCALE_ANIMATIONS.tap.pressIn;
      const releaseScale = SCALE_ANIMATIONS.tap.pressOut;

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: pressScale,
          duration: SCALE_ANIMATIONS.tap.duration,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: releaseScale,
          duration: SCALE_ANIMATIONS.tap.duration,
          useNativeDriver: true,
        }),
      ]).start();

      HapticFeedback.card();
      onPress();
    }
  };

  const handleLongPress = () => {
    if (!disabled && !loading && onLongPress) {
      HapticFeedback.longPress();
      onLongPress();
    }
  };

  const animatedStyle = {
    opacity: opacityAnim,
    transform: [
      { scale: scaleAnim },
      { translateY: translateYAnim },
      { translateX: translateXAnim },
      { rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        })
      },
    ],
  };

  const content = (
    <Animated.View style={animatedStyle}>
      <View
        className={getCardStyles()}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessible={accessibilityRole !== 'none'}
        testID={testID}
        {...viewProps}
      >
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled || loading}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
        accessible={true}
        importantForAccessibility="yes"
        hitSlop={TouchTargetUtils.getHitSlop(100, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET)}
        style={({ pressed }) => ({
          opacity: pressed && !disabled && !loading ? 0.95 : 1,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
