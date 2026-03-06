import { useRef, useEffect } from 'react';
import { Pressable, Animated } from 'react-native';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  testID?: string;
}

export default function Toggle({
  value,
  onValueChange,
  size = 'medium',
  disabled = false,
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

  const trackStyle = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    borderRadius: sizeConfig.height / 2,
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: disabled ? ['#e5e7eb', '#e5e7eb'] : ['#e5e7eb', '#3b82f6'],
    }),
    opacity: disabled ? 0.5 : 1,
  };

  const thumbStyle = {
    width: sizeConfig.thumbSize,
    height: sizeConfig.thumbSize,
    borderRadius: sizeConfig.thumbSize / 2,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    transform: [
      {
        translateX: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [2, thumbOffset],
        }),
      },
    ],
  };

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      testID={testID}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <Animated.View style={trackStyle}>
        <Animated.View style={thumbStyle} />
      </Animated.View>
    </Pressable>
  );
}