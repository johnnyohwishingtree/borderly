import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Map, Upload, ClipboardList, Trash2, ChevronLeft, Plus } from 'lucide-react-native';
import { useTripStore } from '../../stores/useTripStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LegCard, AccountSetupChecklist } from '../../components/trips';
import { Button, StatusBadge, Input } from '../../components/ui';
import { Trip, TripLeg } from '../../types/trip';
import { FamilyMember } from '../../types/profile';
import { useEditTrip } from '../../hooks/useEditTrip';
import { SUPPORTED_COUNTRIES } from '../../constants/countries';

interface RouteParams {
  tripId: string;
}

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as RouteParams;

  const trips = useTripStore(state => state.trips);
  const { deleteTrip } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles, currentProfileId } = useProfileStore();

  // Reactively derive the trip from the store so UI updates immediately after edits
  const trip: Trip | null = useMemo(
    () => trips.find(t => t.id === tripId) ?? null,
    [trips, tripId],
  );

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load family members for traveler details
  useMemo(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editHook = useEditTrip({ trip });

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

  const handleOpenAddDestination = () => {
    editHook.startAddDestination();
    setShowAddModal(true);
  };

  const handleCloseEditModal = () => {
    editHook.cancelEditLeg();
    setShowEditModal(false);
  };

  const handleCloseAddModal = () => {
    editHook.cancelAddDestination();
    setShowAddModal(false);
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
    if (!trip || trip.legs.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = trip.legs.filter(
      leg => leg.formStatus === 'submitted' || leg.formStatus === 'ready'
    ).length;
    return { completed, total: trip.legs.length, percentage: (completed / trip.legs.length) * 100 };
  };

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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Trip not found</Text>
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
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-2">{trip.name}</Text>
              <Text className="text-base text-gray-600 mb-3">
                {trip.legs.length} destination{trip.legs.length > 1 ? 's' : ''}
              </Text>
              <StatusBadge
                status={getStatusColor(trip.status)}
                text={getStatusText(trip.status)}
                size="medium"
              />
            </View>
            <TouchableOpacity
              onPress={handleEditTrip}
              className="ml-4 p-2"
              activeOpacity={0.7}
              testID="edit-trip-button"
            >
              <Text className="text-blue-600 font-medium">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Overview */}
          {trip.legs.length > 0 && (
            <View className="bg-gray-50 rounded-lg p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700">Overall Progress</Text>
                <Text className="text-sm text-gray-600">
                  {progress.completed}/{progress.total} completed
                </Text>
              </View>
              <View className="bg-gray-200 rounded-full h-2">
                <View
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </View>
            </View>
          )}
        </View>

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
            <Text className="text-xl font-bold text-gray-900">Itinerary</Text>
            <TouchableOpacity
              onPress={handleOpenAddDestination}
              className="bg-blue-50 px-3 py-2 rounded-lg"
              activeOpacity={0.7}
              testID="add-destination-button"
            >
              <Text className="text-blue-600 font-medium text-sm">+ Add Destination</Text>
            </TouchableOpacity>
          </View>

          {trip.legs.length === 0 ? (
            <View className="bg-white rounded-lg p-6 items-center">
              <Map size={40} color="#6b7280" style={{ marginBottom: 12 }} />
              <Text className="text-lg font-semibold text-gray-900 mb-2">No destinations yet</Text>
              <Text className="text-base text-gray-600 text-center mb-4">
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
                    />
                    {index < trip.legs.length - 1 && (
                      <View className="absolute left-8 top-20 w-0.5 h-4 bg-gray-300 z-10" />
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="px-4 pb-8">
          <View className="bg-white rounded-lg p-4 space-y-3">
            <TouchableOpacity
              onPress={() => Alert.alert('Export', 'Export functionality coming soon')}
              className="flex-row items-center py-3 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <Upload size={28} color="#374151" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-gray-900">Export Trip</Text>
                <Text className="text-sm text-gray-600">Save your trip data</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Share', 'Share functionality coming soon')}
              className="flex-row items-center py-3 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <ClipboardList size={28} color="#374151" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-gray-900">Share Itinerary</Text>
                <Text className="text-sm text-gray-600">Copy trip details</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteTrip}
              className="flex-row items-center py-3"
              activeOpacity={0.7}
            >
              <Trash2 size={28} color="#dc2626" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-red-600">Delete Trip</Text>
                <Text className="text-sm text-gray-600">Remove this trip permanently</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Edit Trip Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseEditModal}
        testID="edit-trip-modal"
      >
        <KeyboardAvoidingView
          className="flex-1 bg-gray-50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal header */}
          <View className="bg-white px-4 pt-6 pb-4 border-b border-gray-100 flex-row items-center justify-between">
            {editHook.editingLegId ? (
              <TouchableOpacity onPress={editHook.cancelEditLeg} activeOpacity={0.7}>
                <ChevronLeft size={24} color="#2563eb" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCloseEditModal} activeOpacity={0.7} testID="edit-modal-cancel">
                <Text className="text-blue-600 font-medium">Cancel</Text>
              </TouchableOpacity>
            )}
            <Text className="text-lg font-bold text-gray-900">
              {editHook.editingLegId ? 'Edit Destination' : 'Edit Trip'}
            </Text>
            {editHook.editingLegId ? (
              <TouchableOpacity
                onPress={handleSaveLeg}
                activeOpacity={0.7}
                testID="save-leg-button"
                disabled={editHook.isUpdatingLeg}
              >
                <Text className="text-blue-600 font-medium">
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
                errors={editHook.errors}
                testIDPrefix="edit-leg"
              />
            ) : (
              /* ── Edit trip name + list of legs ── */
              <View className="p-4">
                {/* Trip name */}
                <View className="bg-white rounded-lg p-4 mb-4">
                  <Text className="text-base font-semibold text-gray-900 mb-3">Trip Name</Text>
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
                  <View className="bg-white rounded-lg p-4 mb-4">
                    <Text className="text-base font-semibold text-gray-900 mb-3">Destinations</Text>
                    {trip.legs
                      .sort((a, b) => a.order - b.order)
                      .map(leg => (
                        <View
                          key={leg.id}
                          className="flex-row items-center justify-between py-3 border-b border-gray-100"
                        >
                          <View className="flex-1">
                            <Text className="text-base font-medium text-gray-900">
                              {SUPPORTED_COUNTRIES.find(c => c.code === leg.destinationCountry)?.name ?? leg.destinationCountry}
                            </Text>
                            <Text className="text-sm text-gray-600">{leg.arrivalDate}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => editHook.startEditLeg(leg)}
                            className="bg-blue-50 px-3 py-1.5 rounded-lg ml-3"
                            activeOpacity={0.7}
                            testID={`edit-leg-${leg.id}-button`}
                          >
                            <Text className="text-blue-600 font-medium text-sm">Edit</Text>
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
                  className="bg-blue-50 rounded-lg p-4 flex-row items-center"
                  activeOpacity={0.7}
                  testID="edit-modal-add-destination"
                >
                  <Plus size={20} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text className="text-blue-600 font-medium">Add New Destination</Text>
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
          className="flex-1 bg-gray-50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal header */}
          <View className="bg-white px-4 pt-6 pb-4 border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity onPress={handleCloseAddModal} activeOpacity={0.7} testID="add-modal-cancel">
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Add Destination</Text>
            <TouchableOpacity
              onPress={handleConfirmAddDestination}
              activeOpacity={0.7}
              testID="confirm-add-destination-button"
              disabled={editHook.isAddingDestination}
            >
              <Text className="text-blue-600 font-medium">
                {editHook.isAddingDestination ? 'Adding…' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            {editHook.newLegData && (
              <LegFormSection
                legData={editHook.newLegData}
                onUpdateField={editHook.updateNewLegField}
                errors={editHook.errors}
                testIDPrefix="new-leg"
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  };
  onUpdateField: (field: string, value: string) => void;
  errors: Record<string, string>;
  testIDPrefix: string;
}

function LegFormSection({ legData, onUpdateField, errors, testIDPrefix }: LegFormSectionProps) {
  return (
    <View className="p-4">
      {/* Country */}
      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">Country</Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPPORTED_COUNTRIES.map(country => (
            <TouchableOpacity
              key={country.code}
              onPress={() => onUpdateField('destinationCountry', country.code)}
              className={`px-3 py-2 rounded-lg border ${
                legData.destinationCountry === country.code
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300'
              }`}
              activeOpacity={0.7}
              testID={`${testIDPrefix}-country-${country.code}`}
            >
              <Text
                className={`font-medium text-sm ${
                  legData.destinationCountry === country.code ? 'text-white' : 'text-gray-700'
                }`}
              >
                {country.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.country && <Text className="text-red-500 text-sm mt-2">{errors.country}</Text>}
      </View>

      {/* Dates */}
      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">Dates</Text>
        <View className="flex-row space-x-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1">Arrival Date *</Text>
            <Input
              value={legData.arrivalDate}
              onChangeText={text => onUpdateField('arrivalDate', text)}
              placeholder="YYYY-MM-DD"
              testID={`${testIDPrefix}-arrival-date`}
            />
            {errors.arrivalDate && <Text className="text-red-500 text-sm mt-1">{errors.arrivalDate}</Text>}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1">Departure Date</Text>
            <Input
              value={legData.departureDate}
              onChangeText={text => onUpdateField('departureDate', text)}
              placeholder="YYYY-MM-DD"
              testID={`${testIDPrefix}-departure-date`}
            />
          </View>
        </View>
      </View>

      {/* Flight */}
      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">Flight (Optional)</Text>
        <View className="flex-row space-x-3 mb-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1">Flight Number</Text>
            <Input
              value={legData.flightNumber}
              onChangeText={text => onUpdateField('flightNumber', text)}
              placeholder="e.g., NH123"
              autoCapitalize="characters"
              testID={`${testIDPrefix}-flight-number`}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1">Airline Code</Text>
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
          <Text className="text-sm font-medium text-gray-700 mb-1">Arrival Airport</Text>
          <Input
            value={legData.arrivalAirport}
            onChangeText={text => onUpdateField('arrivalAirport', text)}
            placeholder="e.g., NRT"
            autoCapitalize="characters"
            testID={`${testIDPrefix}-arrival-airport`}
          />
        </View>
      </View>

      {/* Accommodation */}
      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">Accommodation *</Text>
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Name</Text>
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
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Address</Text>
            <Input
              value={legData.accommodation.address.line1}
              onChangeText={text => onUpdateField('accommodation.address.line1', text)}
              placeholder="Street address"
              testID={`${testIDPrefix}-accommodation-address`}
            />
          </View>
          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">City</Text>
              <Input
                value={legData.accommodation.address.city}
                onChangeText={text => onUpdateField('accommodation.address.city', text)}
                placeholder="City"
                testID={`${testIDPrefix}-accommodation-city`}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Postal Code</Text>
              <Input
                value={legData.accommodation.address.postalCode}
                onChangeText={text => onUpdateField('accommodation.address.postalCode', text)}
                placeholder="Postal code"
                testID={`${testIDPrefix}-accommodation-postal`}
              />
            </View>
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Phone (Optional)</Text>
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
