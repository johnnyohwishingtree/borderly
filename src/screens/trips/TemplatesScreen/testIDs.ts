export const TEMPLATES_IDS = {
  renameTemplateField: { id: 'rename-template-field', type: 'TextInput' as const },
  renameModalCancel: { id: 'rename-modal-cancel', type: 'button' as const },
  renameModalConfirm: { id: 'rename-modal-confirm', type: 'button' as const },
  renameTemplateModal: { id: 'rename-template-modal', type: 'Modal' as const },
  renameTemplateButton: { id: 'rename-template-${id}', type: 'button' as const, dynamic: true as const },
  deleteTemplateButton: { id: 'delete-template-${id}', type: 'button' as const, dynamic: true as const },
  useTemplateButton: { id: 'use-template-${id}', type: 'button' as const, dynamic: true as const },
  templatesList: { id: 'templates-list', type: 'FlatList' as const },
};
