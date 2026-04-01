/**
 * LegFormSection — Form fields for editing/adding a trip leg.
 *
 * Receives all data (including passport validity warnings) as props
 * from the parent screen.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { Input, DatePickerField, SearchableSelect, AddressAutocomplete, AccommodationAutocomplete } from '@/components/ui';
import PassportValidityWarning from '@/components/trips/PassportValidityWarning';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { ALL_AIRPORTS } from '@/constants/airports';
import type { Address } from '@/types/profile';
import type { PassportValidityWarningData } from '@/hooks/usePassportValidity';

// ── LegFormSection ──────────────────────────────────────────────────────────

export interface LegFormSectionProps {
  legData: {
    destinationCountry: string;
    arrivalDate: string;
    departureDate: string;
    flightNumber: string;
    airlineCode: string;
    arrivalAirport: string;
    accommodation: {
      name: string;
      address: { line1: string; city: string; postalCode: string; country: string };
      phone: string;
    };
  };
  onUpdateField: (field: string, value: string) => void;
  onAddressChange?: (address: Address) => void;
  errors: Record<string, string>;
  testIDPrefix: string;
  /** Passport validity warning data — null/undefined means no warning to show */
  passportWarning?: PassportValidityWarningData | null | undefined;
}

export default function LegFormSection({ legData, onUpdateField, onAddressChange, errors, testIDPrefix, passportWarning }: LegFormSectionProps) {
  return (
    <View className="p-4">
      {/* Country */}
      <View className="bg-surface rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-primary mb-3">Country</Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_COUNTRIES.map(country => (
            <TouchableOpacity
              key={country.code}
              onPress={() => onUpdateField('destinationCountry', country.code)}
              className={`px-3 py-2 rounded-lg border ${
                legData.destinationCountry === country.code
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-surface border-border-default'
              }`}
              activeOpacity={0.7}
              testID={`${testIDPrefix}-country-${country.code}`}
            >
              <Text
                className={`font-medium text-sm ${
                  legData.destinationCountry === country.code ? 'text-white' : 'text-secondary'
                }`}
              >
                {country.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.country && <Text className="text-red-500 text-sm mt-2">{errors.country}</Text>}
      </View>

      {/* Passport validity warning */}
      {passportWarning ? (
        <PassportValidityWarning
          status={passportWarning.status}
          countryName={passportWarning.countryName}
          requiredMonths={passportWarning.requiredMonths}
          passportExpiry={passportWarning.passportExpiry}
          testID={`${testIDPrefix}-passport-validity-warning`}
        />
      ) : null}

      {/* Dates */}
      <View className="bg-surface rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-primary mb-3">Dates</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-secondary mb-1">Arrival Date *</Text>
            <DatePickerField
              value={legData.arrivalDate}
              onChange={date => onUpdateField('arrivalDate', date)}
              placeholder="Arrival date"
              error={errors.arrivalDate}
              testID={`${testIDPrefix}-arrival-date`}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-secondary mb-1">Departure Date</Text>
            <DatePickerField
              value={legData.departureDate}
              onChange={date => onUpdateField('departureDate', date)}
              placeholder="Departure date"
              testID={`${testIDPrefix}-departure-date`}
            />
          </View>
        </View>
      </View>

      {/* Flight */}
      <View className="bg-surface rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-primary mb-3">Flight (Optional)</Text>
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-secondary mb-1">Flight Number</Text>
            <Input
              value={legData.flightNumber}
              onChangeText={text => onUpdateField('flightNumber', text)}
              placeholder="e.g., NH123"
              autoCapitalize="characters"
              testID={`${testIDPrefix}-flight-number`}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-secondary mb-1">Airline Code</Text>
            <Input
              value={legData.airlineCode}
              onChangeText={text => onUpdateField('airlineCode', text)}
              placeholder="e.g., NH"
              autoCapitalize="characters"
              testID={`${testIDPrefix}-airline-code`}
            />
          </View>
        </View>
        <View>
          <Text className="text-sm font-medium text-secondary mb-1">Arrival Airport</Text>
          <SearchableSelect
            value={legData.arrivalAirport}
            onValueChange={val => onUpdateField('arrivalAirport', val)}
            options={ALL_AIRPORTS}
            placeholder="Search airport..."
            testID={`${testIDPrefix}-arrival-airport`}
          />
        </View>
      </View>

      {/* Accommodation */}
      <View className="bg-surface rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-primary mb-3">Accommodation *</Text>
        <View className="space-y-3">
          <View>
            <AccommodationAutocomplete
              value={legData.accommodation.name}
              onNameChange={text => onUpdateField('accommodation.name', text)}
              testID={`${testIDPrefix}-accommodation-name`}
              error={errors.accommodationName}
            />
          </View>
          <AddressAutocomplete
            value={legData.accommodation.address}
            onAddressChange={addr => onAddressChange?.(addr)}
            testID={`${testIDPrefix}-accommodation-address`}
          />
          <View>
            <Text className="text-sm font-medium text-secondary mb-1">Phone (Optional)</Text>
            <Input
              value={legData.accommodation.phone}
              onChangeText={text => onUpdateField('accommodation.phone', text)}
              placeholder="Hotel phone number"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
