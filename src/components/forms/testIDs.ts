export const DYNAMIC_FORM_IDS = {
  container: { id: 'dynamic-form', type: 'container' as const },
  validationSummary: { id: 'validation-summary', type: 'container' as const },
  validateAllButton: { id: 'validate-all-button', type: 'button' as const },
};

export const FORM_FIELD_IDS = {
  field: (fieldId: string) => ({ id: `field-${fieldId}`, type: 'container' as const }),
  input: (fieldId: string) => ({ id: `input-${fieldId}`, type: 'Input' as const }),
  select: (fieldId: string) => ({ id: `select-${fieldId}`, type: 'field' as const }),
  searchableSelect: (fieldId: string) => ({ id: `searchable-select-${fieldId}`, type: 'field' as const }),
  accommodation: (fieldId: string) => ({ id: `accommodation-${fieldId}`, type: 'field' as const }),
  address: (fieldId: string) => ({ id: `address-${fieldId}`, type: 'field' as const }),
};

export const FORM_SECTION_IDS = {
  sectionHeader: (sectionId: string) => ({ id: `section-header-${sectionId}`, type: 'button' as const }),
};
