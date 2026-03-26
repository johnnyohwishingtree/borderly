/**
 * Validation utilities barrel export
 */

export { VALIDATION_PATTERNS } from './patterns';
export { validatePassportNumber, validateFlightNumber, validateAirlineCode, validateAirportCode, validateTravelName, validateOccupation } from './travelValidators';
export { validateEmail, validatePhoneNumber } from './contactValidators';
export { validatePostalCode, validateCountryCode } from './addressValidators';
export { isRequired } from './commonValidators';
