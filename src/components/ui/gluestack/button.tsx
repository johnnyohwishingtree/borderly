import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { cssInterop } from 'react-native-css-interop';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
  textClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: any;
}

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isDisabled = false,
  isLoading = false,
  className = '',
  textClassName = '',
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) => {
  const variants = {
    primary: 'bg-primary-600 active:bg-primary-700',
    secondary: 'bg-gray-600 active:bg-gray-700',
    outline: 'bg-transparent border border-gray-300 active:bg-gray-50',
    ghost: 'bg-transparent active:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const textColors = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-gray-700',
    ghost: 'text-primary-600',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled || isLoading}
      className={`flex-row items-center justify-center rounded-lg transition-all ${variants[variant]} ${sizes[size]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      style={style}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#2563eb' : 'white'} className="mr-2" />
      ) : (
        leftIcon && <View className="mr-2">{leftIcon}</View>
      )}
      <Text className={`font-semibold text-center ${textColors[variant]} ${textSizes[size]} ${textClassName}`}>
        {title}
      </Text>
      {!isLoading && rightIcon && <View className="ml-2">{rightIcon}</View>}
    </Pressable>
  );
};

cssInterop(Button, { className: 'style' });

export { Button };
