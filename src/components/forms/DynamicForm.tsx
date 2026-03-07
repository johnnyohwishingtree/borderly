import { useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { FilledForm, updateFormData, validateFormCompletion, getCountrySpecificFields } from '../../services/forms/formEngine';
import FormSection from './FormSection';
import AutoFilledBadge from './AutoFilledBadge';

interface DynamicFormProps {
  form: FilledForm;
  onFormDataChange: (formData: Record<string, unknown>) => void;
  initialFormData?: Record<string, unknown>;
  showOnlyCountrySpecific?: boolean;
  collapsibleSections?: boolean;
  showFormStats?: boolean;
}

export default function DynamicForm({
  form,
  onFormDataChange,
  initialFormData = {},
  showOnlyCountrySpecific = false,
  collapsibleSections = false,
  showFormStats = true,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState(
    validateFormCompletion(form)
  );

  // Update form data and validate when values change
  useEffect(() => {
    onFormDataChange(formData);
    setValidationResult(validateFormCompletion(form));
  }, [formData, form, onFormDataChange]);

  const handleValueChange = (fieldId: string, value: unknown) => {
    const updatedData = updateFormData(formData, fieldId, value);
    setFormData(updatedData);

    // Clear error for this field if it has a value now
    if (errors[fieldId] && value !== undefined && value !== '' && value !== null) {
      const newErrors = { ...errors };
      delete newErrors[fieldId];
      setErrors(newErrors);
    }
  };

  const validateField = (fieldId: string, value: unknown): string | undefined => {
    const field = findFieldById(fieldId);
    if (!field) {return undefined;}

    // Check if required field is empty
    if (field.required && (value === undefined || value === '' || value === null)) {
      return `${field.label} is required`;
    }

    // Validate against field validation rules
    if (field.validation && value !== undefined && value !== '' && value !== null) {
      const validation = field.validation;
      const stringValue = String(value);
      const numericValue = Number(value);

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(stringValue)) {
          return `${field.label} format is invalid`;
        }
      }

      if (validation.minLength && stringValue.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }

      if (validation.maxLength && stringValue.length > validation.maxLength) {
        return `${field.label} cannot exceed ${validation.maxLength} characters`;
      }

      if (validation.min !== undefined && !isNaN(numericValue) && numericValue < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }

      if (validation.max !== undefined && !isNaN(numericValue) && numericValue > validation.max) {
        return `${field.label} cannot exceed ${validation.max}`;
      }
    }

    return undefined;
  };

  const findFieldById = (fieldId: string) => {
    for (const section of form.sections) {
      const field = section.fields.find(f => f.id === fieldId);
      if (field) {return field;}
    }
    return undefined;
  };

  const validateAllFields = () => {
    const newErrors: Record<string, string> = {};

    form.sections.forEach(section => {
      section.fields.forEach(field => {
        const value = formData[field.id] ?? field.currentValue;
        const error = validateField(field.id, value);
        if (error) {
          newErrors[field.id] = error;
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSectionsToRender = () => {
    if (!showOnlyCountrySpecific) {
      return form.sections;
    }

    // Filter to only show sections with country-specific fields
    return form.sections
      .map(section => ({
        ...section,
        fields: section.fields.filter(field =>
          field.countrySpecific || field.needsUserInput
        ),
      }))
      .filter(section => section.fields.length > 0);
  };

  const renderFormStats = () => {
    if (!showFormStats) {return null;}

    const { stats } = form;
    const countrySpecificFields = getCountrySpecificFields(form);

    return (
      <View className="mb-6 p-4 bg-gray-50 rounded-lg">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Form Summary
        </Text>

        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-700">Total Fields:</Text>
          <Text className="font-medium">{stats.totalFields}</Text>
        </View>

        <View className="flex-row justify-between mb-2">
          <View className="flex-row items-center">
            <AutoFilledBadge source="auto" size="small" showLabel={false} />
            <Text className="text-gray-700 ml-2">Auto-filled:</Text>
          </View>
          <Text className="font-medium text-green-700">{stats.autoFilled}</Text>
        </View>

        <View className="flex-row justify-between mb-2">
          <View className="flex-row items-center">
            <AutoFilledBadge source="user" size="small" showLabel={false} />
            <Text className="text-gray-700 ml-2">User filled:</Text>
          </View>
          <Text className="font-medium text-blue-700">{stats.userFilled}</Text>
        </View>

        <View className="flex-row justify-between mb-3">
          <Text className="text-gray-700">Remaining:</Text>
          <Text className="font-medium text-orange-600">{stats.remaining}</Text>
        </View>

        <View className="border-t border-gray-300 pt-3">
          <View className="flex-row justify-between">
            <Text className="font-semibold text-gray-900">Completion:</Text>
            <Text className="font-bold text-lg text-green-600">
              {stats.completionPercentage}%
            </Text>
          </View>
        </View>

        {countrySpecificFields.length > 0 && (
          <View className="mt-3 pt-3 border-t border-gray-300">
            <Text className="text-sm font-medium text-orange-600">
              ⚠️ {countrySpecificFields.length} country-specific fields require your attention
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderValidationSummary = () => {
    if (validationResult.isComplete) {return null;}

    return (
      <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <Text className="text-red-800 font-medium">
          {validationResult.missingFields.length} required fields need attention
        </Text>
      </View>
    );
  };

  const sectionsToRender = getSectionsToRender();

  if (sectionsToRender.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-gray-500 text-center">
          No form fields available for {form.countryName}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4">
        {/* Form Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {form.countryName} Declaration
          </Text>
          <Text className="text-gray-600">
            {form.portalName}
          </Text>
        </View>

        {renderFormStats()}
        {renderValidationSummary()}

        {/* Form Sections */}
        {sectionsToRender.map(section => (
          <FormSection
            key={section.id}
            section={section}
            values={formData}
            onValueChange={handleValueChange}
            errors={errors}
            collapsible={collapsibleSections}
            defaultExpanded={true}
            showAutoFillBadges={!showOnlyCountrySpecific}
          />
        ))}

        {/* Validate Button (for development/testing) */}
        {__DEV__ && (
          <Pressable
            onPress={validateAllFields}
            className="mt-4 p-3 bg-blue-500 rounded-lg"
          >
            <Text className="text-white text-center font-medium">
              Validate All Fields
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
