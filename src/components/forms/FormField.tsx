import { View, Text } from 'react-native';
import { Input, Select, Toggle, SearchableSelect, DatePickerField, AddressAutocomplete, AccommodationAutocomplete } from '../ui';
import { FilledFormField } from '../../services/forms/formEngine';
import AutoFilledBadge from './AutoFilledBadge';
import { ALL_COUNTRIES } from '../../constants/countries';
import { ALL_AIRPORTS } from '../../constants/airports';
import { ALL_AIRLINES } from '../../constants/airlines';
import { Address } from '../../types/profile';
import { SemanticUtils } from '../../utils/accessibility';

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
    const baseProps = {
      value: String(fieldValue || ''),
      placeholder: field.label,
      disabled: disabled || (field.source === 'auto' && !field.needsUserInput),
      testID: `input-${field.id}`,
      ...(hasError && error ? { error } : {}),
    };

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <Input
            {...baseProps}
            accessibilityLabel={SemanticUtils.generateFieldLabel(field.label, isRequired, hasError, error)}
            onChangeText={(text: string) => handleValueChange(text)}
            multiline={field.type === 'textarea'}
            keyboardType="default"
            autoCapitalize="sentences"
          />
        );

      case 'number':
        return (
          <Input
            {...baseProps}
            accessibilityLabel={SemanticUtils.generateFieldLabel(field.label, isRequired, hasError, error)}
            onChangeText={(text: string) => handleValueChange(text)}
            keyboardType="numeric"
            placeholder={field.label}
          />
        );

      case 'date':
        return (
          <DatePickerField
            value={String(fieldValue || '')}
            onChange={(isoDate: string) => handleValueChange(isoDate)}
            disabled={baseProps.disabled}
            testID={`input-${field.id}`}
            placeholder="Select a date"
            {...(hasError && error ? { error } : {})}
          />
        );

      case 'searchable_select': {
        // Accommodation lodging autocomplete — handled before generic SearchableSelect
        if (field.optionsSource === 'accommodations') {
          // Derive the related address field ID: e.g. hotelName → hotelAddress,
          // accommodationName → accommodationAddress
          const addressFieldId = field.id
            .replace(/Name$/, 'Address')
            .replace(/name$/, 'address');
          return (
            <AccommodationAutocomplete
              value={String(fieldValue || '')}
              onNameChange={(name) => onValueChange(field.id, name)}
              onAddressResolved={(address) => onValueChange(addressFieldId, address)}
              disabled={baseProps.disabled}
              testID={`accommodation-${field.id}`}
              {...(hasError && error ? { error } : {})}
            />
          );
        }

        let resolvedOptions: { value: string; label: string }[];
        switch (field.optionsSource) {
          case 'countries':
            resolvedOptions = ALL_COUNTRIES;
            break;
          case 'airports':
            resolvedOptions = ALL_AIRPORTS;
            break;
          case 'airlines':
            resolvedOptions = ALL_AIRLINES;
            break;
          default:
            resolvedOptions = field.options || [];
        }
        return (
          <SearchableSelect
            value={fieldValue as string}
            onValueChange={handleValueChange}
            options={resolvedOptions}
            placeholder={`Search ${field.label}...`}
            label={field.label}
            disabled={baseProps.disabled}
            testID={`searchable-select-${field.id}`}
            {...(hasError && error ? { error } : {})}
          />
        );
      }

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
            label={field.label}
            required={isRequired}
            disabled={baseProps.disabled}
            testID={`select-${field.id}`}
            {...(hasError && error ? { error } : {})}
          />
        );

      case 'address': {
        // Parse current value as an Address object (may be a JSON string or object)
        let addressValue: Address;
        if (typeof fieldValue === 'string' && fieldValue) {
          try {
            addressValue = JSON.parse(fieldValue) as Address;
          } catch {
            addressValue = { line1: fieldValue, city: '', postalCode: '', country: '' };
          }
        } else if (fieldValue && typeof fieldValue === 'object') {
          addressValue = fieldValue as Address;
        } else {
          addressValue = { line1: '', city: '', postalCode: '', country: '' };
        }
        return (
          <AddressAutocomplete
            value={addressValue}
            onAddressChange={(addr) => handleValueChange(addr)}
            disabled={baseProps.disabled}
            testID={`address-${field.id}`}
          />
        );
      }

      case 'boolean':
        return (
          <Toggle
            value={fieldValue as boolean}
            onValueChange={handleValueChange}
            disabled={baseProps.disabled}
            testID={`field-${field.id}`}
            accessibilityLabel={isRequired ? `${field.label}, required` : field.label}
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
    <View className="mb-4" testID={`field-${field.id}`}>
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
        <Text
          className="text-sm text-red-600 mt-1"
          accessibilityLiveRegion="polite"
          accessible={true}
          accessibilityRole="text"
        >
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
