import { View, Text, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Plane, Users, UserPlus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Card, ScreenContainer, Toggle } from '@/components/ui';
import { TravelerSelector } from '@/components/trips';
import { ContextualHelp, HelpContent } from '@/components/help';
import { BoardingPassScanner } from '@/components/boarding';
import { SmartImportSheet } from '@/components/import';
import { useTripCreation } from '@/hooks/useTripCreation';
import { Destinations } from './CreateTripScreen.Destinations';
import { CREATE_TRIP_IDS } from './testIDs';


export default function CreateTripScreen() {
  const rootNavigation = useNavigation();

  const hook = useTripCreation();
  const { data: tripData, setTripData } = hook.tripData;
  const { items: legs, addLeg, removeLeg, updateLeg } = hook.legs;
  const { familyMembers, tripTravelers, handleTripTravelerToggle, handleTravelerToggle, applyToAllLegs, setApplyToAllLegs } = hook.travelers;
  const { isCreating, errors, handleCreateTrip } = hook.creation;
  const { showScanner, setShowScanner, showSmartImport, setShowSmartImport, handleScanSuccess, handleScanCancel, handleManualEntry, handleSmartImport } = hook.import;

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            Create New Trip
          </Text>
          <ContextualHelp
            content={HelpContent.tripManagement}
            variant="icon"
            size="medium"
          />
        </View>
        <Text className="text-base text-gray-600 dark:text-gray-400">
          Plan your multi-country journey
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View className="p-4">

          <Card className="mb-6" variant="outlined">
            <View className="p-5">
              <View className="flex-row items-center mb-4">
                <View className="mr-3"><Plane size={32} color="#374151" /></View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">Trip Details</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trip Name</Text>
                <Input
                  value={tripData.name}
                  onChangeText={(text) => setTripData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Asia Summer 2025"
                  error={errors.tripName}
                  testID={CREATE_TRIP_IDS.tripNameField.id}
                />
                {errors.tripName && (
                  <Text className="text-red-500 text-sm mt-1">{errors.tripName}</Text>
                )}
              </View>
            </View>
          </Card>

          <Destinations
            legs={legs}
            errors={errors}
            familyMembers={familyMembers}
            applyToAllLegs={applyToAllLegs}
            addLeg={addLeg}
            removeLeg={removeLeg}
            updateLeg={updateLeg}
            handleTravelerToggle={handleTravelerToggle}
            onShowScanner={() => setShowScanner(true)}
            onShowSmartImport={() => setShowSmartImport(true)}
          />

          {/* Trip-level traveler selector — only shown after destinations are added */}
          {legs.length > 0 && familyMembers.length > 0 ? (
            <Card className="mb-6" variant="outlined">
              <View className="p-5">
                <View className="flex-row items-center mb-4">
                  <View className="mr-3"><Users size={32} color="#374151" /></View>
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
                {legs.length >= 2 && familyMembers.length >= 2 && (
                  <View
                    className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                    testID={CREATE_TRIP_IDS.applyToAllToggleRow.id}
                  >
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Apply to all destinations
                    </Text>
                    <Toggle
                      value={applyToAllLegs}
                      onValueChange={setApplyToAllLegs}
                      accessibilityLabel="Apply travelers to all destinations"
                      accessibilityHint="When on, all destinations share the same travelers"
                      testID={CREATE_TRIP_IDS.applyToAllToggle.id}
                    />
                  </View>
                )}
              </View>
            </Card>
          ) : legs.length > 0 ? (
            <Card className="mb-6" variant="outlined" testID={CREATE_TRIP_IDS.familyEmptyStateCard.id}>
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <View className="mr-3"><Users size={28} color="#6366f1" /></View>
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">Traveling with family?</Text>
                </View>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add travel companions to fill out forms for everyone at once.
                </Text>
                <TouchableOpacity
                  onPress={() => (rootNavigation as any).navigate('Profile', { screen: 'AddFamilyMember' })}
                  className="flex-row items-center bg-indigo-50 dark:bg-indigo-950 px-4 py-3 rounded-lg"
                  activeOpacity={0.7}
                  testID={CREATE_TRIP_IDS.addCompanionCtaButton.id}
                  accessibilityRole="button"
                  accessibilityLabel="Add a travel companion"
                  accessibilityHint="Navigate to add a family member"
                >
                  <View className="mr-2"><UserPlus size={20} color="#6366f1" /></View>
                  <Text className="text-indigo-700 dark:text-indigo-300 font-medium">Add a travel companion</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : null}

          <View className="pb-8">
            <Button
              title={isCreating ? 'Creating Trip...' : 'Create Trip'}
              onPress={handleCreateTrip}
              variant="primary"
              size="large"
              fullWidth
              loading={isCreating}
              disabled={legs.length === 0 || !tripData.name.trim()}
              testID={CREATE_TRIP_IDS.createTripButton.id}
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
