import { View, Text, ViewProps } from 'react-native';

export interface ProgressBarProps extends ViewProps {
  progress: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  showPercentage?: boolean;
  label?: string;
  animated?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function ProgressBar({
  progress,
  size = 'medium',
  color = 'blue',
  showPercentage = false,
  label,
  animated = true,
  className,
  accessibilityLabel,
  accessibilityHint,
  ...viewProps
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const getContainerStyles = () => {
    const baseStyles = 'bg-gray-200 rounded-full overflow-hidden';

    const sizeStyles = {
      small: 'h-2',
      medium: 'h-3',
      large: 'h-4',
    };

    return `${baseStyles} ${sizeStyles[size]} ${className || ''}`.trim();
  };

  const getProgressStyles = () => {
    const baseStyles = 'h-full rounded-full';
    const transitionStyles = animated ? 'transition-all duration-300 ease-out' : '';

    const colorStyles = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      red: 'bg-red-600',
      yellow: 'bg-yellow-600',
      purple: 'bg-purple-600',
      gray: 'bg-gray-600',
    };

    return `${baseStyles} ${colorStyles[color]} ${transitionStyles}`.trim();
  };

  const getLabelStyles = () => {
    return 'text-sm font-medium text-gray-700 mb-2';
  };

  const getPercentageStyles = () => {
    const sizeStyles = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    return `font-semibold text-gray-600 mt-1 ${sizeStyles[size]}`;
  };

  const progressText = accessibilityLabel || `${label ? `${label}: ` : ''}${Math.round(clampedProgress)} percent complete`;

  return (
    <View 
      {...viewProps}
      accessibilityRole="progressbar"
      accessibilityLabel={progressText}
      accessibilityHint={accessibilityHint}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: clampedProgress,
        text: progressText,
      }}
    >
      {label && (
        <Text className={getLabelStyles()}>{label}</Text>
      )}
      
      <View className={getContainerStyles()}>
        <View 
          className={getProgressStyles()}
          style={{ width: `${clampedProgress}%` }}
        />
      </View>

      {showPercentage && (
        <Text className={getPercentageStyles()}>
          {Math.round(clampedProgress)}%
        </Text>
      )}
    </View>
  );
}