import { ALL_AIRLINES, getAirlineByCode, getAirlineLabel } from '../../src/constants/airlines';

// ---------------------------------------------------------------------------
// Simulate the SearchableSelect filter algorithm for unit testing search
// without relying on FlatList rendering (FlatList is mocked in tests).
// ---------------------------------------------------------------------------

function filterAirlines(query: string): { value: string; label: string }[] {
  if (!query.trim()) return ALL_AIRLINES;
  const q = query.toLowerCase();
  return ALL_AIRLINES.filter(
    o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Airline database unit tests
// ---------------------------------------------------------------------------

describe('ALL_AIRLINES database', () => {
  it('contains at least 150 airlines', () => {
    expect(ALL_AIRLINES.length).toBeGreaterThan(150);
  });

  it('every entry has a non-empty value (IATA code) and label', () => {
    ALL_AIRLINES.forEach(airline => {
      expect(airline.value.trim()).not.toBe('');
      expect(airline.label.trim()).not.toBe('');
    });
  });

  it('IATA code appears inside the label so search-by-code works', () => {
    ALL_AIRLINES.forEach(airline => {
      expect(airline.label).toContain(`(${airline.value})`);
    });
  });

  it('has no duplicate IATA codes', () => {
    const codes = ALL_AIRLINES.map(a => a.value);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('includes major airlines for supported destinations (Japan)', () => {
    const codes = new Set(ALL_AIRLINES.map(a => a.value));
    expect(codes.has('NH')).toBe(true); // All Nippon Airways
    expect(codes.has('JL')).toBe(true); // Japan Airlines
    expect(codes.has('MM')).toBe(true); // Peach Aviation
  });

  it('includes major airlines for supported destinations (Malaysia)', () => {
    const codes = new Set(ALL_AIRLINES.map(a => a.value));
    expect(codes.has('MH')).toBe(true); // Malaysia Airlines
    expect(codes.has('AK')).toBe(true); // AirAsia
    expect(codes.has('D7')).toBe(true); // AirAsia X
  });

  it('includes major airlines for supported destinations (Singapore)', () => {
    const codes = new Set(ALL_AIRLINES.map(a => a.value));
    expect(codes.has('SQ')).toBe(true); // Singapore Airlines
    expect(codes.has('TR')).toBe(true); // Scoot
  });

  it('includes major global carriers', () => {
    const codes = new Set(ALL_AIRLINES.map(a => a.value));
    expect(codes.has('EK')).toBe(true); // Emirates
    expect(codes.has('QR')).toBe(true); // Qatar Airways
    expect(codes.has('BA')).toBe(true); // British Airways
    expect(codes.has('LH')).toBe(true); // Lufthansa
    expect(codes.has('QF')).toBe(true); // Qantas
    expect(codes.has('AA')).toBe(true); // American Airlines
    expect(codes.has('DL')).toBe(true); // Delta Air Lines
    expect(codes.has('UA')).toBe(true); // United Airlines
    expect(codes.has('CX')).toBe(true); // Cathay Pacific
    expect(codes.has('KE')).toBe(true); // Korean Air
  });
});

// ---------------------------------------------------------------------------
// Airline search / filter logic
// ---------------------------------------------------------------------------

describe('airline search logic', () => {
  it('returns all airlines when query is empty', () => {
    expect(filterAirlines('').length).toBe(ALL_AIRLINES.length);
  });

  it('finds Singapore Airlines by IATA code (SQ)', () => {
    const results = filterAirlines('SQ');
    expect(results.some(a => a.value === 'SQ')).toBe(true);
  });

  it('finds Singapore Airlines by lowercase iata code (sq)', () => {
    const results = filterAirlines('sq');
    expect(results.some(a => a.value === 'SQ')).toBe(true);
  });

  it('finds Singapore Airlines by name', () => {
    const results = filterAirlines('singapore');
    expect(results.some(a => a.value === 'SQ')).toBe(true);
  });

  it('finds All Nippon Airways by IATA code (NH)', () => {
    const results = filterAirlines('NH');
    expect(results.some(a => a.value === 'NH')).toBe(true);
  });

  it('finds All Nippon Airways by name', () => {
    const results = filterAirlines('nippon');
    expect(results.some(a => a.value === 'NH')).toBe(true);
  });

  it('finds Japan Airlines by name', () => {
    const results = filterAirlines('japan');
    expect(results.some(a => a.value === 'JL')).toBe(true);
  });

  it('finds Emirates by name', () => {
    const results = filterAirlines('emirates');
    expect(results.some(a => a.value === 'EK')).toBe(true);
  });

  it('finds Malaysia Airlines by name', () => {
    const results = filterAirlines('malaysia');
    expect(results.some(a => a.value === 'MH')).toBe(true);
  });

  it('finds AirAsia by name', () => {
    const results = filterAirlines('airasia');
    expect(results.some(a => a.value === 'AK')).toBe(true);
  });

  it('finds Qantas by IATA code (QF)', () => {
    const results = filterAirlines('QF');
    expect(results.some(a => a.value === 'QF')).toBe(true);
  });

  it('returns empty array for a nonsense query', () => {
    expect(filterAirlines('XXXXXXXXXX').length).toBe(0);
  });

  it('partial matching works — "air" returns multiple airlines with air in name', () => {
    const results = filterAirlines('air');
    expect(results.length).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// getAirlineByCode helper
// ---------------------------------------------------------------------------

describe('getAirlineByCode', () => {
  it('returns the airline for Singapore Airlines (SQ)', () => {
    const airline = getAirlineByCode('SQ');
    expect(airline).toBeDefined();
    expect(airline?.value).toBe('SQ');
    expect(airline?.label).toContain('Singapore');
    expect(airline?.label).toContain('SQ');
  });

  it('returns the airline for All Nippon Airways (NH)', () => {
    const airline = getAirlineByCode('NH');
    expect(airline).toBeDefined();
    expect(airline?.label).toContain('Nippon');
    expect(airline?.label).toContain('NH');
  });

  it('returns the airline for Emirates (EK)', () => {
    const airline = getAirlineByCode('EK');
    expect(airline).toBeDefined();
    expect(airline?.label).toContain('Emirates');
  });

  it('returns undefined for an unknown code', () => {
    expect(getAirlineByCode('ZZ')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAirlineLabel helper
// ---------------------------------------------------------------------------

describe('getAirlineLabel', () => {
  it('returns a human-readable label for Singapore Airlines', () => {
    const label = getAirlineLabel('SQ');
    expect(label).toContain('Singapore');
    expect(label).toContain('SQ');
  });

  it('returns a label for Malaysia Airlines', () => {
    const label = getAirlineLabel('MH');
    expect(label).toContain('Malaysia');
    expect(label).toContain('MH');
  });

  it('falls back to the raw code for an unknown IATA code', () => {
    expect(getAirlineLabel('ZZ')).toBe('ZZ');
  });
});
