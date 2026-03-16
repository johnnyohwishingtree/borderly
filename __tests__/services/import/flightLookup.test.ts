import { lookupFlight, isFlightToSupportedCountry, getFlightDestinationCountry } from '../../../src/services/import/flightLookup';
import type { ParsedFlightInfo } from '../../../src/types/import';

describe('lookupFlight', () => {
  it('resolves a valid flight number with airline name', () => {
    const result = lookupFlight('NH101');
    expect(result.success).toBe(true);
    expect(result.flight).toMatchObject({
      flightNumber: 'NH101',
      airlineCode: 'NH',
      airlineName: 'All Nippon Airways',
    });
  });

  it('handles spaces in flight number', () => {
    const result = lookupFlight('JL 723');
    expect(result.success).toBe(true);
    expect(result.flight?.flightNumber).toBe('JL723');
    expect(result.flight?.airlineName).toBe('Japan Airlines');
  });

  it('is case-insensitive', () => {
    const result = lookupFlight('sq12');
    expect(result.success).toBe(true);
    expect(result.flight?.airlineCode).toBe('SQ');
    expect(result.flight?.airlineName).toBe('Singapore Airlines');
  });

  it('returns error for empty input', () => {
    const result = lookupFlight('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('returns error for invalid format (no digits)', () => {
    const result = lookupFlight('NH');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid flight number format');
  });

  it('returns error for invalid format (no airline code)', () => {
    const result = lookupFlight('12345');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid flight number format');
  });

  it('resolves unknown airline code but valid format', () => {
    const result = lookupFlight('ZZ999');
    expect(result.success).toBe(true);
    expect(result.flight?.airlineCode).toBe('ZZ');
    expect(result.flight?.airlineName).toBeUndefined();
  });

  it('resolves arrival airport info', () => {
    const result = lookupFlight('NH101', { arrivalAirport: 'NRT' });
    expect(result.success).toBe(true);
    expect(result.flight?.arrivalAirport).toBe('NRT');
    expect(result.flight?.arrivalCity).toBe('Tokyo');
    expect(result.flight?.destinationCountry).toBe('JPN');
  });

  it('resolves departure airport info', () => {
    const result = lookupFlight('NH101', { departureAirport: 'LAX' });
    expect(result.success).toBe(true);
    expect(result.flight?.departureAirport).toBe('LAX');
    expect(result.flight?.departureCity).toBe('Los Angeles');
  });

  it('passes through unknown airport codes in uppercase', () => {
    const result = lookupFlight('NH101', { arrivalAirport: 'xyz' });
    expect(result.flight?.arrivalAirport).toBe('XYZ');
    expect(result.flight?.arrivalCity).toBeUndefined();
  });

  it('includes date when provided', () => {
    const result = lookupFlight('NH101', { date: '2025-07-15' });
    expect(result.flight?.flightDate).toBe('2025-07-15');
  });
});

describe('isFlightToSupportedCountry', () => {
  it('returns true for flight to Japan', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'NH101',
      airlineCode: 'NH',
      arrivalAirport: 'NRT',
    };
    expect(isFlightToSupportedCountry(flight)).toBe(true);
  });

  it('returns true for flight to Malaysia', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'MH1',
      airlineCode: 'MH',
      arrivalAirport: 'KUL',
    };
    expect(isFlightToSupportedCountry(flight)).toBe(true);
  });

  it('returns true for flight to Singapore', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'SQ12',
      airlineCode: 'SQ',
      arrivalAirport: 'SIN',
    };
    expect(isFlightToSupportedCountry(flight)).toBe(true);
  });

  it('returns false for flight to unsupported country', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'AF100',
      airlineCode: 'AF',
      arrivalAirport: 'CDG', // France — not in supported countries
    };
    expect(isFlightToSupportedCountry(flight)).toBe(false);
  });

  it('returns false when no arrival airport', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'NH101',
      airlineCode: 'NH',
    };
    expect(isFlightToSupportedCountry(flight)).toBe(false);
  });
});

describe('getFlightDestinationCountry', () => {
  it('returns country code for known airport', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'NH101',
      airlineCode: 'NH',
      arrivalAirport: 'NRT',
    };
    expect(getFlightDestinationCountry(flight)).toBe('JPN');
  });

  it('returns null when no arrival airport', () => {
    const flight: ParsedFlightInfo = {
      flightNumber: 'NH101',
      airlineCode: 'NH',
    };
    expect(getFlightDestinationCountry(flight)).toBeNull();
  });
});
