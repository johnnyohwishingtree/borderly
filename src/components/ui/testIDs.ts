export const APP_LOCK_SCREEN_IDS = {
  container: { id: 'app-lock-screen', type: 'container' as const },
};

export const ADDRESS_AUTOCOMPLETE_IDS = {
  line1: { id: 'address-line1', type: 'Input' as const },
  line2: { id: 'address-line2', type: 'Input' as const },
  city: { id: 'address-city', type: 'Input' as const },
  state: { id: 'address-state', type: 'Input' as const },
  postalCode: { id: 'address-postal-code', type: 'Input' as const },
  country: { id: 'address-country', type: 'Input' as const },
  suggestions: { id: 'address-suggestions', type: 'container' as const },
  suggestion: (placeId: string) => ({ id: `suggestion-${placeId}`, type: 'button' as const }),
};

export const ACCOMMODATION_AUTOCOMPLETE_IDS = {
  nameInput: { id: 'accommodation-name-input', type: 'Input' as const },
  suggestions: { id: 'accommodation-suggestions', type: 'container' as const },
  suggestion: (placeId: string) => ({ id: `accommodation-suggestion-${placeId}`, type: 'button' as const }),
};
