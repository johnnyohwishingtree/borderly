import { View, Text, ScrollView, Pressable } from 'react-native';
import { CheckCircleIcon, InformationCircleIcon, LightBulbIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from 'react-native-heroicons/solid';
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
      return <CheckCircleIconSolid size={24} color="#10B981" />;
    }
    if (isCurrent) {
      return <CheckCircleIcon size={24} color="#3B82F6" />;
    }
    return <CheckCircleIcon size={24} color="#9CA3AF" />;
  };

  const getCardStyles = () => {
    const baseStyles = 'mb-4 rounded-xl border-2 overflow-hidden';
    
    if (isCompleted) {
      return `${baseStyles} bg-green-50 border-green-200 shadow-sm`;
    } else if (isCurrent) {
      return `${baseStyles} bg-blue-50 border-blue-300 shadow-md`;
    } else {
      return `${baseStyles} bg-gray-50 border-gray-200`;
    }
  };

  return (
    <View className={getCardStyles()}>
      {/* Step Header */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="mr-3">
              {getStatusIcon()}
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className={{
                  green: 'text-xs font-semibold uppercase tracking-wide mr-2 text-green-600',
                  blue: 'text-xs font-semibold uppercase tracking-wide mr-2 text-blue-600',
                  gray: 'text-xs font-semibold uppercase tracking-wide mr-2 text-gray-600',
                }[statusColor]}>
                  Step {step.order}
                </Text>
                {isCompleted && (
                  <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-green-700">
                      Completed
                    </Text>
                  </View>
                )}
                {isCurrent && !isCompleted && (
                  <View className="bg-blue-100 px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-blue-700">
                      Current
                    </Text>
                  </View>
                )}
              </View>
              <Text className={`text-lg font-bold text-${statusColor === 'gray' ? 'gray-500' : statusColor}-900`}>
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
            <InformationCircleIcon size={20} color="#6B7280" style={{ marginTop: 2, marginRight: 8 }} />
            <Text className="flex-1 text-base text-gray-700 leading-6">
              {step.description}
            </Text>
          </View>

          {/* Fields to Fill */}
          {step.fieldsOnThisScreen && step.fieldsOnThisScreen.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
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
                <LightBulbIcon size={18} color="#F59E0B" />
                <Text className="text-sm font-semibold text-gray-900 ml-2">
                  Tips & Reminders:
                </Text>
              </View>
              <View className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                {step.tips.map((tip, index) => (
                  <View key={index} className="flex-row items-start mb-2 last:mb-0">
                    <Text className="text-yellow-600 mr-2 mt-1">•</Text>
                    <Text className="flex-1 text-sm text-yellow-800 leading-5">
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Mark Complete Button */}
          {isCurrent && !isCompleted && onMarkComplete && (
            <View className="mt-4 pt-4 border-t border-gray-200">
              <View className="flex-row">
                <View className="flex-1" />
                <Pressable
                  onPress={onMarkComplete}
                  className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <CheckCircleIcon size={18} color="white" />
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
          <Text className="text-sm text-gray-500 italic">
            Complete previous steps to unlock this step
          </Text>
        </View>
      )}
    </View>
  );
}