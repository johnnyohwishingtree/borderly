import { View, Text, ViewProps } from 'react-native';

export interface StatusBadgeProps extends ViewProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'soft';
  text: string;
}

export default function StatusBadge({
  status,
  size = 'medium',
  variant = 'soft',
  text,
  className,
  accessible = true,
  accessibilityRole = 'text',
  accessibilityLabel,
  ...viewProps
}: StatusBadgeProps) {
  const getBadgeStyles = () => {
    const baseStyles = 'flex-row items-center justify-center rounded-full';

    const sizeStyles = {
      small: 'px-2 py-1',
      medium: 'px-3 py-1.5',
      large: 'px-4 py-2',
    };

    const statusStyles = {
      success: {
        filled: 'bg-green-600 dark:bg-green-500',
        outlined: 'bg-transparent border-2 border-green-600 dark:border-green-500',
        soft: 'bg-green-100 dark:bg-green-900/40',
      },
      error: {
        filled: 'bg-red-600 dark:bg-red-500',
        outlined: 'bg-transparent border-2 border-red-600 dark:border-red-500',
        soft: 'bg-red-100 dark:bg-red-900/40',
      },
      warning: {
        filled: 'bg-yellow-600 dark:bg-yellow-500',
        outlined: 'bg-transparent border-2 border-yellow-600 dark:border-yellow-500',
        soft: 'bg-yellow-100 dark:bg-yellow-900/40',
      },
      info: {
        filled: 'bg-blue-600 dark:bg-blue-500',
        outlined: 'bg-transparent border-2 border-blue-600 dark:border-blue-500',
        soft: 'bg-blue-100 dark:bg-blue-900/40',
      },
      neutral: {
        filled: 'bg-gray-600 dark:bg-gray-500',
        outlined: 'bg-transparent border-2 border-gray-600 dark:border-gray-500',
        soft: 'bg-gray-100 dark:bg-gray-700/60',
      },
    };

    return `${baseStyles} ${sizeStyles[size]} ${statusStyles[status][variant]} ${className || ''}`.trim();
  };

  const getTextStyles = () => {
    const baseStyles = 'font-semibold';

    const sizeStyles = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    const textColors = {
      success: {
        filled: 'text-white',
        outlined: 'text-green-600 dark:text-green-400',
        soft: 'text-green-800 dark:text-green-300',
      },
      error: {
        filled: 'text-white',
        outlined: 'text-red-600 dark:text-red-400',
        soft: 'text-red-800 dark:text-red-300',
      },
      warning: {
        filled: 'text-white',
        outlined: 'text-yellow-600 dark:text-yellow-400',
        soft: 'text-yellow-800 dark:text-yellow-300',
      },
      info: {
        filled: 'text-white',
        outlined: 'text-blue-600 dark:text-blue-400',
        soft: 'text-blue-800 dark:text-blue-300',
      },
      neutral: {
        filled: 'text-white',
        outlined: 'text-gray-600 dark:text-gray-400',
        soft: 'text-gray-800 dark:text-gray-200',
      },
    };

    return `${baseStyles} ${sizeStyles[size]} ${textColors[status][variant]}`;
  };

  return (
    <View
      className={getBadgeStyles()}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? text}
      {...viewProps}
    >
      <Text className={getTextStyles()} accessible={false}>{text}</Text>
    </View>
  );
}