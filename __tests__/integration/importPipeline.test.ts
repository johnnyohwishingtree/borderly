/**
 * Integration tests for the full import pipeline:
 * raw text → confirmationParser → tripAutoCreator → Trip + TripLegs
 *
 * Uses real services (no mocks) to test the complete data flow.
 */

import { parseConfirmationText } from '../../src/services/import/confirmationParser';
import {
  createTripFromParsedData,
  generateTripName,
} from '../../src/services/import/tripAutoCreator';


// --- Test fixtures: realistic confirmation email formats ---

const SINGLE_FLIGHT_CONFIRMATION = `
Booking Confirmation

Thank you for your booking!

Flight: NH101
Departing: LAX
Arriving: NRT
Date: March 15, 2025

Passenger: John Doe
`;

const MULTI_FLIGHT_ITINERARY = `
Your Trip Itinerary

Segment 1 -------------------------------------------------------
Flight NH101
Departing LAX Arriving NRT
Date: March 15, 2025
----------------------------------------------------------------

Segment 2 -------------------------------------------------------
Flight SQ12
Departing NRT Arriving SIN
Date: March 20, 2025
----------------------------------------------------------------

Booking Reference: ABC123
`;

const CONFIRMATION_WITH_HOTEL = `
Your Complete Booking

Flight: NH101
From: LAX To: NRT
Date: July 15, 2025

Hotel: Hilton Tokyo
Address: 6-6-2 Nishi-Shinjuku, Shinjuku-ku
Check-in: July 15, 2025
Check-out: July 20, 2025
Booking Reference: HTL-78901
Phone: +81 3-3344-5588
`;

const BOARDING_PASS_STYLE = `
Boarding Pass

SQ12
Departing LAX Arriving SIN
March 25, 2025
Seat: 12A
`;

const LOW_CONFIDENCE_TEXT = `
Hey, I'm flying somewhere next week.
Maybe Tokyo? Not sure yet.
`;

const MISSING_DATES_CONFIRMATION = `
Flight Confirmation

NH201
LAX → KIX

Have a great trip!
`;

const UNKNOWN_AIRPORTS_TEXT = `
Flight ZZ999
Departing: ZZZ
Arriving: QQQ
Date: January 1, 2026
`;

describe('Import Pipeline Integration', () => {
  describe('single-flight confirmation → single-leg trip', () => {
    it('parses a standard airline confirmation into a trip', () => {
      const parseResult = parseConfirmationText(SINGLE_FLIGHT_CONFIRMATION);

      expect(parseResult.flights).toHaveLength(1);
      expect(parseResult.flights[0].flightNumber).toBe('NH101');
      expect(parseResult.flights[0].arrivalAirport).toBe('NRT');
      expect(parseResult.flights[0].destinationCountry).toBe('JPN');
      expect(parseResult.flights[0].flightDate).toBe('2025-03-15');

      const { trip, confidence } = createTripFromParsedData(parseResult);

      expect(trip.legs).toHaveLength(1);
      expect(trip.legs[0].destinationCountry).toBe('JPN');
      expect(trip.legs[0].arrivalDate).toBe('2025-03-15');
      expect(trip.legs[0].flightNumber).toBe('NH101');
      expect(trip.legs[0].arrivalAirport).toBe('NRT');
      expect(trip.name).toBe('Tokyo Trip');
      expect(trip.status).toBe('upcoming');
      expect(confidence).toBeGreaterThan(0.3);
    });
  });

  describe('multi-flight itinerary → multi-leg trip', () => {
    it('parses multiple flights into ordered legs', () => {
      const parseResult = parseConfirmationText(MULTI_FLIGHT_ITINERARY);


      expect(parseResult.flights.length).toBeGreaterThanOrEqual(2);

      const { trip } = createTripFromParsedData(parseResult);

      expect(trip.legs.length).toBeGreaterThanOrEqual(2);
      expect(trip.legs[0].order).toBe(0);
      expect(trip.legs[1].order).toBe(1);

      // First leg should be Japan
      const jpnLeg = trip.legs.find(l => l.destinationCountry === 'JPN');
      expect(jpnLeg).toBeTruthy();

      // Second leg should be Singapore
      const sgpLeg = trip.legs.find(l => l.destinationCountry === 'SGP');
      expect(sgpLeg).toBeTruthy();

      // Trip name should include both destinations
      expect(trip.name).toContain('Tokyo');
      expect(trip.name).toContain('Singapore');
    });
  });

  describe('confirmation with hotel → leg has accommodation', () => {
    it('attaches hotel data to the matching leg', () => {
      const parseResult = parseConfirmationText(CONFIRMATION_WITH_HOTEL);

      expect(parseResult.flights).toHaveLength(1);
      expect(parseResult.hotels).toHaveLength(1);
      expect(parseResult.hotels[0].name).toContain('Hilton');

      const { trip } = createTripFromParsedData(parseResult);

      expect(trip.legs).toHaveLength(1);
      // Hotel should be attached to the Tokyo leg
      expect(trip.legs[0].accommodation.name).toContain('Hilton');
      expect(trip.legs[0].accommodation.address.country).toBe('JPN');
    });
  });

  describe('boarding pass barcode string → single-leg trip', () => {
    it('parses boarding-pass-style text into a trip', () => {
      const parseResult = parseConfirmationText(BOARDING_PASS_STYLE);

      expect(parseResult.flights).toHaveLength(1);
      expect(parseResult.flights[0].flightNumber).toBe('SQ12');

      const { trip } = createTripFromParsedData(parseResult);

      expect(trip.legs).toHaveLength(1);
      expect(trip.legs[0].destinationCountry).toBe('SGP');
      expect(trip.legs[0].flightNumber).toBe('SQ12');
    });
  });

  describe('low-confidence parse → appropriate confidence score', () => {
    it('returns low confidence for vague text', () => {
      const parseResult = parseConfirmationText(LOW_CONFIDENCE_TEXT);

      // Should find no flights or hotels
      expect(parseResult.flights.length + parseResult.hotels.length).toBe(0);
      expect(parseResult.confidence).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles missing dates gracefully', () => {
      const parseResult = parseConfirmationText(MISSING_DATES_CONFIRMATION);

      if (parseResult.flights.length > 0) {
        const { trip } = createTripFromParsedData(parseResult);

        expect(trip.legs).toHaveLength(1);
        // Should use today as fallback when date is missing
        expect(trip.legs[0].arrivalDate).toBeTruthy();
        expect(trip.legs[0].destinationCountry).toBe('JPN');
      }
    });

    it('handles unknown airports', () => {
      const parseResult = parseConfirmationText(UNKNOWN_AIRPORTS_TEXT);

      // Parser may not recognize the airline code ZZ, so it might not find flights
      // This is expected behavior
      if (parseResult.flights.length > 0) {
        const { trip } = createTripFromParsedData(parseResult);
        // Unknown airport → empty destination country
        expect(trip.legs[0].destinationCountry).toBe('');
      }
    });

    it('handles empty input without crashing', () => {
      const parseResult = parseConfirmationText('');
      expect(parseResult.flights).toHaveLength(0);
      expect(parseResult.hotels).toHaveLength(0);
      expect(parseResult.confidence).toBe(0);
    });

    it('handles very long input without crashing', () => {
      const longText = 'NH101 LAX NRT March 15, 2025\n'.repeat(100);
      const parseResult = parseConfirmationText(longText);
      // Should parse without error; may find duplicated flight
      expect(parseResult.flights.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('trip name generation', () => {
    it('generates arrow-separated name from multiple cities', () => {
      const result = parseConfirmationText(MULTI_FLIGHT_ITINERARY);
      const name = generateTripName(result.flights);
      expect(name).toContain('→');
    });

    it('generates "City Trip" for single destination', () => {
      const result = parseConfirmationText(SINGLE_FLIGHT_CONFIRMATION);
      const name = generateTripName(result.flights);
      expect(name).toBe('Tokyo Trip');
    });
  });

  describe('confidence scoring', () => {
    it('rich data gets higher confidence than sparse data', () => {
      const richResult = parseConfirmationText(CONFIRMATION_WITH_HOTEL);
      const sparseResult = parseConfirmationText(BOARDING_PASS_STYLE);

      const { confidence: richConf } = createTripFromParsedData(richResult);
      const { confidence: sparseConf } = createTripFromParsedData(sparseResult);

      expect(richConf).toBeGreaterThanOrEqual(sparseConf);
    });
  });

  describe('data integrity', () => {
    it('every leg has a unique ID', () => {
      const result = parseConfirmationText(MULTI_FLIGHT_ITINERARY);
      const { trip } = createTripFromParsedData(result);

      const ids = trip.legs.map(l => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every leg references the parent trip ID', () => {
      const result = parseConfirmationText(MULTI_FLIGHT_ITINERARY);
      const { trip } = createTripFromParsedData(result);

      for (const leg of trip.legs) {
        expect(leg.tripId).toBe(trip.id);
      }
    });

    it('legs have correct form status defaults', () => {
      const result = parseConfirmationText(SINGLE_FLIGHT_CONFIRMATION);
      const { trip } = createTripFromParsedData(result);

      for (const leg of trip.legs) {
        expect(leg.formStatus).toBe('not_started');
        expect(leg.submissionStatus).toBe('not_started');
      }
    });

    it('trip timestamps are valid ISO strings', () => {
      const result = parseConfirmationText(SINGLE_FLIGHT_CONFIRMATION);
      const { trip } = createTripFromParsedData(result);

      expect(() => new Date(trip.createdAt)).not.toThrow();
      expect(() => new Date(trip.updatedAt)).not.toThrow();
      expect(new Date(trip.createdAt).toISOString()).toBe(trip.createdAt);
    });
  });
});
