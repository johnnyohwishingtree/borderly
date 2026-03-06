import React from 'react';
import { View, Text } from 'react-native';
import Button, { ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  buttonProps?: ButtonProps;
  variant?: 'default' | 'compact' | 'illustration';
}

export default function EmptyState({
  icon,
  title,
  description,
  buttonProps,
  variant = 'default',
}: EmptyStateProps) {
  const getContainerStyles = () => {
    const baseStyles = 'items-center justify-center px-6';
    
    const variantStyles = {
      default: 'py-12',
      compact: 'py-8',
      illustration: 'py-16',
    };
    
    return `${baseStyles} ${variantStyles[variant]}`;
  };

  const getIconContainerStyles = () => {
    const baseStyles = 'mb-6 items-center justify-center rounded-full';
    
    const variantStyles = {
      default: 'w-16 h-16 bg-gray-100',
      compact: 'w-12 h-12 bg-gray-50',
      illustration: 'w-20 h-20 bg-blue-50',
    };
    
    return `${baseStyles} ${variantStyles[variant]}`;
  };

  const getTitleStyles = () => {
    const baseStyles = 'font-semibold text-gray-900 text-center mb-3';
    
    const variantStyles = {
      default: 'text-xl',
      compact: 'text-lg',
      illustration: 'text-2xl',
    };
    
    return `${baseStyles} ${variantStyles[variant]}`;
  };

  const getDescriptionStyles = () => {
    const baseStyles = 'text-gray-600 text-center leading-6';
    
    const variantStyles = {
      default: 'text-base mb-8 max-w-sm',
      compact: 'text-sm mb-6 max-w-xs',
      illustration: 'text-lg mb-10 max-w-md',
    };
    
    return `${baseStyles} ${variantStyles[variant]}`;
  };

  return (
    <View className={getContainerStyles()}>
      {icon && (
        <View className={getIconContainerStyles()}>
          {icon}
        </View>
      )}
      
      <Text className={getTitleStyles()}>
        {title}
      </Text>
      
      {description && (
        <Text className={getDescriptionStyles()}>
          {description}
        </Text>
      )}
      
      {buttonProps && (
        <Button {...buttonProps} />
      )}
    </View>
  );
}