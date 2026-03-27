export const ADD_COMPANIONS_IDS = {
  addCompanionButton: { id: 'add-companion-button', type: 'button' as const },
  companionsContinueButton: { id: 'companions-continue-button', type: 'button' as const },
  relationshipPickerCloseButton: { id: 'relationship-picker-close-button', type: 'button' as const },
  relationshipPickerModal: { id: 'relationship-picker-modal', type: 'Modal' as const },
  addCompanionsTitle: { id: 'add-companions-title', type: 'text' as const },
  addCompanionsSubtitle: { id: 'add-companions-subtitle', type: 'text' as const },
  companionItem: { id: 'companion-item', type: 'view' as const, dynamic: 'companion-item-{id}' },
  benefitsSection: { id: 'benefits-section', type: 'view' as const },
  relationshipPickerBackdrop: { id: 'relationship-picker-backdrop', type: 'button' as const },
  relationshipPickerTitle: { id: 'relationship-picker-title', type: 'text' as const },
  relationshipOption: { id: 'relationship-option', type: 'button' as const, dynamic: 'relationship-option-{value}' },
};
