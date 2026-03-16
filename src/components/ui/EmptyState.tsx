import React from 'react';
import { View, Text } from 'react-native';
import Button, { ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  /** Primary description text shown below the title */
  description?: string;
  /** Alias for description — use whichever reads more naturally at the call site */
  subtitle?: string;
  buttonProps?: ButtonProps;
  variant?: 'default' | 'compact' | 'illustration';
}

export default function EmptyState({
  icon,
  title,
  description,
  subtitle,
  buttonProps,
  variant = 'default',
}: EmptyStateProps) {
  // Support both `description` and `subtitle` — subtitle takes precedence when both are provided
  const bodyText = subtitle ?? description;
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
      
      {bodyText && (
        <Text className={getDescriptionStyles()}>
          {bodyText}
        </Text>
      )}
      
      {buttonProps && (
        <Button {...buttonProps} />
      )}
    </View>
  );
}