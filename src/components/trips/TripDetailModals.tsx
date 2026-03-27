/**
 * TripDetailModals — Edit Trip and Add Destination modals.
 *
 * Extracted from TripDetailScreen to keep the screen under 500 lines.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import type { TripLeg } from '@/types/trip';
import LegFormSection from './LegFormSection';

interface EditHookShape {
  tripName: {
    editName: string;
    setEditName: (name: string) => void;
    isUpdatingName: boolean;
    handleUpdateTripName: () => Promise<boolean>;
  };
  legEdit: {
    editingLegId: string | null;
    editLegData: any;
    isUpdatingLeg: boolean;
    startEditLeg: (leg: TripLeg) => void;
    cancelEditLeg: () => void;
    updateEditLegField: (field: string, value: string) => void;
    updateEditLegAddress: (address: any) => void;
    handleSaveLeg: () => Promise<boolean>;
  };
  addDestination: {
    newLegData: any;
    isAddingDestination: boolean;
    startAddDestination: () => void;
    updateNewLegField: (field: string, value: string) => void;
    updateNewLegAddress: (address: any) => void;
    handleAddDestination: () => Promise<boolean>;
  };
  errors: Record<string, string>;
}

// ── Edit Trip Modal ─────────────────────────────────────────────────────────

export interface EditTripModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToAdd: () => void;
  editHook: EditHookShape;
  legs: TripLeg[];
  editModalTitleRef: any;
}

export function EditTripModal({
  visible,
  onClose,
  onSwitchToAdd,
  editHook,
  legs,
  editModalTitleRef,
}: EditTripModalProps) {
  const handleSaveLeg = async () => {
    await editHook.legEdit.handleSaveLeg();
  };

  const handleSaveTripName = async () => {
    await editHook.tripName.handleUpdateTripName();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="edit-trip-modal"
    >
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
          {editHook.legEdit.editingLegId ? (
            <TouchableOpacity onPress={editHook.legEdit.cancelEditLeg} activeOpacity={0.7}>
              <ChevronLeft size={24} color="#2563eb" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} testID="edit-modal-cancel">
              <Text className="text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
            </TouchableOpacity>
          )}
          <Text
            ref={editModalTitleRef}
            className="text-lg font-bold text-gray-900 dark:text-white"
            accessibilityRole="header"
          >
            {editHook.legEdit.editingLegId ? 'Edit Destination' : 'Edit Trip'}
          </Text>
          {editHook.legEdit.editingLegId ? (
            <TouchableOpacity
              onPress={handleSaveLeg}
              activeOpacity={0.7}
              testID="save-leg-button"
              disabled={editHook.legEdit.isUpdatingLeg}
            >
              <Text className="text-blue-600 dark:text-blue-400 font-medium">
                {editHook.legEdit.isUpdatingLeg ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="w-[50px]" />
          )}
        </View>

        <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          {editHook.legEdit.editingLegId && editHook.legEdit.editLegData ? (
            <LegFormSection
              legData={editHook.legEdit.editLegData}
              onUpdateField={editHook.legEdit.updateEditLegField}
              onAddressChange={editHook.legEdit.updateEditLegAddress}
              errors={editHook.errors}
              testIDPrefix="edit-leg"
            />
          ) : (
            <View className="p-4">
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Trip Name</Text>
                <Input
                  value={editHook.tripName.editName}
                  onChangeText={editHook.tripName.setEditName}
                  placeholder="e.g., Asia Summer 2025"
                  error={editHook.errors.name}
                  testID="edit-trip-name-field"
                />
                <View className="mt-3">
                  <Button
                    title={editHook.tripName.isUpdatingName ? 'Saving…' : 'Save Name'}
                    onPress={handleSaveTripName}
                    variant="primary"
                    size="small"
                    loading={editHook.tripName.isUpdatingName}
                    disabled={editHook.tripName.isUpdatingName}
                    testID="save-trip-name-button"
                  />
                </View>
              </View>

              {legs.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Destinations</Text>
                  {legs
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
                          onPress={() => editHook.legEdit.startEditLeg(leg)}
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

              <TouchableOpacity
                onPress={onSwitchToAdd}
                className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex-row items-center"
                activeOpacity={0.7}
                testID="edit-modal-add-destination"
              >
                <Plus size={20} color="#2563eb" className="mr-2" />
                <Text className="text-blue-600 dark:text-blue-400 font-medium">Add New Destination</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add Destination Modal ───────────────────────────────────────────────────

export interface AddDestinationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  editHook: Pick<EditHookShape, 'addDestination' | 'errors'>;
  addModalTitleRef: any;
}

export function AddDestinationModal({
  visible,
  onClose,
  onConfirm,
  editHook,
  addModalTitleRef,
}: AddDestinationModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="add-destination-modal"
    >
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} testID="add-modal-cancel">
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
            onPress={onConfirm}
            activeOpacity={0.7}
            testID="confirm-add-destination-button"
            disabled={editHook.addDestination.isAddingDestination}
          >
            <Text className="text-blue-600 dark:text-blue-400 font-medium">
              {editHook.addDestination.isAddingDestination ? 'Adding…' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          {editHook.addDestination.newLegData && (
            <LegFormSection
              legData={editHook.addDestination.newLegData}
              onUpdateField={editHook.addDestination.updateNewLegField}
              onAddressChange={editHook.addDestination.updateNewLegAddress}
              errors={editHook.errors}
              testIDPrefix="new-leg"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
