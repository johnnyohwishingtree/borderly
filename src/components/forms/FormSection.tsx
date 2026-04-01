import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FilledFormSection } from '../../services/forms/formEngine';
import FormField from './FormField';
import { FORM_SECTION_IDS } from './testIDs';

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
          <Text className="text-lg font-semibold text-primary">
            {section.title}
          </Text>
          {totalFields > 0 && (
            <Text className="text-sm text-secondary mt-1">
              {filledFields}/{totalFields} fields completed
            </Text>
          )}
        </View>

        {/* Progress indicator */}
        <View className="flex-row items-center">
          {hasErrors && (
            <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
          )}
          <View className="w-8 h-8 bg-surface-tertiary rounded-full items-center justify-center">
            <Text className="text-xs font-semibold text-secondary">
              {Math.round((filledFields / totalFields) * 100) || 0}%
            </Text>
          </View>
          {collapsible && (
            <Text className="text-muted ml-2 text-xl">
              {isExpanded ? '−' : '+'}
            </Text>
          )}
        </View>
      </View>
    );

    if (collapsible) {
      const completionLabel = totalFields > 0
        ? `${filledFields} of ${totalFields} fields completed`
        : '';
      const errorsLabel = hasErrors ? ', has errors' : '';
      const expandedLabel = isExpanded ? ', expanded' : ', collapsed';
      return (
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          className="p-4 bg-surface border-b border-border-default"
          accessible={true}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={`${section.title}${completionLabel ? ', ' + completionLabel : ''}${errorsLabel}${expandedLabel}`}
          accessibilityHint="Double tap to toggle section"
          testID={FORM_SECTION_IDS.sectionHeader(section.id).id}
        >
          {headerContent}
        </Pressable>
      );
    }

    return (
      <View className="p-4 bg-surface border-b border-border-default">
        {headerContent}
      </View>
    );
  };

  const renderFields = () => {
    if (collapsible && !isExpanded) {
      return null;
    }

    return (
      <View className="p-4 bg-surface">
        {section.fields.map((field) => (
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
    <View className="mb-6 bg-surface rounded-lg shadow-sm border border-border-default overflow-hidden">
      {renderHeader()}
      {renderFields()}
    </View>
  );
}
