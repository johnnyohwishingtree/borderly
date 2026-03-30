import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Trash2, Copy } from 'lucide-react-native';
import { DuplicateTripModal } from '@/components/trips';
import { Button, StatusBadge, ScreenContainer } from '@/components/ui';
import { useTripDetail } from '@/hooks/useTripDetail';
import { useTripChecklist } from '@/hooks/useTripChecklist';
import { useTripDetailModals } from '@/hooks/useTripDetailModals';
import { usePassportValidity } from '@/hooks/usePassportValidity';
import { EditTripModal, AddDestinationModal } from '@/components/trips/TripDetailModals';
import { computeTravelerProgress } from '@/services/readiness/travelerProgress';
import { Checklists } from './TripDetailScreen.Checklists';
import { Itinerary } from './TripDetailScreen.Itinerary';
import { TRIP_DETAIL_IDS } from './testIDs';

interface RouteParams {
  tripId: string;
}

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as RouteParams;

  const { checklist: tripChecklist } = useTripChecklist(tripId);

  const {
    trip,
    state: { familyMembers, deadlineMap, isDuplicating, duplicateError, currentProfileId },
    derived: { submissionProgress, progress, tripReadiness, isReadinessLoading },
    editHook,
    actions: {
      handleReadinessNavigate, handleLegPress, handleDeleteTrip,
      handleConfirmDuplicate, handleMarkAsSubmitted,
      resetDuplicateError,
    },
    ui: { getStatusColor, getStatusText },
  } = useTripDetail({ tripId });

  const tripTravelers = useMemo(() => {
    if (!trip || familyMembers.length <= 1) return [];
    const travelerIds = new Set<string>();
    for (const leg of trip.legs) {
      if (leg.assignedTravelers) {
        for (const id of leg.assignedTravelers) {
          travelerIds.add(id);
        }
      }
    }
    if (travelerIds.size <= 1) return [];
    return familyMembers.filter(m => travelerIds.has(m.id));
  }, [trip, familyMembers]);

  const travelerProgressData = useMemo(() => {
    if (!trip || familyMembers.length <= 1) return [];
    return computeTravelerProgress(trip, familyMembers);
  }, [trip, familyMembers]);

  const editPassportWarning = usePassportValidity({
    countryCode: editHook.legEdit.editLegData?.destinationCountry ?? '',
    departureDate: editHook.legEdit.editLegData?.departureDate || undefined,
  });

  const addPassportWarning = usePassportValidity({
    countryCode: editHook.addDestination.newLegData?.destinationCountry ?? '',
    departureDate: editHook.addDestination.newLegData?.departureDate || undefined,
  });

  const modals = useTripDetailModals({
    editHook,
    resetDuplicateError,
    handleConfirmDuplicate,
    navigateToTrip: (id) => (navigation as any).navigate('TripDetail', { tripId: id }),
  });

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-lg text-gray-600 dark:text-gray-400">Trip not found</Text>
        <View className="mt-4">
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            testID={TRIP_DETAIL_IDS.goBackButton.id}
          />
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{trip.name}</Text>
              <Text className="text-base text-gray-600 dark:text-gray-400 mb-3">
                {trip.legs.length} destination{trip.legs.length > 1 ? 's' : ''}
              </Text>
              <StatusBadge
                status={getStatusColor(trip.status)}
                text={getStatusText(trip.status)}
                size="medium"
              />
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                ref={modals.duplicateModal.duplicateTriggerRef}
                onPress={modals.duplicateModal.handleOpenDuplicateModal}
                className="ml-2 p-2"
                activeOpacity={0.7}
                testID={TRIP_DETAIL_IDS.duplicateTripButton.id}
                accessibilityLabel="Duplicate trip"
                accessibilityRole="button"
              >
                <Copy size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                ref={modals.editModal.editTriggerRef}
                onPress={() => modals.editModal.setShowEditModal(true)}
                className="ml-2 p-2"
                activeOpacity={0.7}
                testID={TRIP_DETAIL_IDS.editTripButton.id}
                accessibilityLabel="Edit trip"
                accessibilityRole="button"
              >
                <Text className="text-blue-600 dark:text-blue-400 font-medium">Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Travelers */}
          {tripTravelers.length > 1 && (
            <View
              className="mb-4"
              testID={TRIP_DETAIL_IDS.travelersContainer.id}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`${tripTravelers.length} travelers: ${tripTravelers.map(t => `${t.givenNames} ${t.surname}`).join(', ')}`}
            >
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Travelers</Text>
              <View className="flex-row flex-wrap gap-2">
                {tripTravelers.map((member) => (
                  <View
                    key={member.id}
                    className="flex-row items-center bg-gray-50 dark:bg-gray-700 rounded-full px-3 py-1"
                    testID={`trip-detail-traveler-${member.id}`}
                  >
                    <Text className="text-sm font-medium text-gray-900 dark:text-white mr-1">
                      {member.givenNames} {member.surname}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {member.relationship === 'self' ? 'Primary' : member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Progress Overview */}
          {trip.legs.length > 0 && (
            <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.completed}/{progress.total} completed
                </Text>
              </View>
              <View className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <View
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </View>
              <View
                className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex-row items-center justify-between"
                testID={TRIP_DETAIL_IDS.submissionProgressSummary.id}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={`${submissionProgress.submitted} of ${submissionProgress.total} leg${submissionProgress.total !== 1 ? 's' : ''} submitted`}
              >
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Submitted to portals
                </Text>
                <Text
                  className="text-sm text-gray-600 dark:text-gray-400"
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no-hide-descendants"
                >
                  {submissionProgress.submitted}/{submissionProgress.total}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Checklists
          legs={trip.legs}
          currentProfileId={currentProfileId}
          familyMembers={familyMembers}
          isReadinessLoading={isReadinessLoading}
          tripReadiness={tripReadiness}
          tripChecklist={tripChecklist}
          travelerProgressData={travelerProgressData}
          onReadinessNavigate={handleReadinessNavigate}
          onChecklistPress={() => (navigation as { navigate: (screen: string, params: Record<string, string>) => void }).navigate('TripChecklist', { tripId })}
        />

        <Itinerary
          legs={trip.legs}
          familyMembers={familyMembers}
          deadlineMap={deadlineMap}
          addTriggerRef={modals.addModal.addTriggerRef}
          onAddDestination={modals.addModal.handleOpenAddDestination}
          onLegPress={handleLegPress}
          onMarkAsSubmitted={handleMarkAsSubmitted}
        />

        {/* Actions */}
        <View className="px-4 pb-8">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <TouchableOpacity
              onPress={handleDeleteTrip}
              className="flex-row items-center py-3"
              activeOpacity={0.7}
            >
              <Trash2 size={28} color="#dc2626" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-red-600 dark:text-red-400">Delete Trip</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">Remove this trip permanently</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Primary CTA — always visible, shows next action based on trip state */}
      {(() => {
        const nextLeg = trip.legs.find(l => l.formStatus !== 'submitted' && l.formStatus !== 'ready');
        if (!nextLeg) return null;
        const label = nextLeg.formStatus === 'in_progress'
          ? `Continue ${nextLeg.destinationCountry} Form`
          : `Fill ${nextLeg.destinationCountry} Form`;
        return (
          <View className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 pb-8">
            <Button
              title={label}
              onPress={() => handleLegPress(nextLeg)}
              variant="primary"
              size="large"
              fullWidth
              testID={TRIP_DETAIL_IDS.primaryActionButton.id}
            />
          </View>
        );
      })()}

      <EditTripModal
        visible={modals.editModal.showEditModal}
        onClose={modals.editModal.handleCloseEditModal}
        onSwitchToAdd={() => {
          modals.editModal.setShowEditModal(false);
          setTimeout(() => {
            editHook.addDestination.startAddDestination();
            modals.addModal.handleOpenAddDestination();
          }, 300);
        }}
        editHook={editHook}
        legs={trip.legs}
        editModalTitleRef={modals.editModal.editModalTitleRef}
        passportWarning={editPassportWarning}
      />
      <AddDestinationModal
        visible={modals.addModal.showAddModal}
        onClose={modals.addModal.handleCloseAddModal}
        onConfirm={modals.addModal.handleConfirmAddDestination}
        editHook={editHook}
        addModalTitleRef={modals.addModal.addModalTitleRef}
        passportWarning={addPassportWarning}
      />

      <DuplicateTripModal
        visible={modals.duplicateModal.showDuplicateModal}
        onClose={modals.duplicateModal.handleCloseDuplicateModal}
        onConfirm={modals.duplicateModal.handleDuplicateConfirm}
        loading={isDuplicating}
        error={duplicateError}
        testID={TRIP_DETAIL_IDS.duplicateTripModal.id}
      />
    </ScreenContainer>
  );
}
