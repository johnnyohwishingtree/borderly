import { useState } from 'react';
import { View, Text } from 'react-native';
import { Input, Select, Toggle, SearchableSelect, DatePickerField, AddressAutocomplete, AccommodationAutocomplete } from '../ui';
import { FilledFormField } from '../../services/forms/formEngine';
import AutoFilledBadge from './AutoFilledBadge';
import { ALL_COUNTRIES } from '../../constants/countries';
import { ALL_AIRPORTS } from '../../constants/airports';
import { ALL_AIRLINES } from '../../constants/airlines';
import { Address } from '../../types/profile';
import { SemanticUtils } from '../../utils/accessibility';

/**
 * Returns the appropriate autoCapitalize value for a text input based on the
 * field's semantic meaning (derived from its id).
 *
 * | Value        | When to use                                               |
 * |--------------|-----------------------------------------------------------|
 * | 'none'       | Email addresses, phone numbers                            |
 * | 'characters' | Passport numbers, country codes, nationality codes        |
 * | 'words'      | Surname and given-name fields                             |
 * | 'sentences'  | Free-text fields (occupation, purpose of visit, etc.)     |
 */
function getAutoCapitalize(
  fieldId: string,
  isEmailField: boolean,
  isPhoneField: boolean,
): 'none' | 'sentences' | 'words' | 'characters' {
  if (isEmailField || isPhoneField) {
    return 'none';
  }

  const id = fieldId.toLowerCase();

  // Passport numbers and document numbers are all-caps codes (e.g. AB1234567)
  if (
    id === 'passportnumber' ||
    id === 'documentnumber' ||
    id === 'traveldocumentnumber' ||
    id.endsWith('passportnumber')
  ) {
    return 'characters';
  }

  // Country and nationality codes are 2–3 uppercase letters (e.g. SGP, MY)
  if (
    id === 'nationality' ||
    id === 'issuingcountry' ||
    id === 'countryofbirth' ||
    id === 'countryofresidence' ||
    id === 'destinationcountry' ||
    id.includes('nationality') ||
    id.endsWith('country') ||
    id.endsWith('countrycode')
  ) {
    return 'characters';
  }

  // Name fields: capitalise each word (e.g. "John" / "Smith")
  if (
    id === 'surname' ||
    id === 'givennames' ||
    id === 'firstname' ||
    id === 'lastname' ||
    id === 'middlename' ||
    id === 'fullname' ||
    id.endsWith('surname') ||
    id.endsWith('givennames') ||
    id.endsWith('firstname') ||
    id.endsWith('lastname')
  ) {
    return 'words';
  }

  return 'sentences';
}

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
  const [numericError, setNumericError] = useState<string | undefined>(undefined);

  const fieldValue = value ?? field.currentValue;
  const isRequired = field.required;
  // Combine parent-provided error with locally computed numeric validation error
  const effectiveError = error || numericError;
  const hasError = !!effectiveError;

  const handleValueChange = (newValue: unknown) => {
    onValueChange(field.id, newValue);
  };

  const renderInput = () => {
    const baseProps = {
      value: String(fieldValue || ''),
      placeholder: field.label,
      disabled: disabled || (field.source === 'auto' && !field.needsUserInput),
      testID: `input-${field.id}`,
      ...(hasError && effectiveError ? { error: effectiveError } : {}),
    };

    // Determine keyboard type and autoCapitalize based on field semantics
    const isEmailField = field.id.toLowerCase().endsWith('email');
    const isPhoneField =
      field.id === 'mobile' ||
      field.id.toLowerCase().includes('phone');
    const isPassportNumberField = field.id === 'passportNumber';
    const textKeyboardType = isEmailField
      ? 'email-address'
      : isPhoneField
        ? 'phone-pad'
        : 'default';
    const textAutoCapitalize = getAutoCapitalize(field.id, isEmailField, isPhoneField);

    // Platform autofill hints: textContentType (iOS) + autoComplete (Android/Web)
    let textContentType: 'emailAddress' | 'telephoneNumber' | 'none' | undefined;
    let autoComplete: 'email' | 'tel' | 'off' | undefined;

    if (isEmailField) {
      textContentType = 'emailAddress';
      autoComplete = 'email';
    } else if (isPhoneField) {
      textContentType = 'telephoneNumber';
      autoComplete = 'tel';
    } else if (isPassportNumberField) {
      textContentType = 'none';
      autoComplete = 'off';
    }

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <Input
            {...baseProps}
            accessibilityLabel={SemanticUtils.generateFieldLabel(field.label, isRequired, hasError, effectiveError)}
            onChangeText={(text: string) => handleValueChange(text)}
            multiline={field.type === 'textarea'}
            keyboardType={textKeyboardType}
            autoCapitalize={textAutoCapitalize}
            textContentType={textContentType}
            autoComplete={autoComplete}
          />
        );

      case 'number': {
        const numMin = field.validation?.min;
        const numMax = field.validation?.max;
        // Derive maxLength from the digit count of the max value so the keyboard
        // dismisses at the right length (e.g. max=90 → maxLength=2).
        const numMaxLength =
          numMax !== undefined ? String(Math.abs(numMax)).length : undefined;

        const handleNumericChange = (text: string) => {
          if (text === '' || text === '-') {
            setNumericError(undefined);
            handleValueChange(text);
            return;
          }
          const parsed = Number(text);
          if (!isNaN(parsed)) {
            if (numMin !== undefined && numMax !== undefined && (parsed < numMin || parsed > numMax)) {
              setNumericError(`Must be between ${numMin} and ${numMax}`);
            } else if (numMin !== undefined && numMax === undefined && parsed < numMin) {
              setNumericError(`Must be at least ${numMin}`);
            } else if (numMax !== undefined && numMin === undefined && parsed > numMax) {
              setNumericError(`Must be at most ${numMax}`);
            } else {
              setNumericError(undefined);
            }
          } else {
            setNumericError(undefined);
          }
          handleValueChange(text);
        };

        return (
          <Input
            {...baseProps}
            accessibilityLabel={SemanticUtils.generateFieldLabel(field.label, isRequired, hasError, effectiveError)}
            onChangeText={handleNumericChange}
            keyboardType="numeric"
            placeholder={field.label}
            {...(numMaxLength !== undefined ? { maxLength: numMaxLength } : {})}
          />
        );
      }

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
            <View className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Text className="text-gray-500 dark:text-gray-400">No options available</Text>
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
          <View className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Text className="text-gray-500 dark:text-gray-400">
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
          <Text className="text-base font-medium text-gray-900 dark:text-white">
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
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {field.helpText}
        </Text>
      )}

      {/* Input Component */}
      {renderInput()}

      {/* Error Message */}
      {hasError && (
        <Text
          className="text-sm text-red-600 dark:text-red-400 mt-1"
          accessibilityLiveRegion="polite"
          accessible={true}
          accessibilityRole="text"
        >
          {effectiveError}
        </Text>
      )}

      {/* Country-specific indicator */}
      {field.countrySpecific && (
        <View className="mt-2">
          <Text className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            ⚠️ Country-specific requirement
          </Text>
        </View>
      )}
    </View>
  );
}
