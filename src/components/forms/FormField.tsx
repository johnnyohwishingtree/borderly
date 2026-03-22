import { View, Text, TextInputProps } from 'react-native';
import { Input, Select, Toggle, SearchableSelect, DatePickerField, AddressAutocomplete, AccommodationAutocomplete } from '../ui';
import { FilledFormField } from '../../services/forms/formEngine';
import AutoFilledBadge from './AutoFilledBadge';
import { ALL_COUNTRIES } from '../../constants/countries';
import { ALL_AIRPORTS } from '../../constants/airports';
import { ALL_AIRLINES } from '../../constants/airlines';
import { Address } from '../../types/profile';
import { SemanticUtils } from '../../utils/accessibility';

/** Platform-specific input props derived from field metadata. */
function getInputHints(field: FilledFormField): Pick<
  TextInputProps,
  'textContentType' | 'autoComplete' | 'keyboardType' | 'autoCapitalize' | 'maxLength' | 'returnKeyType'
> {
  const src = field.autoFillSource ?? '';
  const id = field.id;

  // --- Email fields ---
  if (src.includes('email') || id.includes('email') || id.includes('Email')) {
    return {
      textContentType: 'emailAddress',
      autoComplete: 'email',
      keyboardType: 'email-address',
      autoCapitalize: 'none',
    };
  }

  // --- Phone fields ---
  if (src.includes('phone') || id.includes('phone') || id.includes('Phone')) {
    return {
      textContentType: 'telephoneNumber',
      autoComplete: 'tel',
      keyboardType: 'phone-pad',
      autoCapitalize: 'none',
    };
  }

  // --- Name fields ---
  if (src === 'profile.surname' || id === 'surname') {
    return {
      textContentType: 'familyName',
      autoComplete: 'name-family',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }
  if (src === 'profile.givenNames' || id === 'givenNames') {
    return {
      textContentType: 'givenName',
      autoComplete: 'name-given',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }
  if (src === 'profile.middleNames' || id === 'middleNames') {
    return {
      textContentType: 'middleName',
      autoComplete: 'name-middle',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }

  // --- Occupation / employer ---
  if (src === 'profile.occupation' || id === 'occupation' || id === 'jobTitle') {
    return {
      textContentType: 'jobTitle',
      autoComplete: 'name',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }
  if (src === 'profile.employerName' || id === 'employerName' || id === 'employer') {
    return {
      textContentType: 'organizationName',
      autoComplete: 'name',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }

  // --- Address sub-fields ---
  if (src.includes('address.city') || id === 'homeCity' || id === 'city') {
    return {
      textContentType: 'addressCity',
      autoComplete: 'postal-address-locality',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }
  if (src.includes('address.state') || id === 'county') {
    return {
      textContentType: 'addressState',
      autoComplete: 'postal-address-region',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }
  if (src.includes('address.postalCode') || id === 'postalCode') {
    return {
      textContentType: 'postalCode',
      autoComplete: 'postal-code',
      keyboardType: 'default',
      autoCapitalize: 'characters',
    };
  }
  if (src.includes('address.line1') || id === 'addressLine1') {
    return {
      textContentType: 'streetAddressLine1',
      autoComplete: 'street-address',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }
  if (src.includes('address.line2') || id === 'addressLine2') {
    return {
      textContentType: 'streetAddressLine2',
      autoComplete: 'postal-address-extended',
      keyboardType: 'default',
      autoCapitalize: 'words',
    };
  }

  // --- Passport / flight (uppercase identifiers) ---
  if (src === 'profile.passportNumber' || id === 'passportNumber') {
    return { keyboardType: 'default', autoCapitalize: 'characters' };
  }
  if (src === 'leg.flightNumber' || id === 'flightNumber') {
    return { keyboardType: 'default', autoCapitalize: 'characters' };
  }

  // --- Generic name-like fields (emergency contacts, etc.) ---
  if (id.includes('Name') || id.includes('name')) {
    return { keyboardType: 'default', autoCapitalize: 'words' };
  }

  // Default
  return { keyboardType: 'default', autoCapitalize: 'sentences' };
}

/** maxLength + returnKeyType derived from field schema and field semantics. */
function getFieldConstraints(field: FilledFormField): Pick<
  TextInputProps,
  'maxLength' | 'returnKeyType'
> {
  const result: Pick<TextInputProps, 'maxLength' | 'returnKeyType'> = {};

  // Explicit schema maxLength takes priority
  if (field.validation?.maxLength) {
    result.maxLength = field.validation.maxLength;
  } else {
    // Infer sensible maxLength from field semantics
    const src = field.autoFillSource ?? '';
    const id = field.id;
    if (src === 'profile.passportNumber' || id === 'passportNumber') {
      result.maxLength = 20;
    } else if (src === 'leg.flightNumber' || id === 'flightNumber') {
      result.maxLength = 10;
    } else if (src.includes('address.postalCode') || id === 'postalCode') {
      result.maxLength = 12;
    } else if (src.includes('phone') || id.includes('phone') || id.includes('Phone')) {
      result.maxLength = 20;
    }
  }

  // textarea uses default (Enter creates newline), single-line fields use "next"
  result.returnKeyType = field.type === 'textarea' ? 'default' : 'next';
  return result;
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
            {...getInputHints(field)}
            {...getFieldConstraints(field)}
          />
        );

      case 'number':
        return (
          <Input
            {...baseProps}
            accessibilityLabel={SemanticUtils.generateFieldLabel(field.label, isRequired, hasError, error)}
            onChangeText={(text: string) => handleValueChange(text)}
            keyboardType="numeric"
            returnKeyType="next"
            placeholder={field.label}
            {...(field.validation?.maxLength ? { maxLength: field.validation.maxLength } : {})}
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
