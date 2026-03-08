import { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Pressable, Animated } from 'react-native';
import { LOADING_ANIMATIONS, ANIMATION_DURATION } from '../../utils/animations';

export interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  fullScreen?: boolean;
  timeout?: number; // Timeout in milliseconds
  onTimeout?: () => void;
  onCancel?: () => void;
  cancelable?: boolean;
  showProgress?: boolean;
  progress?: number; // 0-1 for progress indicator
}

export default function LoadingIndicator({
  size = 'medium',
  color,
  text,
  variant = 'spinner',
  fullScreen = false,
  timeout,
  onTimeout,
  onCancel,
  cancelable = false,
  showProgress = false,
  progress = 0,
}: LoadingIndicatorProps) {
  const [showTimeout, setShowTimeout] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const dotAnims = [
    useRef(new Animated.Value(0.5)).current,
    useRef(new Animated.Value(0.5)).current,
    useRef(new Animated.Value(0.5)).current,
  ];

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION.normal,
      useNativeDriver: true,
    }).start();

    // Pulse animation for pulse variant
    if (variant === 'pulse') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: LOADING_ANIMATIONS.pulse.duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: LOADING_ANIMATIONS.pulse.duration / 2,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }

    // Dots animation for dots variant
    if (variant === 'dots') {
      const createDotAnimation = (animValue: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0.5,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );

      const animations = dotAnims.map((anim, index) => 
        createDotAnimation(anim, index * 200)
      );
      
      animations.forEach(anim => anim.start());
      return () => animations.forEach(anim => anim.stop());
    }

    if (timeout && timeout > 0) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [timeout, onTimeout, variant, fadeAnim, pulseAnim, dotAnims]);

  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 'small' as const;
      case 'medium':
        return 32;
      case 'large':
        return 48;
      default:
        return 32;
    }
  };

  const getSpinnerColor = () => {
    if (color) return color;
    return '#3B82F6'; // blue-600
  };

  const getContainerStyles = () => {
    const baseStyles = 'items-center justify-center';
    
    if (fullScreen) {
      return `${baseStyles} absolute inset-0 bg-white/90 z-50`;
    }
    
    return `${baseStyles} py-8`;
  };

  const getTextStyles = () => {
    const baseStyles = 'text-gray-600 font-medium mt-3';
    
    const sizeStyles = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };
    
    return `${baseStyles} ${sizeStyles[size]}`;
  };

  const renderProgressIndicator = () => {
    if (!showProgress) return null;

    const progressPercentage = Math.round(progress * 100);
    
    return (
      <View className="w-48 mt-4">
        <View className="w-full bg-gray-200 rounded-full h-2">
          <View 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </View>
        <Text className="text-xs text-gray-500 mt-1 text-center">
          {progressPercentage}%
        </Text>
      </View>
    );
  };

  const renderDotsIndicator = () => {
    return (
      <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
        {dotAnims.map((dotAnim, index) => (
          <Animated.View
            key={index}
            className="w-3 h-3 bg-blue-600 rounded-full"
            style={{
              opacity: dotAnim,
              transform: [{ scale: dotAnim }],
            }}
          />
        ))}
      </View>
    );
  };

  const renderPulseIndicator = () => {
    return (
      <Animated.View 
        className="relative w-12 h-12"
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Animated.View 
          className="absolute w-12 h-12 bg-blue-100 rounded-full"
          style={{ opacity: 0.6 }}
        />
        <Animated.View 
          className="absolute inset-1 w-10 h-10 bg-blue-200 rounded-full"
          style={{ opacity: 0.8 }}
        />
        <View className="absolute inset-3 w-6 h-6 bg-blue-600 rounded-full" />
      </Animated.View>
    );
  };

  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDotsIndicator();
      case 'pulse':
        return renderPulseIndicator();
      case 'spinner':
      default:
        return (
          <ActivityIndicator
            size={getSpinnerSize()}
            color={getSpinnerColor()}
            accessibilityLabel="Loading"
          />
        );
    }
  };

  return (
    <Animated.View 
      className={getContainerStyles()}
      style={{ opacity: fadeAnim }}
    >
      {renderLoadingIndicator()}
      
      {text && (
        <Text className={getTextStyles()}>
          {text}
        </Text>
      )}

      {renderProgressIndicator()}
      
      {showTimeout && (
        <Text className="text-orange-600 text-sm mt-2 text-center max-w-sm">
          This is taking longer than expected...
        </Text>
      )}
      
      {cancelable && onCancel && (
        <Pressable
          onPress={onCancel}
          className="mt-4 py-2 px-4 bg-gray-100 rounded-lg"
          accessibilityLabel="Cancel loading"
          accessibilityHint="Cancel the current operation"
        >
          <Text className="text-gray-700 text-center font-medium">
            Cancel
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}