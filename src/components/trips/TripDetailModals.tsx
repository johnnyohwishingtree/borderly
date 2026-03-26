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
  editingLegId: string | null;
  editLegData: any;
  editName: string;
  setEditName: (name: string) => void;
  errors: Record<string, string>;
  isUpdatingName: boolean;
  isUpdatingLeg: boolean;
  isAddingDestination: boolean;
  newLegData: any;
  cancelEditLeg: () => void;
  startEditLeg: (leg: TripLeg) => void;
  startAddDestination: () => void;
  updateEditLegField: (field: string, value: string) => void;
  updateEditLegAddress: (address: any) => void;
  updateNewLegField: (field: string, value: string) => void;
  updateNewLegAddress: (address: any) => void;
  handleUpdateTripName: () => Promise<boolean>;
  handleSaveLeg: () => Promise<boolean>;
  handleAddDestination: () => Promise<boolean>;
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
    await editHook.handleSaveLeg();
  };

  const handleSaveTripName = async () => {
    await editHook.handleUpdateTripName();
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
          {editHook.editingLegId ? (
            <TouchableOpacity onPress={editHook.cancelEditLeg} activeOpacity={0.7}>
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
            <View className="w-[50px]" />
          )}
        </View>

        <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          {editHook.editingLegId && editHook.editLegData ? (
            <LegFormSection
              legData={editHook.editLegData}
              onUpdateField={editHook.updateEditLegField}
              onAddressChange={editHook.updateEditLegAddress}
              errors={editHook.errors}
              testIDPrefix="edit-leg"
            />
          ) : (
            <View className="p-4">
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
  editHook: Pick<EditHookShape, 'isAddingDestination' | 'newLegData' | 'updateNewLegField' | 'updateNewLegAddress' | 'errors'>;
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
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
