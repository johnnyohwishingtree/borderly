import React from 'react';
import { View, Text } from 'react-native';
// @ts-expect-error no type declarations
import { CheckIcon } from 'react-native-heroicons/solid';
// @ts-expect-error no type declarations
import { ClockIcon } from 'react-native-heroicons/outline';

export interface GuideProgressProps {
  totalSteps: number;
  currentStep: number;
  completedSteps: number[];
  stepTitles?: string[];
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function GuideProgress({
  totalSteps,
  currentStep,
  completedSteps = [],
  stepTitles = [],
  variant = 'horizontal',
  showLabels = true,
  size = 'medium',
}: GuideProgressProps) {
  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(stepIndex + 1)) return 'completed';
    if (stepIndex + 1 === currentStep) return 'current';
    return 'upcoming';
  };

  const getSizeStyles = () => {
    const sizeMap = {
      small: {
        circle: 'w-6 h-6',
        text: 'text-xs',
        line: 'h-0.5',
      },
      medium: {
        circle: 'w-8 h-8',
        text: 'text-sm',
        line: 'h-0.5',
      },
      large: {
        circle: 'w-10 h-10',
        text: 'text-base',
        line: 'h-1',
      },
    };
    return sizeMap[size];
  };

  const getStepCircleStyles = (status: 'completed' | 'current' | 'upcoming') => {
    const baseStyles = 'rounded-full flex items-center justify-center border-2';
    const statusStyles = {
      completed: 'bg-green-500 border-green-500',
      current: 'bg-blue-500 border-blue-500',
      upcoming: 'bg-gray-100 border-gray-300',
    };
    return `${baseStyles} ${getSizeStyles().circle} ${statusStyles[status]}`;
  };

  const getStepTextColor = (status: 'completed' | 'current' | 'upcoming') => {
    return {
      completed: 'text-white',
      current: 'text-white',
      upcoming: 'text-gray-400',
    }[status];
  };

  const getConnectorStyles = (fromStatus: 'completed' | 'current' | 'upcoming', toStatus: 'completed' | 'current' | 'upcoming') => {
    const baseStyles = `${getSizeStyles().line} flex-1`;
    
    // Line is colored if both steps are completed, or if we're going from current to upcoming
    if (fromStatus === 'completed' && (toStatus === 'completed' || toStatus === 'current')) {
      return `${baseStyles} bg-green-500`;
    } else if (fromStatus === 'current' && toStatus === 'upcoming') {
      return `${baseStyles} bg-gray-300`;
    } else {
      return `${baseStyles} bg-gray-300`;
    }
  };

  const renderProgressIndicator = () => {
    const steps = Array.from({ length: totalSteps }, (_, index) => {
      const status = getStepStatus(index);
      const stepNumber = index + 1;
      
      return (
        <React.Fragment key={index}>
          {/* Step Circle */}
          <View className="items-center">
            <View className={getStepCircleStyles(status)}>
              {status === 'completed' ? (
                <CheckIcon size={size === 'small' ? 12 : size === 'medium' ? 16 : 20} color="white" />
              ) : status === 'current' ? (
                <ClockIcon size={size === 'small' ? 12 : size === 'medium' ? 16 : 20} color="white" />
              ) : (
                <Text className={`font-semibold ${getSizeStyles().text} ${getStepTextColor(status)}`}>
                  {stepNumber}
                </Text>
              )}
            </View>
            
            {/* Step Label */}
            {showLabels && stepTitles[index] && (
              <Text 
                className={`mt-2 ${getSizeStyles().text} text-center font-medium ${
                  status === 'current' ? 'text-blue-600' : 
                  status === 'completed' ? 'text-green-600' : 'text-gray-500'
                }`}
                numberOfLines={2}
              >
                {stepTitles[index]}
              </Text>
            )}
          </View>

          {/* Connector Line */}
          {index < totalSteps - 1 && variant === 'horizontal' && (
            <View className={`mx-2 ${getConnectorStyles(status, getStepStatus(index + 1))}`} />
          )}
          
          {index < totalSteps - 1 && variant === 'vertical' && (
            <View className={`my-3 w-0.5 ${getConnectorStyles(status, getStepStatus(index + 1))} self-center`} style={{ minHeight: 24 }} />
          )}
        </React.Fragment>
      );
    });

    return variant === 'horizontal' ? (
      <View className="flex-row items-start">
        {steps}
      </View>
    ) : (
      <View className="items-center">
        {steps}
      </View>
    );
  };

  const uniqueCompleted = new Set(completedSteps).size;
  const completionPercentage = totalSteps > 0 ? Math.round((uniqueCompleted / totalSteps) * 100) : 0;

  return (
    <View className="w-full">
      {/* Progress Summary */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-gray-900">
          Step {currentStep} of {totalSteps}
        </Text>
        <View className="bg-blue-100 px-3 py-1 rounded-full">
          <Text className="text-sm font-medium text-blue-700">
            {completionPercentage}% Complete
          </Text>
        </View>
      </View>

      {/* Progress Indicator */}
      <View className={variant === 'horizontal' ? 'overflow-x-auto' : ''}>
        {renderProgressIndicator()}
      </View>

      {/* Current Step Title */}
      {showLabels && stepTitles[currentStep - 1] && (
        <View className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Text className="text-sm font-medium text-blue-900 mb-1">
            Current Step:
          </Text>
          <Text className="text-base font-semibold text-blue-700">
            {stepTitles[currentStep - 1]}
          </Text>
        </View>
      )}
    </View>
  );
}