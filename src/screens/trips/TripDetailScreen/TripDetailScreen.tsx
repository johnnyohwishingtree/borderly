import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Map, Trash2, ChevronLeft, Plus, BookmarkPlus } from 'lucide-react-native';
import { useTripStore } from '@/stores/useTripStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { LegCard, AccountSetupChecklist, ReadinessChecklist, TravelerSelector, SaveTemplateModal } from '@/components/trips';
import { Button, StatusBadge, Input, ScreenContainer, DatePickerField, SearchableSelect, AddressAutocomplete } from '@/components/ui';
import { Trip, TripLeg } from '@/types/trip';
import { Address, FamilyMember } from '@/types/profile';
import { useEditTrip } from '@/hooks/useEditTrip';
import { useAccessibilityFocus } from '@/hooks/useAccessibilityFocus';
import { useTripReadiness } from '@/hooks/useTripReadiness';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { ALL_AIRPORTS } from '@/constants/airports';
import {
  computeTripDeadlines,
  LegDeadline,
} from '@/services/deadline/deadlineService';
import { tripTemplateService } from '@/services/trips/tripTemplateService';
import { getSchemaByCountryCode } from '@/schemas';
import { CountryFormSchema } from '@/types/schema';
import { usePassportValidity } from '@/hooks/usePassportValidity';
import PassportValidityWarning from '@/components/trips/PassportValidityWarning';

interface RouteParams {
  tripId: string;
}

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as RouteParams;

  const trips = useTripStore(state => state.trips);
  const { deleteTrip, updateLegSubmissionStatus } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles, currentProfileId } = useProfileStore();

  // Reactively derive the trip from the store so UI updates immediately after edits
  const trip: Trip | null = useMemo(
    () => trips.find(t => t.id === tripId) ?? null,
    [trips, tripId],
  );

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [deadlineMap, setDeadlineMap] = useState<Record<string, LegDeadline>>({});

  // Compute deadlines whenever the trip changes
  useEffect(() => {
    if (!trip || trip.legs.length === 0) {
      setDeadlineMap({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const uniqueCodes = Array.from(new Set(trip.legs.map(l => l.destinationCountry)));
      const schemaEntries = await Promise.all(
        uniqueCodes.map(async code => {
          const schema = await getSchemaByCountryCode(code);
          return [code, schema] as [string, CountryFormSchema | null];
        }),
      );
      const schemas: Record<string, CountryFormSchema> = Object.fromEntries(
        schemaEntries.filter((entry): entry is [string, CountryFormSchema] => entry[1] !== null)
      );
      const deadlines = computeTripDeadlines(trip, schemas);
      if (!cancelled) {
        const record: Record<string, LegDeadline> = {};
        for (const d of deadlines) {
          record[d.legId] = d;
        }
        setDeadlineMap(record);
      }
    };
    load().catch(err =>
      console.error('TripDetailScreen: failed to compute deadlines', err),
    );
    return () => {
      cancelled = true;
    };
  }, [trip]);

  // Accessibility: focus management for modals
  const { ref: editTriggerRef, focusElement: focusEditTrigger } = useAccessibilityFocus();
  const { ref: addTriggerRef, focusElement: focusAddTrigger } = useAccessibilityFocus();
  const { ref: editModalTitleRef } = useAccessibilityFocus({ shouldFocus: showEditModal, delay: 350 });
  const { ref: addModalTitleRef } = useAccessibilityFocus({ shouldFocus: showAddModal, delay: 350 });

  // Load family members for traveler details — re-run whenever the screen comes into focus
  // so that newly added family members appear without an app restart.
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          await loadFamilyProfiles();
          const profiles = await getAllProfiles();
          const members: FamilyMember[] = Array.from(profiles.values()).map(p => ({
            ...p,
            relationship: p.relationship ?? 'self',
          }));
          setFamilyMembers(members);
        } catch (err) {
          console.error('TripDetailScreen: failed to load profiles', err);
        }
      };
      load();
    }, [loadFamilyProfiles, getAllProfiles]),
  );

  const editHook = useEditTrip({ trip });
  const { tripReadiness, isLoading: isReadinessLoading } = useTripReadiness(trip);

  /**
   * Navigation callback for ReadinessChecklist "Fix" links.
   * Routes to the correct screen based on the actionScreen value set by the service.
   */
  const handleReadinessNavigate = useCallback(
    (screenName: string) => {
      switch (screenName) {
        case 'LegForm': {
          // Navigate to the first non-ready leg's form
          const firstNonReadyLeg = trip?.legs.find(
            l => l.formStatus !== 'ready' && l.formStatus !== 'submitted',
          );
          if (firstNonReadyLeg) {
            (navigation as any).navigate('LegForm', {
              tripId,
              legId: firstNonReadyLeg.id,
            });
          }
          break;
        }
        case 'QRWallet':
          // Navigate to the QR Wallet tab
          (navigation as any).navigate('Wallet');
          break;
        case 'Profile':
          // Navigate to the Profile tab
          (navigation as any).navigate('Profile');
          break;
        default:
          // 'TripDetail' or unknown — stay on current screen
          break;
      }
    },
    [navigation, trip, tripId],
  );

  const handleLegPress = (leg: TripLeg) => {
    (navigation as any).navigate('LegForm', { tripId, legId: leg.id });
  };

  const handleEditTrip = () => {
    setShowEditModal(true);
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(tripId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ]
    );
  };

  const handleSaveAsTemplate = async (name: string) => {
    if (!trip) return;
    try {
      tripTemplateService.saveFromTrip(trip, name);
      setShowSaveTemplateModal(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Template saved!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Template Saved', `"${name}" has been saved as a template.`);
      }
    } catch {
      Alert.alert('Error', 'Failed to save template. Please try again.');
    }
  };

  const handleOpenAddDestination = () => {
    editHook.startAddDestination();
    setShowAddModal(true);
  };

  const handleCloseEditModal = () => {
    editHook.cancelEditLeg();
    setShowEditModal(false);
    // Return focus to the Edit button that opened the modal
    setTimeout(focusEditTrigger, 100);
  };

  const handleCloseAddModal = () => {
    editHook.cancelAddDestination();
    setShowAddModal(false);
    // Return focus to the Add Destination button that opened the modal
    setTimeout(focusAddTrigger, 100);
  };

  const handleSaveTripName = async () => {
    await editHook.handleUpdateTripName();
  };

  const handleSaveLeg = async () => {
    const saved = await editHook.handleSaveLeg();
    if (saved) {
      // Back to the trip-level view inside the modal
    }
  };

  const handleConfirmAddDestination = async () => {
    const added = await editHook.handleAddDestination();
    if (added) {
      setShowAddModal(false);
    }
  };

  const getOverallProgress = () => {
    if (!trip || trip.legs.length === 0) return { completed: 0, total: 0, percentage: 0, readyCount: 0 };
    const completed = trip.legs.filter(
      leg => leg.formStatus === 'submitted' || leg.formStatus === 'ready'
    ).length;
    return { completed, total: trip.legs.length, percentage: (completed / trip.legs.length) * 100, readyCount: completed };
  };

  /** Reactively derived submission progress — updates immediately when a leg is marked submitted. */
  const submissionProgress = useMemo(() => {
    if (!trip || trip.legs.length === 0) return { submitted: 0, total: 0 };
    const submitted = trip.legs.filter(l => l.submissionStatus === 'submitted').length;
    return { submitted, total: trip.legs.length };
  }, [trip]);

  const handleMarkAsSubmitted = useCallback(
    async (legId: string) => {
      try {
        await updateLegSubmissionStatus(legId, 'submitted');
      } catch {
        Alert.alert('Error', 'Failed to mark leg as submitted');
      }
    },
    [updateLegSubmissionStatus],
  );

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming': return 'info';
      case 'active': return 'success';
      case 'completed': return 'neutral';
      default: return 'neutral';
    }
  };

  const getStatusText = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return 'Unknown';
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

  const progress = getOverallProgress();

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
            <TouchableOpacity
              ref={editTriggerRef}
              onPress={handleEditTrip}
              className="ml-4 p-2"
              activeOpacity={0.7}
              testID="edit-trip-button"
              accessibilityLabel="Edit trip"
              accessibilityRole="button"
            >
              <Text className="text-blue-600 dark:text-blue-400 font-medium">Edit</Text>
            </TouchableOpacity>
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
        onSave={handleSaveAsTemplate}
        onCancel={() => setShowSaveTemplateModal(false)}
        testID="save-template-modal"
      />

      {/* ── Edit Trip Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseEditModal}
        testID="edit-trip-modal"
      >
        <KeyboardAvoidingView
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal header */}
          <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
            {editHook.editingLegId ? (
              <TouchableOpacity onPress={editHook.cancelEditLeg} activeOpacity={0.7}>
                <ChevronLeft size={24} color="#2563eb" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCloseEditModal} activeOpacity={0.7} testID="edit-modal-cancel">
                <Text className="text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
              </TouchableOpacity>
            )}
            <Text
              ref={editModalTitleRef}
              className="text-lg font-bold text-gray-900 dark:text-white"
              accessibilityRole="header"
            >
              {editHook.editingLegId ? 'Edit Destination' : 'Edit Trip'}
            </Text>
            {editHook.editingLegId ? (
              <TouchableOpacity
                onPress={handleSaveLeg}
                activeOpacity={0.7}
                testID="save-leg-button"
                disabled={editHook.isUpdatingLeg}
              >
                <Text className="text-blue-600 dark:text-blue-400 font-medium">
                  {editHook.isUpdatingLeg ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 50 }} />
            )}
          </View>

          <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            {editHook.editingLegId && editHook.editLegData ? (
              /* ── Edit specific leg ── */
              <LegFormSection
                legData={editHook.editLegData}
                onUpdateField={editHook.updateEditLegField}
                onAddressChange={editHook.updateEditLegAddress}
                errors={editHook.errors}
                testIDPrefix="edit-leg"
                travelers={editHook.familyMembers}
                onToggleTraveler={editHook.handleEditLegTravelerToggle}
              />
            ) : (
              /* ── Edit trip name + list of legs ── */
              <View className="p-4">
                {/* Trip name */}
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Trip Name</Text>
                  <Input
                    value={editHook.editName}
                    onChangeText={editHook.setEditName}
                    placeholder="e.g., Asia Summer 2025"
                    error={editHook.errors.name}
                    testID="edit-trip-name-input"
                  />
                  <View className="mt-3">
                    <Button
                      title={editHook.isUpdatingName ? 'Saving…' : 'Save Name'}
                      onPress={handleSaveTripName}
                      variant="primary"
                      size="small"
                      loading={editHook.isUpdatingName}
                      disabled={editHook.isUpdatingName}
                      testID="save-trip-name-button"
                    />
                  </View>
                </View>

                {/* Existing legs */}
                {trip.legs.length > 0 && (
                  <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Destinations</Text>
                    {trip.legs
                      .sort((a, b) => a.order - b.order)
                      .map(leg => (
                        <View
                          key={leg.id}
                          className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700"
                        >
                          <View className="flex-1">
                            <Text className="text-base font-medium text-gray-900 dark:text-white">
                              {SUPPORTED_COUNTRIES.find(c => c.code === leg.destinationCountry)?.name ?? leg.destinationCountry}
                            </Text>
                            <Text className="text-sm text-gray-600 dark:text-gray-400">{leg.arrivalDate}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => editHook.startEditLeg(leg)}
                            className="bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg ml-3"
                            activeOpacity={0.7}
                            testID={`edit-leg-${leg.id}-button`}
                          >
                            <Text className="text-blue-600 dark:text-blue-400 font-medium text-sm">Edit</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                )}

                {/* Add destination shortcut */}
                <TouchableOpacity
                  onPress={() => {
                    setShowEditModal(false);
                    setTimeout(() => {
                      editHook.startAddDestination();
                      setShowAddModal(true);
                    }, 300);
                  }}
                  className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex-row items-center"
                  activeOpacity={0.7}
                  testID="edit-modal-add-destination"
                >
                  <Plus size={20} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text className="text-blue-600 dark:text-blue-400 font-medium">Add New Destination</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Destination Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseAddModal}
        testID="add-destination-modal"
      >
        <KeyboardAvoidingView
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal header */}
          <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
            <TouchableOpacity onPress={handleCloseAddModal} activeOpacity={0.7} testID="add-modal-cancel">
              <Text className="text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text
              ref={addModalTitleRef}
              className="text-lg font-bold text-gray-900 dark:text-white"
              accessibilityRole="header"
            >
              Add Destination
            </Text>
            <TouchableOpacity
              onPress={handleConfirmAddDestination}
              activeOpacity={0.7}
              testID="confirm-add-destination-button"
              disabled={editHook.isAddingDestination}
            >
              <Text className="text-blue-600 dark:text-blue-400 font-medium">
                {editHook.isAddingDestination ? 'Adding…' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            {editHook.newLegData && (
              <LegFormSection
                legData={editHook.newLegData}
                onUpdateField={editHook.updateNewLegField}
                onAddressChange={editHook.updateNewLegAddress}
                errors={editHook.errors}
                testIDPrefix="new-leg"
                travelers={editHook.familyMembers}
                onToggleTraveler={editHook.handleNewLegTravelerToggle}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

// ── LegPassportWarning component ─────────────────────────────────────────────
// Wraps usePassportValidity (a hook) so it can be called inside LegFormSection.
// Hooks cannot be called inside plain functions — they must live at the top
// level of a function component.

function LegPassportWarning({
  countryCode,
  departureDate,
  testID,
}: {
  countryCode: string;
  departureDate?: string | undefined;
  testID?: string;
}) {
  const warningData = usePassportValidity({ countryCode, departureDate });
  if (!warningData) return null;
  return (
    <PassportValidityWarning
      status={warningData.status}
      countryName={warningData.countryName}
      requiredMonths={warningData.requiredMonths}
      passportExpiry={warningData.passportExpiry}
      {...(testID !== undefined ? { testID } : {})}
    />
  );
}

// ── LegFormSection component ─────────────────────────────────────────────────
// Renders the common leg form fields (country, dates, flight, accommodation).
// Kept here (not in components/) because it's tightly coupled to the edit flow.

interface LegFormSectionProps {
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
    assignedTravelers?: string[];
  };
  onUpdateField: (field: string, value: string) => void;
  onAddressChange?: (address: Address) => void;
  errors: Record<string, string>;
  testIDPrefix: string;
  travelers?: FamilyMember[];
  onToggleTraveler?: (travelerId: string) => void;
}

function LegFormSection({ legData, onUpdateField, onAddressChange, errors, testIDPrefix, travelers, onToggleTraveler }: LegFormSectionProps) {
  return (
    <View className="p-4">
      {/* Country */}
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Country</Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_COUNTRIES.map(country => (
            <TouchableOpacity
              key={country.code}
              onPress={() => onUpdateField('destinationCountry', country.code)}
              className={`px-3 py-2 rounded-lg border ${
                legData.destinationCountry === country.code
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`}
              activeOpacity={0.7}
              testID={`${testIDPrefix}-country-${country.code}`}
            >
              <Text
                className={`font-medium text-sm ${
                  legData.destinationCountry === country.code ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {country.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.country && <Text className="text-red-500 text-sm mt-2">{errors.country}</Text>}
      </View>

      {/* Passport validity warning — shown when the selected country's requirements are not met */}
      {legData.destinationCountry ? (
        <LegPassportWarning
          countryCode={legData.destinationCountry}
          departureDate={legData.departureDate || undefined}
          testID={`${testIDPrefix}-passport-validity-warning`}
        />
      ) : null}

      {/* Dates */}
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Dates</Text>
        <View className="flex-row space-x-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arrival Date *</Text>
            <DatePickerField
              value={legData.arrivalDate}
              onChange={date => onUpdateField('arrivalDate', date)}
              placeholder="Arrival date"
              error={errors.arrivalDate}
              testID={`${testIDPrefix}-arrival-date`}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departure Date</Text>
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
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Flight (Optional)</Text>
        <View className="flex-row space-x-3 mb-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flight Number</Text>
            <Input
              value={legData.flightNumber}
              onChangeText={text => onUpdateField('flightNumber', text)}
              placeholder="e.g., NH123"
              autoCapitalize="characters"
              testID={`${testIDPrefix}-flight-number`}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Airline Code</Text>
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
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arrival Airport</Text>
          <SearchableSelect
            value={legData.arrivalAirport}
            onValueChange={val => onUpdateField('arrivalAirport', val)}
            options={ALL_AIRPORTS}
            placeholder="Search airport..."
            testID={`${testIDPrefix}-arrival-airport`}
          />
        </View>
      </View>

      {/* Travelers */}
      {travelers && travelers.length > 0 && onToggleTraveler && (
        <TravelerSelector
          travelers={travelers}
          selectedTravelerIds={legData.assignedTravelers ?? []}
          onToggleTraveler={onToggleTraveler}
          title="Who is traveling to this destination?"
          subtitle="Select which family members will visit this country."
          showCompact={true}
          minSelection={1}
        />
      )}

      {/* Accommodation */}
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Accommodation *</Text>
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</Text>
            <Input
              value={legData.accommodation.name}
              onChangeText={text => onUpdateField('accommodation.name', text)}
              placeholder="e.g., Park Hyatt Tokyo"
              testID={`${testIDPrefix}-accommodation-name`}
            />
            {errors.accommodationName && (
              <Text className="text-red-500 text-sm mt-1">{errors.accommodationName}</Text>
            )}
          </View>
          <AddressAutocomplete
            value={legData.accommodation.address}
            onAddressChange={addr => onAddressChange?.(addr)}
            testID={`${testIDPrefix}-accommodation-address`}
          />
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (Optional)</Text>
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
