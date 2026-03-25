import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Map, Trash2, Copy, BookmarkPlus } from 'lucide-react-native';
import { LegCard, AccountSetupChecklist, ReadinessChecklist, SaveTemplateModal, DuplicateTripModal } from '@/components/trips';
import { Button, StatusBadge, ScreenContainer } from '@/components/ui';
import { useAccessibilityFocus } from '@/hooks/useAccessibilityFocus';
import { useTripDetail } from '@/hooks/useTripDetail';
import { EditTripModal, AddDestinationModal } from '@/components/trips/TripDetailModals';

interface RouteParams {
  tripId: string;
}

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as RouteParams;

  const {
    trip,
    familyMembers,
    deadlineMap,
    submissionProgress,
    progress,
    isDuplicating,
    duplicateError,
    resetDuplicateError,
    currentProfileId,
    tripReadiness,
    isReadinessLoading,
    editHook,
    handleReadinessNavigate,
    handleLegPress,
    handleDeleteTrip,
    handleSaveAsTemplate,
    handleConfirmDuplicate,
    handleMarkAsSubmitted,
    getStatusColor,
    getStatusText,
  } = useTripDetail({ tripId });

  // Modal visibility — render-only UI state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Accessibility: focus management for modals
  const { ref: editTriggerRef, focusElement: focusEditTrigger } = useAccessibilityFocus();
  const { ref: addTriggerRef, focusElement: focusAddTrigger } = useAccessibilityFocus();
  const { ref: duplicateTriggerRef, focusElement: focusDuplicateTrigger } = useAccessibilityFocus();
  const { ref: editModalTitleRef } = useAccessibilityFocus({ shouldFocus: showEditModal, delay: 350 });
  const { ref: addModalTitleRef } = useAccessibilityFocus({ shouldFocus: showAddModal, delay: 350 });

  const handleOpenDuplicateModal = () => {
    resetDuplicateError();
    setShowDuplicateModal(true);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    resetDuplicateError();
    setTimeout(focusDuplicateTrigger, 100);
  };

  const handleDuplicateConfirm = async (newDepartureDate: string) => {
    const newTrip = await handleConfirmDuplicate(newDepartureDate);
    if (newTrip) {
      setShowDuplicateModal(false);
      (navigation as any).navigate('TripDetail', { tripId: newTrip.id });
    }
  };

  const handleOpenAddDestination = () => {
    editHook.startAddDestination();
    setShowAddModal(true);
  };

  const handleCloseEditModal = () => {
    editHook.cancelEditLeg();
    setShowEditModal(false);
    setTimeout(focusEditTrigger, 100);
  };

  const handleCloseAddModal = () => {
    editHook.cancelAddDestination();
    setShowAddModal(false);
    setTimeout(focusAddTrigger, 100);
  };

  const handleConfirmAddDestination = async () => {
    const added = await editHook.handleAddDestination();
    if (added) {
      setShowAddModal(false);
    }
  };

  const onSaveAsTemplate = async (name: string) => {
    const success = await handleSaveAsTemplate(name);
    if (success) {
      setShowSaveTemplateModal(false);
    }
  };

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-lg text-gray-600 dark:text-gray-400">Trip not found</Text>
        <View className="mt-4">
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            testID="trip-detail-go-back-button"
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
                ref={duplicateTriggerRef}
                onPress={handleOpenDuplicateModal}
                className="ml-2 p-2"
                activeOpacity={0.7}
                testID="duplicate-trip-button"
                accessibilityLabel="Duplicate trip"
                accessibilityRole="button"
              >
                <Copy size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                ref={editTriggerRef}
                onPress={() => setShowEditModal(true)}
                className="ml-2 p-2"
                activeOpacity={0.7}
                testID="edit-trip-button"
                accessibilityLabel="Edit trip"
                accessibilityRole="button"
              >
                <Text className="text-blue-600 dark:text-blue-400 font-medium">Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

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
              {/* Submission progress summary */}
              <View
                className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex-row items-center justify-between"
                testID="submission-progress-summary"
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

        {/* Trip Readiness Checklist */}
        {trip.legs.length > 0 && (
          <View className="px-4 pt-4">
            {isReadinessLoading ? (
              <View
                testID="readiness-checklist-loading"
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                accessible={true}
                accessibilityLabel="Loading trip readiness"
                accessibilityRole="progressbar"
              >
                <View className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
              </View>
            ) : tripReadiness ? (
              <ReadinessChecklist
                tripReadiness={tripReadiness}
                onNavigate={handleReadinessNavigate}
                testID="readiness-checklist"
              />
            ) : null}
          </View>
        )}

        {/* Pre-trip Account Setup */}
        {trip.legs.length > 0 && currentProfileId && (
          <View className="pt-4">
            <AccountSetupChecklist
              legs={trip.legs}
              profileId={currentProfileId}
              familyProfileIds={familyMembers
                .filter(m => m.id !== currentProfileId)
                .map(m => m.id)}
              testID="trip-detail-account-checklist"
            />
          </View>
        )}

        {/* Trip Timeline */}
        <View className="px-4 py-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Itinerary</Text>
            <TouchableOpacity
              ref={addTriggerRef}
              onPress={handleOpenAddDestination}
              className="bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-lg"
              activeOpacity={0.7}
              testID="add-destination-button"
              accessibilityLabel="Add destination"
              accessibilityRole="button"
            >
              <Text className="text-blue-600 dark:text-blue-400 font-medium text-sm">+ Add Destination</Text>
            </TouchableOpacity>
          </View>

          {trip.legs.length === 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 items-center">
              <Map size={40} color="#6b7280" style={{ marginBottom: 12 }} />
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No destinations yet</Text>
              <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-4">
                Add your first destination to start planning your forms
              </Text>
              <Button
                title="Add Destination"
                onPress={handleOpenAddDestination}
                variant="primary"
                testID="add-destination-empty-button"
              />
            </View>
          ) : (
            <View>
              {trip.legs
                .sort((a, b) => a.order - b.order)
                .map((leg, index) => (
                  <View key={leg.id} className="relative">
                    <LegCard
                      leg={leg}
                      onPress={() => handleLegPress(leg)}
                      showFormStatus
                      familyMembers={familyMembers}
                      showTravelerDetails
                      deadline={deadlineMap[leg.id]}
                      onMarkAsSubmitted={() => handleMarkAsSubmitted(leg.id)}
                    />
                    {index < trip.legs.length - 1 && (
                      <View className="absolute left-8 top-20 w-0.5 h-4 bg-gray-300 dark:bg-gray-600 z-10" />
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="px-4 pb-8">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
            {/* Save as Template */}
            <TouchableOpacity
              onPress={() => setShowSaveTemplateModal(true)}
              className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700"
              activeOpacity={0.7}
              testID="save-as-template-button"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Save as Template"
              accessibilityHint="Save this trip as a reusable template"
            >
              <BookmarkPlus size={28} color="#2563eb" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-blue-600 dark:text-blue-400">Save as Template</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">Reuse destinations for future trips</Text>
              </View>
            </TouchableOpacity>

            {/* Delete Trip */}
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

      {/* ── Save as Template Modal ──────────────────────────────────────────── */}
      <SaveTemplateModal
        visible={showSaveTemplateModal}
        initialName={trip.name}
        onSave={onSaveAsTemplate}
        onCancel={() => setShowSaveTemplateModal(false)}
        testID="save-template-modal"
      />

      {/* ── Edit Trip Modal ──────────────────────────────────────────────────── */}
      <EditTripModal
        visible={showEditModal}
        onClose={handleCloseEditModal}
        onSwitchToAdd={() => {
          setShowEditModal(false);
          setTimeout(() => {
            editHook.startAddDestination();
            setShowAddModal(true);
          }, 300);
        }}
        editHook={editHook}
        legs={trip.legs}
        editModalTitleRef={editModalTitleRef}
      />

      {/* ── Add Destination Modal ───────────────────────────────────────────── */}
      <AddDestinationModal
        visible={showAddModal}
        onClose={handleCloseAddModal}
        onConfirm={handleConfirmAddDestination}
        editHook={editHook}
        addModalTitleRef={addModalTitleRef}
      />

      {/* ── Duplicate Trip Modal ─────────────────────────────────────────────── */}
      <DuplicateTripModal
        visible={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        onConfirm={handleDuplicateConfirm}
        loading={isDuplicating}
        error={duplicateError}
        testID="duplicate-trip-modal"
      />
    </ScreenContainer>
  );
}
