import { validatePassportNumber } from '../../../src/utils/validation/travelValidators';
import { validateCountryCode } from '../../../src/utils/validation/addressValidators';
import { validatePhoneNumber } from '../../../src/utils/validation/contactValidators';

// ---------------------------------------------------------------------------
// Cross-validator integration: passport + country code
// ---------------------------------------------------------------------------
describe('passport + country code integration', () => {
  it('USA passport and country code both validate for same country', () => {
    const passport = validatePassportNumber('123456789', 'USA');
    const country = validateCountryCode('USA', 'iso3');
    expect(passport.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('JPN passport and country code both validate for same country', () => {
    const passport = validatePassportNumber('TK1234567', 'JPN');
    const country = validateCountryCode('JPN', 'iso3');
    expect(passport.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('GBR passport and country code both validate for same country', () => {
    const passport = validatePassportNumber('987654321', 'GBR');
    const country = validateCountryCode('GBR', 'iso3');
    expect(passport.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('EU passport and country code both validate for DEU', () => {
    const passport = validatePassportNumber('DE1234567', 'DEU');
    const country = validateCountryCode('DEU', 'iso3');
    expect(passport.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('invalid passport with valid country code detects passport error', () => {
    const passport = validatePassportNumber('INVALID', 'USA');
    const country = validateCountryCode('USA', 'iso3');
    expect(passport.isValid).toBe(false);
    expect(country.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-validator integration: phone + country
// ---------------------------------------------------------------------------
describe('phone + country integration', () => {
  it('US phone and country code both validate', () => {
    const phone = validatePhoneNumber('+12025551234', 'USA');
    const country = validateCountryCode('USA', 'iso3');
    expect(phone.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('CAN phone and country code both validate', () => {
    const phone = validatePhoneNumber('+16135551234', 'CAN');
    const country = validateCountryCode('CAN', 'iso3');
    expect(phone.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('international phone validates without country-specific format', () => {
    const phone = validatePhoneNumber('+81901234567');
    const country = validateCountryCode('JPN', 'iso3');
    expect(phone.isValid).toBe(true);
    expect(country.isValid).toBe(true);
  });

  it('invalid phone with valid country detects phone error', () => {
    const phone = validatePhoneNumber('abc', 'USA');
    const country = validateCountryCode('USA', 'iso3');
    expect(phone.isValid).toBe(false);
    expect(country.isValid).toBe(true);
  });
});
