export const DOCUMENT_VALIDITY_CARD_IDS = {
  expiryBadge: { id: 'expiry-badge', type: 'container' as const },
  countryValidity: (countryCode: string) => ({ id: `country-validity-${countryCode}`, type: 'container' as const }),
};
