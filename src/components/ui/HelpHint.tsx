import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface HelpHintProps {
  title?: string;
  content: string;
  variant?: 'info' | 'tip' | 'warning' | 'success';
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function HelpHint({
  title,
  content,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className = '',
  size = 'medium',
}: HelpHintProps) {
  const variantStyles = {
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'info',
      iconColor: '#2563eb',
      titleColor: 'text-blue-900',
      contentColor: 'text-blue-800',
    },
    tip: {
      container: 'bg-purple-50 border-purple-200',
      icon: 'lightbulb-outline',
      iconColor: '#9333ea',
      titleColor: 'text-purple-900',
      contentColor: 'text-purple-800',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'warning',
      iconColor: '#d97706',
      titleColor: 'text-yellow-900',
      contentColor: 'text-yellow-800',
    },
    success: {
      container: 'bg-green-50 border-green-200',
      icon: 'check-circle',
      iconColor: '#16a34a',
      titleColor: 'text-green-900',
      contentColor: 'text-green-800',
    },
  };

  const sizeStyles = {
    small: {
      container: 'p-3',
      iconSize: 18,
      titleSize: 'text-sm',
      contentSize: 'text-xs',
    },
    medium: {
      container: 'p-4',
      iconSize: 20,
      titleSize: 'text-base',
      contentSize: 'text-sm',
    },
    large: {
      container: 'p-5',
      iconSize: 24,
      titleSize: 'text-lg',
      contentSize: 'text-base',
    },
  };

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View 
      className={`border rounded-lg ${variantStyle.container} ${sizeStyle.container} ${className}`}
      accessibilityRole="alert"
      accessibilityLabel={title ? `${title}: ${content}` : content}
    >
      <View className="flex-row items-start">
        <MaterialIcons
          name={variantStyle.icon as any}
          size={sizeStyle.iconSize}
          color={variantStyle.iconColor}
          style={{ marginRight: 12, marginTop: 2 }}
        />
        
        <View className="flex-1">
          {title && (
            <Text className={`font-semibold ${variantStyle.titleColor} ${sizeStyle.titleSize} mb-1`}>
              {title}
            </Text>
          )}
          <Text className={`${variantStyle.contentColor} ${sizeStyle.contentSize} leading-relaxed`}>
            {content}
          </Text>
        </View>

        {dismissible && onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            className="ml-2 -mr-1 -mt-1 p-1"
            accessibilityRole="button"
            accessibilityLabel="Dismiss hint"
            accessibilityHint="Close this help hint"
          >
            <MaterialIcons
              name="close"
              size={18}
              color={variantStyle.iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}