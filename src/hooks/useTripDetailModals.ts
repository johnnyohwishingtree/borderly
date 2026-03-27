import { useState } from 'react';
import { useAccessibilityFocus } from './useAccessibilityFocus';

interface UseTripDetailModalsOptions {
  editHook: {
    legEdit: { cancelEditLeg: () => void };
    addDestination: {
      startAddDestination: () => void;
      cancelAddDestination: () => void;
      handleAddDestination: () => Promise<boolean>;
    };
  };
  resetDuplicateError: () => void;
  handleConfirmDuplicate: (newDepartureDate: string) => Promise<{ id: string } | null>;
  handleSaveAsTemplate: (name: string) => Promise<boolean | undefined>;
  navigateToTrip: (tripId: string) => void;
}

export function useTripDetailModals({
  editHook,
  resetDuplicateError,
  handleConfirmDuplicate,
  handleSaveAsTemplate,
  navigateToTrip,
}: UseTripDetailModalsOptions) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

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
      navigateToTrip(newTrip.id);
    }
  };

  const handleOpenAddDestination = () => {
    editHook.addDestination.startAddDestination();
    setShowAddModal(true);
  };

  const handleCloseEditModal = () => {
    editHook.legEdit.cancelEditLeg();
    setShowEditModal(false);
    setTimeout(focusEditTrigger, 100);
  };

  const handleCloseAddModal = () => {
    editHook.addDestination.cancelAddDestination();
    setShowAddModal(false);
    setTimeout(focusAddTrigger, 100);
  };

  const handleConfirmAddDestination = async () => {
    const added = await editHook.addDestination.handleAddDestination();
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

  return {
    showEditModal,
    setShowEditModal,
    showAddModal,
    showSaveTemplateModal,
    setShowSaveTemplateModal,
    showDuplicateModal,
    editTriggerRef,
    addTriggerRef,
    duplicateTriggerRef,
    editModalTitleRef,
    addModalTitleRef,
    handleOpenDuplicateModal,
    handleCloseDuplicateModal,
    handleDuplicateConfirm,
    handleOpenAddDestination,
    handleCloseEditModal,
    handleCloseAddModal,
    handleConfirmAddDestination,
    onSaveAsTemplate,
  };
}
