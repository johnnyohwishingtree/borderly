import { VALIDATION_PATTERNS } from '../../../src/utils/validation/patterns';

// ---------------------------------------------------------------------------
// passport patterns
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.passport', () => {
  describe('default', () => {
    it('matches alphanumeric 6-char string', () => {
      expect(VALIDATION_PATTERNS.passport.default.test('AB1234')).toBe(true);
    });

    it('matches alphanumeric 9-char string', () => {
      expect(VALIDATION_PATTERNS.passport.default.test('ABC123456')).toBe(true);
    });

    it('rejects 5-char string', () => {
      expect(VALIDATION_PATTERNS.passport.default.test('AB123')).toBe(false);
    });

    it('rejects 10-char string', () => {
      expect(VALIDATION_PATTERNS.passport.default.test('AB12345678')).toBe(false);
    });

    it('rejects lowercase', () => {
      expect(VALIDATION_PATTERNS.passport.default.test('ab1234')).toBe(false);
    });
  });

  describe('US', () => {
    it('matches 9-digit number', () => {
      expect(VALIDATION_PATTERNS.passport.US.test('123456789')).toBe(true);
    });

    it('rejects 8-digit number', () => {
      expect(VALIDATION_PATTERNS.passport.US.test('12345678')).toBe(false);
    });

    it('rejects letters', () => {
      expect(VALIDATION_PATTERNS.passport.US.test('12345678A')).toBe(false);
    });
  });

  describe('UK', () => {
    it('matches 9-digit number', () => {
      expect(VALIDATION_PATTERNS.passport.UK.test('987654321')).toBe(true);
    });

    it('rejects letters', () => {
      expect(VALIDATION_PATTERNS.passport.UK.test('A87654321')).toBe(false);
    });
  });

  describe('EU', () => {
    it('matches 2 letters + 6 alphanumeric', () => {
      expect(VALIDATION_PATTERNS.passport.EU.test('DE123456')).toBe(true);
    });

    it('matches 2 letters + 7 alphanumeric', () => {
      expect(VALIDATION_PATTERNS.passport.EU.test('FR1234567')).toBe(true);
    });

    it('rejects 1 letter prefix', () => {
      expect(VALIDATION_PATTERNS.passport.EU.test('D1234567')).toBe(false);
    });

    it('rejects all digits', () => {
      expect(VALIDATION_PATTERNS.passport.EU.test('12345678')).toBe(false);
    });
  });

  describe('asia', () => {
    it('matches 1 letter + 7 digits', () => {
      expect(VALIDATION_PATTERNS.passport.asia.test('T1234567')).toBe(true);
    });

    it('matches 2 letters + 7 digits', () => {
      expect(VALIDATION_PATTERNS.passport.asia.test('TK1234567')).toBe(true);
    });

    it('matches 1 letter + 8 digits', () => {
      expect(VALIDATION_PATTERNS.passport.asia.test('M12345678')).toBe(true);
    });

    it('rejects all digits', () => {
      expect(VALIDATION_PATTERNS.passport.asia.test('12345678')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// email pattern
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.email', () => {
  it('matches standard email', () => {
    expect(VALIDATION_PATTERNS.email.test('user@example.com')).toBe(true);
  });

  it('matches email with plus', () => {
    expect(VALIDATION_PATTERNS.email.test('user+tag@example.com')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(VALIDATION_PATTERNS.email.test('userexample.com')).toBe(false);
  });

  it('rejects missing TLD', () => {
    expect(VALIDATION_PATTERNS.email.test('user@example')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// phone patterns
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.phone', () => {
  describe('international', () => {
    it('matches +81901234567', () => {
      expect(VALIDATION_PATTERNS.phone.international.test('+81901234567')).toBe(true);
    });

    it('matches +1234567890', () => {
      expect(VALIDATION_PATTERNS.phone.international.test('+1234567890')).toBe(true);
    });

    it('rejects leading +0', () => {
      expect(VALIDATION_PATTERNS.phone.international.test('+0123456789')).toBe(false);
    });

    it('rejects no plus', () => {
      expect(VALIDATION_PATTERNS.phone.international.test('81901234567')).toBe(false);
    });
  });

  describe('us', () => {
    it('matches plain 10 digits', () => {
      expect(VALIDATION_PATTERNS.phone.us.test('2025551234')).toBe(true);
    });

    it('matches with +1 prefix', () => {
      expect(VALIDATION_PATTERNS.phone.us.test('+12025551234')).toBe(true);
    });

    it('matches formatted (202)555-1234', () => {
      expect(VALIDATION_PATTERNS.phone.us.test('(202)555-1234')).toBe(true);
    });

    it('rejects too few digits', () => {
      expect(VALIDATION_PATTERNS.phone.us.test('20255512')).toBe(false);
    });
  });

  describe('general', () => {
    it('matches 7-digit number', () => {
      expect(VALIDATION_PATTERNS.phone.general.test('1234567')).toBe(true);
    });

    it('matches number with dashes', () => {
      expect(VALIDATION_PATTERNS.phone.general.test('123-456-7890')).toBe(true);
    });

    it('rejects too short (6 chars)', () => {
      expect(VALIDATION_PATTERNS.phone.general.test('123456')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// flightNumber pattern
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.flightNumber', () => {
  it('matches AA123', () => {
    expect(VALIDATION_PATTERNS.flightNumber.test('AA123')).toBe(true);
  });

  it('matches ANA1234', () => {
    expect(VALIDATION_PATTERNS.flightNumber.test('ANA1234')).toBe(true);
  });

  it('matches with trailing letter (BA123A)', () => {
    expect(VALIDATION_PATTERNS.flightNumber.test('BA123A')).toBe(true);
  });

  it('rejects no letter prefix', () => {
    expect(VALIDATION_PATTERNS.flightNumber.test('12345')).toBe(false);
  });

  it('rejects single letter prefix', () => {
    expect(VALIDATION_PATTERNS.flightNumber.test('A123')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// airlineCode patterns
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.airlineCode', () => {
  it('iata matches 2 uppercase letters', () => {
    expect(VALIDATION_PATTERNS.airlineCode.iata.test('AA')).toBe(true);
  });

  it('iata rejects 3 letters', () => {
    expect(VALIDATION_PATTERNS.airlineCode.iata.test('ANA')).toBe(false);
  });

  it('icao matches 3 uppercase letters', () => {
    expect(VALIDATION_PATTERNS.airlineCode.icao.test('ANA')).toBe(true);
  });

  it('icao rejects 2 letters', () => {
    expect(VALIDATION_PATTERNS.airlineCode.icao.test('AA')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// airportCode pattern
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.airportCode', () => {
  it('matches LAX', () => {
    expect(VALIDATION_PATTERNS.airportCode.test('LAX')).toBe(true);
  });

  it('rejects 4 letters (RJTT)', () => {
    expect(VALIDATION_PATTERNS.airportCode.test('RJTT')).toBe(false);
  });

  it('rejects digits', () => {
    expect(VALIDATION_PATTERNS.airportCode.test('L4X')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// postalCode patterns
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.postalCode', () => {
  describe('us', () => {
    it('matches 5-digit zip', () => {
      expect(VALIDATION_PATTERNS.postalCode.us.test('90210')).toBe(true);
    });

    it('matches ZIP+4', () => {
      expect(VALIDATION_PATTERNS.postalCode.us.test('90210-1234')).toBe(true);
    });

    it('rejects letters', () => {
      expect(VALIDATION_PATTERNS.postalCode.us.test('9021A')).toBe(false);
    });
  });

  describe('uk', () => {
    it('matches SW1A 1AA', () => {
      expect(VALIDATION_PATTERNS.postalCode.uk.test('SW1A 1AA')).toBe(true);
    });

    it('matches M1 1AA', () => {
      expect(VALIDATION_PATTERNS.postalCode.uk.test('M1 1AA')).toBe(true);
    });

    it('rejects all digits', () => {
      expect(VALIDATION_PATTERNS.postalCode.uk.test('12345')).toBe(false);
    });
  });

  describe('canada', () => {
    it('matches K1A 0B1', () => {
      expect(VALIDATION_PATTERNS.postalCode.canada.test('K1A 0B1')).toBe(true);
    });

    it('matches without space K1A0B1', () => {
      expect(VALIDATION_PATTERNS.postalCode.canada.test('K1A0B1')).toBe(true);
    });

    it('rejects all digits', () => {
      expect(VALIDATION_PATTERNS.postalCode.canada.test('123456')).toBe(false);
    });
  });

  describe('general', () => {
    it('matches 100-0001 (JPN style)', () => {
      expect(VALIDATION_PATTERNS.postalCode.general.test('100-0001')).toBe(true);
    });

    it('rejects too short', () => {
      expect(VALIDATION_PATTERNS.postalCode.general.test('AB')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// countryCode patterns
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.countryCode', () => {
  it('iso2 matches US', () => {
    expect(VALIDATION_PATTERNS.countryCode.iso2.test('US')).toBe(true);
  });

  it('iso2 rejects USA', () => {
    expect(VALIDATION_PATTERNS.countryCode.iso2.test('USA')).toBe(false);
  });

  it('iso3 matches USA', () => {
    expect(VALIDATION_PATTERNS.countryCode.iso3.test('USA')).toBe(true);
  });

  it('iso3 rejects US', () => {
    expect(VALIDATION_PATTERNS.countryCode.iso3.test('US')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// currencyCode pattern
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.currencyCode', () => {
  it('matches USD', () => {
    expect(VALIDATION_PATTERNS.currencyCode.test('USD')).toBe(true);
  });

  it('matches JPY', () => {
    expect(VALIDATION_PATTERNS.currencyCode.test('JPY')).toBe(true);
  });

  it('rejects lowercase', () => {
    expect(VALIDATION_PATTERNS.currencyCode.test('usd')).toBe(false);
  });

  it('rejects 2-letter code', () => {
    expect(VALIDATION_PATTERNS.currencyCode.test('US')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// uuid pattern
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.uuid', () => {
  it('matches valid v4 UUID', () => {
    expect(VALIDATION_PATTERNS.uuid.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects missing hyphens', () => {
    expect(VALIDATION_PATTERNS.uuid.test('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// creditCard pattern
// ---------------------------------------------------------------------------
describe('VALIDATION_PATTERNS.creditCard', () => {
  it('matches 16-digit card number', () => {
    expect(VALIDATION_PATTERNS.creditCard.test('4111111111111111')).toBe(true);
  });

  it('matches 13-digit card number', () => {
    expect(VALIDATION_PATTERNS.creditCard.test('4111111111111')).toBe(true);
  });

  it('rejects 12-digit number', () => {
    expect(VALIDATION_PATTERNS.creditCard.test('411111111111')).toBe(false);
  });

  it('rejects letters', () => {
    expect(VALIDATION_PATTERNS.creditCard.test('411111111111111A')).toBe(false);
  });
});
