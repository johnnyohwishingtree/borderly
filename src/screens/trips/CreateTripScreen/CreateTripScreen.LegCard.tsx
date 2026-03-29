import { View, Text } from 'react-native';
import { Button, Input, Card, DatePickerField, SearchableSelect, AddressAutocomplete, AccommodationAutocomplete } from '@/components/ui';
import { CountryFlag, TravelerSelector } from '@/components/trips';
import PassportValidityWarning from '@/components/trips/PassportValidityWarning';
import { AutoFilledBadge } from '@/components/forms';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { ALL_AIRPORTS } from '@/constants/airports';
import { usePassportValidity } from '@/hooks/usePassportValidity';
import type { LegFormData } from '@/hooks/useTripCreation';
import type { FamilyMember } from '@/types/profile';
import { CREATE_TRIP_IDS } from './testIDs';

const FieldHeader = ({ label, autoFilled }: { label: string; autoFilled?: boolean }) => (
  <View className="flex-row items-center justify-between mb-2">
    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
    {autoFilled && <AutoFilledBadge source="auto" size="small" />}
  </View>
);

function LegPassportWarning({
  countryCode,
  departureDate,
  legIndex,
}: {
  countryCode: string;
  departureDate?: string | undefined;
  legIndex: number;
}) {
  const warningData = usePassportValidity({ countryCode, departureDate });
  if (!warningData) return null;
  return (
    <PassportValidityWarning
      status={warningData.status}
      countryName={warningData.countryName}
      requiredMonths={warningData.requiredMonths}
      passportExpiry={warningData.passportExpiry}
      testID={CREATE_TRIP_IDS.legPassportValidityWarning.id.replace('${index}', String(legIndex))}
    />
  );
}

interface LegCardProps {
  leg: LegFormData;
  index: number;
  errors: Record<string, string>;
  familyMembers: FamilyMember[];
  applyToAllLegs: boolean;
  removeLeg: (index: number) => void;
  updateLeg: (index: number, field: string, value: unknown) => void;
  handleTravelerToggle: (legIndex: number, travelerId: string) => void;
}

export function CreateTripLegCard({
  leg,
  index,
  errors,
  familyMembers,
  applyToAllLegs,
  removeLeg,
  updateLeg,
  handleTravelerToggle,
}: LegCardProps) {
  return (
    <Card key={index} className="mb-4" variant="outlined">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            {leg.destinationCountry && (
              <CountryFlag countryCode={leg.destinationCountry} size="medium" showName />
            )}
            {!leg.destinationCountry && (
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Destination {index + 1}
              </Text>
            )}
          </View>
          <Button
            title="Remove"
            onPress={() => removeLeg(index)}
            variant="outline"
            size="small"
            testID={CREATE_TRIP_IDS.removeLegButton.id.replace('${index}', String(index))}
          />
        </View>

        <View className="space-y-3">
          <View>
            <FieldHeader label="Country" autoFilled={!!leg.autoFilledFields?.destinationCountry} />
            <SearchableSelect
              options={SUPPORTED_COUNTRIES.map(c => ({ value: c.code, label: c.name }))}
              value={leg.destinationCountry}
              onValueChange={(val) => updateLeg(index, 'destinationCountry', val)}
              placeholder="Search country..."
              testID={CREATE_TRIP_IDS.countrySelect.id.replace('${index}', String(index))}
              error={errors[`leg${index}.country`]}
            />
          </View>

          {leg.destinationCountry ? (
            <LegPassportWarning
              countryCode={leg.destinationCountry}
              departureDate={leg.departureDate || undefined}
              legIndex={index}
            />
          ) : null}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldHeader label="Arrival Date" autoFilled={!!leg.autoFilledFields?.arrivalDate} />
              <DatePickerField
                value={leg.arrivalDate}
                onChange={(date) => updateLeg(index, 'arrivalDate', date)}
                testID={CREATE_TRIP_IDS.legArrivalDate.id.replace('${index}', String(index))}
                placeholder="Arrival date"
                minDate={new Date().toISOString().split('T')[0]}
                maxDate={`${new Date().getFullYear() + 3}-12-31`}
                error={errors[`leg${index}.arrival`]}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departure Date</Text>
              <DatePickerField
                value={leg.departureDate}
                onChange={(date) => updateLeg(index, 'departureDate', date)}
                testID={CREATE_TRIP_IDS.legDepartureDate.id.replace('${index}', String(index))}
                placeholder="Departure date"
                minDate={leg.arrivalDate || new Date().toISOString().split('T')[0]}
                maxDate={`${new Date().getFullYear() + 3}-12-31`}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldHeader label="Flight Number" autoFilled={!!leg.autoFilledFields?.flightNumber} />
              <Input
                value={leg.flightNumber}
                onChangeText={(text) => updateLeg(index, 'flightNumber', text)}
                placeholder="e.g., NH123"
                autoCapitalize="characters"
                testID={CREATE_TRIP_IDS.legFlightNumber.id.replace('${index}', String(index))}
              />
            </View>
            <View className="flex-1">
              <FieldHeader label="Airline Code" autoFilled={!!leg.autoFilledFields?.airlineCode} />
              <Input
                value={leg.airlineCode}
                onChangeText={(text) => updateLeg(index, 'airlineCode', text)}
                placeholder="e.g., NH"
                autoCapitalize="characters"
                testID={CREATE_TRIP_IDS.legAirlineCode.id.replace('${index}', String(index))}
              />
            </View>
          </View>

          <View>
            <FieldHeader label="Arrival Airport" autoFilled={!!leg.autoFilledFields?.arrivalAirport} />
            <SearchableSelect
              value={leg.arrivalAirport}
              onValueChange={(val) => updateLeg(index, 'arrivalAirport', val)}
              options={ALL_AIRPORTS}
              placeholder="Search airport..."
              testID={CREATE_TRIP_IDS.legArrivalAirport.id.replace('${index}', String(index))}
            />
          </View>

          {familyMembers.length > 0 && (
            <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
              {applyToAllLegs ? (
                <View testID={CREATE_TRIP_IDS.legTravelersSynced.id.replace('${index}', String(index))}>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Travelers
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    Same as trip — {leg.assignedTravelers.length} traveler{leg.assignedTravelers.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              ) : (
                <>
                  <TravelerSelector
                    travelers={familyMembers}
                    selectedTravelerIds={leg.assignedTravelers}
                    onToggleTraveler={(travelerId) => handleTravelerToggle(index, travelerId)}
                    title="Who is traveling to this destination?"
                    subtitle="Select which family members will visit this country."
                    showCompact={true}
                    minSelection={1}
                  />
                  {errors[`leg${index}.travelers`] && (
                    <Text className="text-red-500 text-sm mt-1">{errors[`leg${index}.travelers`]}</Text>
                  )}
                </>
              )}
            </View>
          )}

          <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Accommodation</Text>

            <View className="space-y-3">
              <View>
                <AccommodationAutocomplete
                  value={leg.accommodation.name}
                  onNameChange={(text) => updateLeg(index, 'accommodation.name', text)}
                  onAddressResolved={(resolved) => {
                    if (resolved.line1) updateLeg(index, 'accommodation.address.line1', resolved.line1);
                    if (resolved.city) updateLeg(index, 'accommodation.address.city', resolved.city);
                    if (resolved.state) updateLeg(index, 'accommodation.address.state', resolved.state);
                    if (resolved.postalCode) updateLeg(index, 'accommodation.address.postalCode', resolved.postalCode);
                    if (resolved.country) updateLeg(index, 'accommodation.address.country', resolved.country);
                  }}
                  countryHint={leg.destinationCountry}
                  testID={CREATE_TRIP_IDS.legAccommodationName.id.replace('${index}', String(index))}
                  error={errors[`leg${index}.accommodation`]}
                />
              </View>

              <AddressAutocomplete
                value={leg.accommodation.address}
                onAddressChange={(address) => updateLeg(index, 'accommodation.address', address)}
                testID={CREATE_TRIP_IDS.legAccommodationAddress.id.replace('${index}', String(index))}
              />

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (Optional)</Text>
                <Input
                  value={leg.accommodation.phone}
                  onChangeText={(text) => updateLeg(index, 'accommodation.phone', text)}
                  placeholder="Hotel phone number"
                  keyboardType="phone-pad"
                  testID={`leg-${index}-accommodation-phone`}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}
