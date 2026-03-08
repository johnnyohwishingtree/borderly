import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  variant?: 'horizontal' | 'vertical' | 'dots';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  labels?: string[];
  className?: string;
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  variant = 'horizontal',
  size = 'medium',
  showLabels = false,
  labels,
  className = '',
}: ProgressIndicatorProps) {
  const sizeStyles = {
    small: {
      circle: 'w-6 h-6',
      dot: 'w-2 h-2',
      text: 'text-xs',
      spacing: 'space-x-2',
      verticalSpacing: 'space-y-2',
    },
    medium: {
      circle: 'w-8 h-8',
      dot: 'w-3 h-3',
      text: 'text-sm',
      spacing: 'space-x-3',
      verticalSpacing: 'space-y-3',
    },
    large: {
      circle: 'w-10 h-10',
      dot: 'w-4 h-4',
      text: 'text-base',
      spacing: 'space-x-4',
      verticalSpacing: 'space-y-4',
    },
  };

  const sizeStyle = sizeStyles[size];

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-500',
          border: 'border-green-500',
          text: 'text-white',
          icon: 'check',
        } as const;
      case 'current':
        return {
          bg: 'bg-blue-500',
          border: 'border-blue-500',
          text: 'text-white',
          icon: null,
        } as const;
      case 'upcoming':
      default:
        return {
          bg: 'bg-gray-200',
          border: 'border-gray-300',
          text: 'text-gray-600',
          icon: null,
        } as const;
    }
  };


  if (variant === 'dots') {
    return (
      <View className={`flex-row items-center justify-center ${sizeStyle.spacing} ${className}`}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const status = getStepStatus(index);
          const styles = getStepStyles(status);
          
          return (
            <View
              key={index}
              className={`${sizeStyle.dot} rounded-full ${styles.bg}`}
              accessibilityRole="progressbar"
              accessibilityLabel={`Step ${index + 1} of ${totalSteps}`}
              accessibilityValue={{
                now: currentStep + 1,
                min: 1,
                max: totalSteps,
              }}
            />
          );
        })}
      </View>
    );
  }

  if (variant === 'vertical') {
    return (
      <View className={`${sizeStyle.verticalSpacing} ${className}`}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const status = getStepStatus(index);
          const styles = getStepStyles(status);
          const label = labels?.[index] || `Step ${index + 1}`;
          
          return (
            <View key={index} className="flex-row items-center">
              <View
                className={`${sizeStyle.circle} rounded-full border-2 ${styles.bg} ${styles.border} flex items-center justify-center`}
                accessibilityRole="progressbar"
                accessibilityLabel={`Step ${index + 1} of ${totalSteps}: ${label}`}
                accessibilityValue={{
                  now: currentStep + 1,
                  min: 1,
                  max: totalSteps,
                }}
              >
                {styles.icon ? (
                  <MaterialIcons name={styles.icon} size={size === 'small' ? 12 : size === 'medium' ? 16 : 20} color="white" />
                ) : (
                  <Text className={`font-semibold ${styles.text} ${sizeStyle.text}`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              {showLabels && (
                <Text className={`ml-3 font-medium ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'} ${sizeStyle.text}`}>
                  {label}
                </Text>
              )}
              
              {index < totalSteps - 1 && (
                <View 
                  className={`absolute w-0.5 bg-gray-300`}
                  style={{
                    top: size === 'large' ? 40 : size === 'medium' ? 32 : 24,
                    left: size === 'large' ? 20 : size === 'medium' ? 16 : 12,
                    height: size === 'large' ? 24 : size === 'medium' ? 20 : 16,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  }

  // Horizontal variant (default)
  return (
    <View className={`flex-row items-center ${className}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const status = getStepStatus(index);
        const styles = getStepStyles(status);
        const label = labels?.[index] || `Step ${index + 1}`;
        
        return (
          <View key={index} className="flex-1 flex-row items-center">
            <View className="flex-col items-center flex-1">
              <View
                className={`${sizeStyle.circle} rounded-full border-2 ${styles.bg} ${styles.border} flex items-center justify-center`}
                accessibilityRole="progressbar"
                accessibilityLabel={`Step ${index + 1} of ${totalSteps}: ${label}`}
                accessibilityValue={{
                  now: currentStep + 1,
                  min: 1,
                  max: totalSteps,
                }}
              >
                {styles.icon ? (
                  <MaterialIcons name={styles.icon} size={size === 'small' ? 12 : size === 'medium' ? 16 : 20} color="white" />
                ) : (
                  <Text className={`font-semibold ${styles.text} ${sizeStyle.text}`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              {showLabels && (
                <Text className={`mt-2 text-center ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'} ${sizeStyle.text} font-medium`}>
                  {label}
                </Text>
              )}
            </View>
            
            {index < totalSteps - 1 && (
              <View className={`flex-1 h-0.5 mx-2 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
            )}
          </View>
        );
      })}
    </View>
  );
}