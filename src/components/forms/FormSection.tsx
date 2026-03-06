import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FilledFormSection } from '../../services/forms/formEngine';
import FormField from './FormField';

interface FormSectionProps {
  section: FilledFormSection;
  values: Record<string, unknown>;
  onValueChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showAutoFillBadges?: boolean;
}

export default function FormSection({
  section,
  values,
  onValueChange,
  errors = {},
  collapsible = false,
  defaultExpanded = true,
  showAutoFillBadges = true,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate section statistics
  const totalFields = section.fields.length;
  const filledFields = section.fields.filter(
    field => !field.needsUserInput || values[field.id] !== undefined
  ).length;
  const hasErrors = section.fields.some(field => errors[field.id]);

  const renderHeader = () => {
    const headerContent = (
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">
            {section.title}
          </Text>
          {totalFields > 0 && (
            <Text className="text-sm text-gray-600 mt-1">
              {filledFields}/{totalFields} fields completed
            </Text>
          )}
        </View>
        
        {/* Progress indicator */}
        <View className="flex-row items-center">
          {hasErrors && (
            <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
          )}
          <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
            <Text className="text-xs font-semibold text-gray-600">
              {Math.round((filledFields / totalFields) * 100) || 0}%
            </Text>
          </View>
          {collapsible && (
            <Text className="text-gray-400 ml-2 text-xl">
              {isExpanded ? '−' : '+'}
            </Text>
          )}
        </View>
      </View>
    );

    if (collapsible) {
      return (
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          className="p-4 bg-white border-b border-gray-200"
        >
          {headerContent}
        </Pressable>
      );
    }

    return (
      <View className="p-4 bg-white border-b border-gray-200">
        {headerContent}
      </View>
    );
  };

  const renderFields = () => {
    if (collapsible && !isExpanded) {
      return null;
    }

    return (
      <View className="p-4 bg-white">
        {section.fields.map((field, index) => (
          <FormField
            key={field.id}
            field={field}
            value={values[field.id]}
            onValueChange={onValueChange}
            error={errors[field.id]}
            showAutoFillBadge={showAutoFillBadges}
          />
        ))}
      </View>
    );
  };

  return (
    <View className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {renderHeader()}
      {renderFields()}
    </View>
  );
}