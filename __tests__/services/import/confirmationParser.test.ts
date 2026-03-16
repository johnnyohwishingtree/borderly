import {
  parseConfirmationText,
  parseDate,
} from '../../../src/services/import/confirmationParser';

describe('parseDate', () => {
  it('parses ISO 8601 dates', () => {
    expect(parseDate('2025-03-15')).toBe('2025-03-15');
  });

  it('parses "March 15, 2025"', () => {
    expect(parseDate('March 15, 2025')).toBe('2025-03-15');
  });

  it('parses "Mar 15, 2025" (abbreviated)', () => {
    expect(parseDate('Mar 15, 2025')).toBe('2025-03-15');
  });

  it('parses "15 March 2025" (day-first)', () => {
    expect(parseDate('15 March 2025')).toBe('2025-03-15');
  });

  it('parses "03/15/2025" (US format)', () => {
    expect(parseDate('03/15/2025')).toBe('2025-03-15');
  });

  it('returns null for garbage input', () => {
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('parseConfirmationText — flights', () => {
  it('extracts a single flight number with airline', () => {
    const result = parseConfirmationText(
      'Your flight NH101 departs on March 15, 2025.'
    );
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0]).toMatchObject({
      flightNumber: 'NH101',
      airlineCode: 'NH',
      airlineName: 'All Nippon Airways',
    });
  });

  it('extracts flight date from nearby context', () => {
    const result = parseConfirmationText(
      'Flight NH101 on March 15, 2025 from LAX to NRT'
    );
    expect(result.flights[0].flightDate).toBe('2025-03-15');
  });

  it('extracts route with arrow notation', () => {
    const result = parseConfirmationText(
      'Flight NH101 LAX → NRT March 15, 2025'
    );
    const flight = result.flights[0];
    expect(flight.departureAirport).toBe('LAX');
    expect(flight.arrivalAirport).toBe('NRT');
    expect(flight.departureCity).toBe('Los Angeles');
    expect(flight.arrivalCity).toBe('Tokyo');
    expect(flight.destinationCountry).toBe('JPN');
  });

  it('extracts route with "to" keyword', () => {
    const result = parseConfirmationText(
      'Your SQ12 flight SFO to SIN departing July 1, 2025'
    );
    const flight = result.flights[0];
    expect(flight.departureAirport).toBe('SFO');
    expect(flight.arrivalAirport).toBe('SIN');
  });

  it('extracts multiple flights', () => {
    const text = `
      Outbound: NH101 LAX → NRT March 15, 2025
      Return: NH102 NRT → LAX March 22, 2025
    `;
    const result = parseConfirmationText(text);
    expect(result.flights).toHaveLength(2);
    expect(result.flights[0].flightNumber).toBe('NH101');
    expect(result.flights[1].flightNumber).toBe('NH102');
  });

  it('deduplicates repeated flight numbers', () => {
    const text = 'Flight NH101 confirmed. Reminder: your flight NH101 departs tomorrow.';
    const result = parseConfirmationText(text);
    expect(result.flights).toHaveLength(1);
  });

  it('ignores non-airline 2-letter codes', () => {
    // "AB123" — AB is not in our airline database
    const result = parseConfirmationText('Reference AB123 for your booking');
    expect(result.flights).toHaveLength(0);
  });

  it('handles flight number with space', () => {
    const result = parseConfirmationText('Flight JL 723 confirmed');
    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].flightNumber).toBe('JL723');
  });
});

describe('parseConfirmationText — hotels', () => {
  it('extracts hotel name from "Hotel:" label', () => {
    const result = parseConfirmationText('Hotel: Hilton Tokyo\nCheck-in: March 15, 2025');
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0].name).toBe('Hilton Tokyo');
  });

  it('extracts hotel name from "Your stay at" pattern', () => {
    const result = parseConfirmationText(
      'Your stay at Park Hyatt Tokyo\nCheck-in: March 15, 2025'
    );
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0].name).toBe('Park Hyatt Tokyo');
  });

  it('extracts hotel name ending with Hotel/Resort', () => {
    const result = parseConfirmationText(
      'Booking confirmed for Mandarin Oriental Hotel\nCheck-in: 2025-03-15'
    );
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0].name).toBe('Mandarin Oriental Hotel');
  });

  it('extracts check-in and check-out dates', () => {
    const text = `
      Hotel: Tokyo Inn
      Check-in: March 15, 2025
      Check-out: March 20, 2025
    `;
    const result = parseConfirmationText(text);
    expect(result.hotels[0].checkInDate).toBe('2025-03-15');
    expect(result.hotels[0].checkOutDate).toBe('2025-03-20');
  });

  it('extracts booking reference', () => {
    const text = `
      Hotel: Tokyo Inn
      Confirmation Number: ABC123DEF
    `;
    const result = parseConfirmationText(text);
    expect(result.hotels[0].bookingReference).toBe('ABC123DEF');
  });

  it('extracts phone number', () => {
    const text = `
      Hotel: Tokyo Inn
      Phone: +81-3-1234-5678
    `;
    const result = parseConfirmationText(text);
    expect(result.hotels[0].phone).toBe('+81-3-1234-5678');
  });

  it('returns empty hotels when no hotel pattern found', () => {
    const result = parseConfirmationText('Flight NH101 confirmed for March 15');
    expect(result.hotels).toHaveLength(0);
  });
});

describe('parseConfirmationText — combined', () => {
  it('extracts both flight and hotel from a full confirmation', () => {
    const text = `
      Booking Confirmation

      Flight: NH101
      Route: LAX → NRT
      Date: March 15, 2025

      Hotel: Park Hyatt Tokyo
      Check-in: March 15, 2025
      Check-out: March 20, 2025
      Confirmation Number: PHT-789456
      Phone: +81-3-5323-3333
    `;
    const result = parseConfirmationText(text);

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].flightNumber).toBe('NH101');
    expect(result.flights[0].departureAirport).toBe('LAX');
    expect(result.flights[0].arrivalAirport).toBe('NRT');

    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0].name).toBe('Park Hyatt Tokyo');
    expect(result.hotels[0].checkInDate).toBe('2025-03-15');
    expect(result.hotels[0].checkOutDate).toBe('2025-03-20');
    expect(result.hotels[0].bookingReference).toBe('PHT-789456');
    expect(result.hotels[0].phone).toBe('+81-3-5323-3333');
  });

  it('returns confidence > 0 when data is found', () => {
    const result = parseConfirmationText('Flight NH101 to NRT on March 15, 2025');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns confidence 0 when no data found', () => {
    const result = parseConfirmationText('This is just random text with no travel info.');
    expect(result.confidence).toBe(0);
  });

  it('preserves raw text', () => {
    const input = 'Flight NH101';
    const result = parseConfirmationText(input);
    expect(result.rawText).toBe(input);
  });
});
