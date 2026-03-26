import { View, Text, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Plane, Users, UserPlus } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button, Input, Card, ScreenContainer, Toggle } from '@/components/ui';
import { TravelerSelector } from '@/components/trips';
import { ContextualHelp, HelpContent } from '@/components/help';
import { BoardingPassScanner } from '@/components/boarding';
import { SmartImportSheet } from '@/components/import';
import { useTripCreation } from '@/hooks/useTripCreation';
import { Destinations } from './CreateTripScreen.Destinations';
import type { TripStackParamList } from '@/app/navigation/types';

type CreateTripRouteProp = RouteProp<TripStackParamList, 'CreateTrip'>;

export default function CreateTripScreen() {
  const rootNavigation = useNavigation();
  const route = useRoute<CreateTripRouteProp>();
  const templateId = route.params?.templateId;

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
    applyToAllLegs,
    setApplyToAllLegs,
  } = useTripCreation(templateId ? { templateId } : {});

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            {templateId ? 'Trip from Template' : 'Create New Trip'}
          </Text>
          <ContextualHelp
            content={HelpContent.tripManagement}
            variant="icon"
            size="medium"
          />
        </View>
        <Text className="text-base text-gray-600 dark:text-gray-400">
          {templateId
            ? 'Destinations pre-filled from template — set your dates to continue'
            : 'Plan your multi-country journey'}
        </Text>
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

          {/* Trip-level traveler selector or empty state CTA */}
          {familyMembers.length > 0 ? (
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
                {legs.length >= 2 && familyMembers.length >= 2 && (
                  <View
                    className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                    testID="apply-to-all-toggle-row"
                  >
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Apply to all destinations
                    </Text>
                    <Toggle
                      value={applyToAllLegs}
                      onValueChange={setApplyToAllLegs}
                      accessibilityLabel="Apply travelers to all destinations"
                      accessibilityHint="When on, all destinations share the same travelers"
                      testID="apply-to-all-toggle"
                    />
                  </View>
                )}
              </View>
            </Card>
          ) : (
            <Card className="mb-6" variant="outlined" testID="family-empty-state-card">
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <Users size={28} color="#6366f1" style={{ marginRight: 12 }} />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">Traveling with family?</Text>
                </View>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add travel companions to fill out forms for everyone at once.
                </Text>
                <TouchableOpacity
                  onPress={() => (rootNavigation as any).navigate('Profile', { screen: 'AddFamilyMember' })}
                  className="flex-row items-center bg-indigo-50 dark:bg-indigo-950 px-4 py-3 rounded-lg"
                  activeOpacity={0.7}
                  testID="add-companion-cta-button"
                  accessibilityRole="button"
                  accessibilityLabel="Add a travel companion"
                  accessibilityHint="Navigate to add a family member"
                >
                  <UserPlus size={20} color="#6366f1" style={{ marginRight: 8 }} />
                  <Text className="text-indigo-700 dark:text-indigo-300 font-medium">Add a travel companion</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

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
