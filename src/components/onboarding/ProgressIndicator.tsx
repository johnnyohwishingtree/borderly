import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Step {
  key: string;
  title: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  showLabels?: boolean;
  variant?: 'horizontal' | 'vertical' | 'dots';
}

export default function ProgressIndicator({ 
  steps, 
  currentStep, 
  className = '',
  showLabels = true,
  variant = 'horizontal'
}: ProgressIndicatorProps) {

  if (variant === 'dots') {
    return (
      <View className={`flex-row justify-center items-center space-x-2 ${className}`}>
        {steps.map((step, index) => (
          <View
            key={step.key}
            className={`w-2 h-2 rounded-full ${
              index < currentStep 
                ? 'bg-blue-600' 
                : index === currentStep 
                  ? 'bg-blue-400' 
                  : 'bg-gray-300'
            }`}
          />
        ))}
      </View>
    );
  }

  if (variant === 'vertical') {
    return (
      <View className={`space-y-4 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <View key={step.key} className="flex-row items-start space-x-3">
              <View className="items-center">
                <View 
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-500' 
                      : isCurrent 
                        ? 'bg-blue-500' 
                        : 'bg-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <MaterialIcons name="check" size={16} color="white" />
                  ) : (
                    <Text className={`text-sm font-medium ${
                      isCurrent ? 'text-white' : 'text-gray-600'
                    }`}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                {index < steps.length - 1 && (
                  <View className="w-0.5 h-8 bg-gray-300 mt-2" />
                )}
              </View>
              {showLabels && (
                <View className="flex-1 pt-1">
                  <Text className={`text-sm font-medium ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </Text>
                  {step.description && (
                    <Text className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  // Default horizontal variant
  const progressPercentage = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <View className={className}>
      {showLabels && (
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm font-medium text-gray-900">
            Step {currentStep + 1} of {steps.length}
          </Text>
          <Text className="text-sm text-gray-500">
            {steps[currentStep]?.title}
          </Text>
        </View>
      )}
      
      <View className="flex-row items-center space-x-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <View key={step.key} className="flex-row items-center flex-1">
              <View 
                className={`w-6 h-6 rounded-full items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500' 
                    : isCurrent 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300'
                }`}
              >
                {isCompleted ? (
                  <MaterialIcons name="check" size={12} color="white" />
                ) : (
                  <Text className={`text-xs font-medium ${
                    isCurrent ? 'text-white' : 'text-gray-600'
                  }`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              
              {index < steps.length - 1 && (
                <View className="flex-1 h-1 mx-2 bg-gray-200 rounded">
                  <View 
                    className="h-full bg-blue-500 rounded"
                    style={{ 
                      width: isCompleted ? '100%' : isCurrent ? '50%' : '0%' 
                    }}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}