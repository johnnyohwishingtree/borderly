import { View, Text, ScrollView, Pressable } from 'react-native';
import { CircleCheck, Info, Lightbulb } from 'lucide-react-native';
import { SubmissionStep } from '@/types/schema';
import CopyableField from './CopyableField';

export interface StepCardProps {
  step: SubmissionStep;
  isCompleted: boolean;
  isCurrent: boolean;
  fieldsData?: { [fieldId: string]: { label: string; value: string; portalFieldName?: string } };
  onMarkComplete?: () => void;
}

export default function StepCard({
  step,
  isCompleted,
  isCurrent,
  fieldsData = {},
  onMarkComplete,
}: StepCardProps) {
  const getStatusColor = () => {
    if (isCompleted) return 'green';
    if (isCurrent) return 'blue';
    return 'gray';
  };

  const statusColor = getStatusColor();

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CircleCheck size={24} color="#10B981" />;
    }
    if (isCurrent) {
      return <CircleCheck size={24} color="#3B82F6" />;
    }
    return <CircleCheck size={24} color="#9CA3AF" />;
  };

  const getCardStyles = () => {
    const baseStyles = 'mb-4 rounded-xl border-2 overflow-hidden';

    if (isCompleted) {
      return `${baseStyles} bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 shadow-sm`;
    } else if (isCurrent) {
      return `${baseStyles} bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 shadow-md`;
    } else {
      return `${baseStyles} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700`;
    }
  };

  const stepLabelColor = {
    green: 'text-xs font-semibold uppercase tracking-wide mr-2 text-green-600 dark:text-green-400',
    blue: 'text-xs font-semibold uppercase tracking-wide mr-2 text-blue-600 dark:text-blue-400',
    gray: 'text-xs font-semibold uppercase tracking-wide mr-2 text-gray-600 dark:text-gray-400',
  }[statusColor];

  const stepTitleColor = statusColor === 'gray'
    ? 'text-lg font-bold text-gray-500 dark:text-gray-400'
    : statusColor === 'green'
      ? 'text-lg font-bold text-green-900 dark:text-green-100'
      : 'text-lg font-bold text-blue-900 dark:text-blue-100';

  return (
    <View className={getCardStyles()}>
      {/* Step Header */}
      <View className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="mr-3">
              {getStatusIcon()}
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className={stepLabelColor}>
                  Step {step.order}
                </Text>
                {isCompleted && (
                  <View className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-green-700 dark:text-green-200">
                      Completed
                    </Text>
                  </View>
                )}
                {isCurrent && !isCompleted && (
                  <View className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-blue-700 dark:text-blue-200">
                      Current
                    </Text>
                  </View>
                )}
              </View>
              <Text className={stepTitleColor}>
                {step.title}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Step Content */}
      {(isCurrent || isCompleted) && (
        <View className="p-4">
          {/* Description */}
          <View className="flex-row items-start mb-4">
            <Info size={20} color="#6B7280" className="mt-0.5 mr-2" />
            <Text className="flex-1 text-base text-gray-700 dark:text-gray-300 leading-6">
              {step.description}
            </Text>
          </View>

          {/* Fields to Fill */}
          {step.fieldsOnThisScreen && step.fieldsOnThisScreen.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Information needed for this step:
              </Text>
              <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
                {step.fieldsOnThisScreen.map((fieldId) => {
                  const fieldData = fieldsData[fieldId];
                  if (!fieldData) return null;

                  return (
                    <CopyableField
                      key={fieldId}
                      label={fieldData.label}
                      value={fieldData.value}
                      {...(fieldData.portalFieldName !== undefined ? { portalFieldName: fieldData.portalFieldName } : {})}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-3">
                <Lightbulb size={18} color="#F59E0B" />
                <Text className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                  Tips &amp; Reminders:
                </Text>
              </View>
              <View className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                {step.tips.map((tip, index) => (
                  <View key={index} className="flex-row items-start mb-2 last:mb-0">
                    <Text className="text-yellow-600 dark:text-yellow-400 mr-2 mt-1">•</Text>
                    <Text className="flex-1 text-sm text-yellow-800 dark:text-yellow-200 leading-5">
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Mark Complete Button */}
          {isCurrent && !isCompleted && onMarkComplete && (
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <View className="flex-row">
                <View className="flex-1" />
                <Pressable
                  onPress={onMarkComplete}
                  className="bg-blue-600 dark:bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    minHeight: 44,
                    minWidth: 44,
                  })}
                >
                  <CircleCheck size={18} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Mark as Complete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Collapsed State for Future Steps */}
      {!isCurrent && !isCompleted && (
        <View className="p-4">
          <Text className="text-sm text-gray-500 dark:text-gray-400 italic">
            Complete previous steps to unlock this step
          </Text>
        </View>
      )}
    </View>
  );
}
