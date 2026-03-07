import { View, Text } from 'react-native';
import { Input, Select, Toggle } from '../ui';
import { FilledFormField } from '../../services/forms/formEngine';
import AutoFilledBadge from './AutoFilledBadge';

interface FormFieldProps {
  field: FilledFormField;
  value?: unknown;
  onValueChange: (fieldId: string, value: unknown) => void;
  error?: string;
  disabled?: boolean;
  showAutoFillBadge?: boolean;
}

export default function FormField({
  field,
  value,
  onValueChange,
  error,
  disabled = false,
  showAutoFillBadge = true,
}: FormFieldProps) {
  const fieldValue = value ?? field.currentValue;
  const isRequired = field.required;
  const hasError = !!error;

  const handleValueChange = (newValue: unknown) => {
    onValueChange(field.id, newValue);
  };

  const renderInput = () => {
    const inputProps = {
      value: String(fieldValue || ''),
      onValueChange: handleValueChange,
      placeholder: field.label,
      disabled: disabled || (field.source === 'auto' && !field.needsUserInput),
      ...(hasError && error ? { error } : {}),
    };

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <Input
            {...inputProps}
            multiline={field.type === 'textarea'}
            keyboardType="default"
            autoCapitalize="sentences"
          />
        );

      case 'number':
        return (
          <Input
            {...inputProps}
            keyboardType="numeric"
            placeholder={field.label}
          />
        );

      case 'date':
        return (
          <Input
            {...inputProps}
            placeholder="YYYY-MM-DD"
            keyboardType="default"
          />
        );

      case 'select':
        if (!field.options) {
          return (
            <View className="p-3 bg-gray-100 rounded-lg">
              <Text className="text-gray-500">No options available</Text>
            </View>
          );
        }

        return (
          <Select
            value={fieldValue as string}
            onValueChange={handleValueChange}
            options={field.options}
            placeholder={`Select ${field.label}`}
            disabled={inputProps.disabled}
            testID={`select-${field.id}`}
            {...(hasError && error ? { error } : {})}
          />
        );

      case 'boolean':
        return (
          <Toggle
            value={fieldValue as boolean}
            onValueChange={handleValueChange}
            disabled={inputProps.disabled}
          />
        );

      default:
        return (
          <View className="p-3 bg-gray-100 rounded-lg">
            <Text className="text-gray-500">
              Unsupported field type: {field.type}
            </Text>
          </View>
        );
    }
  };

  const shouldShowBadge = showAutoFillBadge &&
                         (field.source === 'auto' || field.source === 'user');

  return (
    <View className="mb-4">
      {/* Field Label and Badge */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <Text className="text-base font-medium text-gray-900">
            {field.label}
            {isRequired && <Text className="text-red-500 ml-1">*</Text>}
          </Text>
        </View>
        {shouldShowBadge && (
          <AutoFilledBadge source={field.source} size="small" />
        )}
      </View>

      {/* Help Text */}
      {field.helpText && (
        <Text className="text-sm text-gray-600 mb-2">
          {field.helpText}
        </Text>
      )}

      {/* Input Component */}
      {renderInput()}

      {/* Error Message */}
      {hasError && (
        <Text className="text-sm text-red-600 mt-1">
          {error}
        </Text>
      )}

      {/* Country-specific indicator */}
      {field.countrySpecific && (
        <View className="mt-2">
          <Text className="text-xs text-orange-600 font-medium">
            ⚠️ Country-specific requirement
          </Text>
        </View>
      )}
    </View>
  );
}
