import { View, Text, ScrollView, Modal } from 'react-native';
import { Plane, MapPin, Globe, Users } from 'lucide-react-native';
import { Button, Input, Card, DatePickerField, SearchableSelect, AddressAutocomplete, ScreenContainer } from '@/components/ui';
import { CountryFlag, TravelerSelector } from '@/components/trips';
import PassportValidityWarning from '@/components/trips/PassportValidityWarning';
import { AutoFilledBadge } from '@/components/forms';
import { ContextualHelp, HelpContent } from '@/components/help';
import { BoardingPassScanner } from '@/components/boarding';
import { SmartImportSheet } from '@/components/import';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { ALL_AIRPORTS } from '@/constants/airports';
import { useTripCreation } from '@/hooks/useTripCreation';
import { usePassportValidity } from '@/hooks/usePassportValidity';
import type { LegFormData } from '@/hooks/useTripCreation';

const FieldHeader = ({ label, autoFilled }: { label: string; autoFilled?: boolean }) => (
  <View className="flex-row items-center justify-between mb-2">
    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
    {autoFilled && <AutoFilledBadge source="auto" size="small" />}
  </View>
);

/**
 * Small sub-component so we can call `usePassportValidity` (a hook) once per
 * leg card. Hooks cannot be called inside plain functions — they must live at
 * the top level of a function component.
 */
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
      testID={`create-trip-passport-validity-warning-${legIndex}`}
    />
  );
}

export default function CreateTripScreen() {
  const {
    tripData,
    setTripData,
    legs,
    tripTravelers,
    isCreating,
    errors,
    showScanner,
    setShowScanner,
    showSmartImport,
    setShowSmartImport,
    familyMembers,
    addLeg,
    removeLeg,
    updateLeg,
    handleTripTravelerToggle,
    handleTravelerToggle,
    handleScanSuccess,
    handleScanCancel,
    handleManualEntry,
    handleCreateTrip,
    handleSmartImport,
  } = useTripCreation();

  const renderLegCard = (leg: LegFormData, index: number) => {
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
              testID={`remove-leg-${index}-button`}
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
                testID={`country-select-${index}`}
                error={errors[`leg${index}.country`]}
              />
            </View>

            {/* Passport validity warning — only shown once departure date is entered */}
            {leg.destinationCountry ? (
              <LegPassportWarning
                countryCode={leg.destinationCountry}
                departureDate={leg.departureDate || undefined}
                legIndex={index}
              />
            ) : null}

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <FieldHeader label="Arrival Date" autoFilled={!!leg.autoFilledFields?.arrivalDate} />
                <DatePickerField
                  value={leg.arrivalDate}
                  onChange={(date) => updateLeg(index, 'arrivalDate', date)}
                  testID={`leg-${index}-arrival-date`}
                  placeholder="Arrival date"
                  error={errors[`leg${index}.arrival`]}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departure Date</Text>
                <DatePickerField
                  value={leg.departureDate}
                  onChange={(date) => updateLeg(index, 'departureDate', date)}
                  testID={`leg-${index}-departure-date`}
                  placeholder="Departure date"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <FieldHeader label="Flight Number" autoFilled={!!leg.autoFilledFields?.flightNumber} />
                <Input
                  value={leg.flightNumber}
                  onChangeText={(text) => updateLeg(index, 'flightNumber', text)}
                  placeholder="e.g., NH123"
                  autoCapitalize="characters"
                  testID={`leg-${index}-flight-number`}
                />
              </View>
              <View className="flex-1">
                <FieldHeader label="Airline Code" autoFilled={!!leg.autoFilledFields?.airlineCode} />
                <Input
                  value={leg.airlineCode}
                  onChangeText={(text) => updateLeg(index, 'airlineCode', text)}
                  placeholder="e.g., NH"
                  autoCapitalize="characters"
                  testID={`leg-${index}-airline-code`}
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
                testID={`leg-${index}-arrival-airport`}
              />
            </View>

            {/* Traveler Selection */}
            {familyMembers.length > 0 && (
              <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
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
              </View>
            )}

            <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Accommodation</Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hotel/Accommodation Name</Text>
                  <Input
                    value={leg.accommodation.name}
                    onChangeText={(text) => updateLeg(index, 'accommodation.name', text)}
                    placeholder="e.g., Park Hyatt Tokyo"
                    testID={`leg-${index}-accommodation-name`}
                  />
                  {errors[`leg${index}.accommodation`] && (
                    <Text className="text-red-500 text-sm mt-1">{errors[`leg${index}.accommodation`]}</Text>
                  )}
                </View>

                <AddressAutocomplete
                  value={leg.accommodation.address}
                  onAddressChange={(address) => updateLeg(index, 'accommodation.address', address)}
                  testID={`leg-${index}-accommodation-address`}
                />

                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (Optional)</Text>
                  <Input
                    value={leg.accommodation.phone}
                    onChangeText={(text) => updateLeg(index, 'accommodation.phone', text)}
                    placeholder="Hotel phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Create New Trip</Text>
          <ContextualHelp
            content={HelpContent.tripManagement}
            variant="icon"
            size="medium"
          />
        </View>
        <Text className="text-base text-gray-600 dark:text-gray-400">Plan your multi-country journey</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View className="p-4">

          <Card className="mb-6" variant="outlined">
            <View className="p-5">
              <View className="flex-row items-center mb-4">
                <Plane size={32} color="#374151" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold text-gray-900 dark:text-white">Trip Details</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trip Name</Text>
                <Input
                  value={tripData.name}
                  onChangeText={(text) => setTripData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Asia Summer 2025"
                  error={errors.tripName}
                  testID="trip-name-input"
                />
                {errors.tripName && (
                  <Text className="text-red-500 text-sm mt-1">{errors.tripName}</Text>
                )}
              </View>
            </View>
          </Card>

          {/* Trip-level traveler selector — only shown when family members exist */}
          {familyMembers.length > 0 && (
            <Card className="mb-6" variant="outlined">
              <View className="p-5">
                <View className="flex-row items-center mb-4">
                  <Users size={32} color="#374151" style={{ marginRight: 12 }} />
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">Who's Traveling?</Text>
                </View>
                <TravelerSelector
                  travelers={familyMembers}
                  selectedTravelerIds={tripTravelers}
                  onToggleTraveler={handleTripTravelerToggle}
                  title="Select all travelers for this trip"
                  subtitle="Primary traveler is always included. Per-destination overrides can be set below."
                  showCompact={false}
                  minSelection={1}
                />
              </View>
            </Card>
          )}

          <View className="mb-6">
            <View className="flex-row flex-wrap items-center justify-between mb-4 gap-2">
              <View className="flex-row items-center">
                <MapPin size={32} color="#374151" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold text-gray-900 dark:text-white">Destinations</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  title="Import"
                  onPress={() => setShowSmartImport(true)}
                  variant="outline"
                  size="small"
                  testID="smart-import-button"
                />
                <Button
                  title="Scan"
                  onPress={() => setShowScanner(true)}
                  variant="outline"
                  size="small"
                  testID="scan-destination-button"
                />
                <Button
                  title="+ Add"
                  onPress={addLeg}
                  variant="primary"
                  size="small"
                  testID="add-destination-button"
                />
              </View>
            </View>

            {errors.legs && (
              <Text className="text-red-500 text-sm mb-3">{errors.legs}</Text>
            )}

            {legs.length === 0 ? (
              <Card variant="outlined">
                <View className="p-6 items-center">
                  <Globe size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No destinations added yet</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                    Add your travel destinations to plan your customs declarations
                  </Text>
                  <View className="flex-row flex-wrap gap-3 justify-center">
                    <Button
                      title="Scan Boarding Pass"
                      onPress={() => setShowScanner(true)}
                      variant="primary"
                      testID="empty-state-scan-button"
                    />
                    <Button
                      title="Add Manually"
                      onPress={addLeg}
                      variant="outline"
                      testID="empty-state-add-button"
                    />
                  </View>
                </View>
              </Card>
            ) : (
              legs.map(renderLegCard)
            )}
          </View>

          <View className="pb-8">
            <Button
              title={isCreating ? 'Creating Trip...' : 'Create Trip'}
              onPress={handleCreateTrip}
              variant="primary"
              size="large"
              fullWidth
              loading={isCreating}
              disabled={legs.length === 0 || !tripData.name.trim()}
              testID="create-trip-button"
            />
            {(legs.length === 0 || !tripData.name.trim()) && (
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                {!tripData.name.trim() ? 'Enter a trip name' : 'Add at least one destination'} to continue
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Boarding Pass Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <BoardingPassScanner
          onScanSuccess={handleScanSuccess}
          onScanCancel={handleScanCancel}
          onManualEntry={handleManualEntry}
        />
      </Modal>

      {/* Smart Import Modal */}
      <Modal
        visible={showSmartImport}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SmartImportSheet
          onImport={handleSmartImport}
          onClose={() => setShowSmartImport(false)}
        />
      </Modal>
    </ScreenContainer>
  );
}
