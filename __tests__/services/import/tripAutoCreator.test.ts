import {
  createTripFromParsedData,
  generateTripName,
} from '../../../src/services/import/tripAutoCreator';
import type { ConfirmationParseResult, ParsedFlightInfo } from '../../../src/types/import';

describe('tripAutoCreator', () => {
  describe('createTripFromParsedData', () => {
    it('creates a single-leg trip from a single flight', () => {
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'NH101',
            airlineCode: 'NH',
            airlineName: 'All Nippon Airways',
            departureAirport: 'LAX',
            arrivalAirport: 'NRT',
            departureCity: 'Los Angeles',
            arrivalCity: 'Tokyo',
            flightDate: '2025-07-15',
            destinationCountry: 'JPN',
          },
        ],
        hotels: [],
        rawText: 'NH101 LAX → NRT July 15, 2025',
        confidence: 0.8,
      };

      const { trip, confidence } = createTripFromParsedData(result);

      expect(trip.legs).toHaveLength(1);
      expect(trip.legs[0].destinationCountry).toBe('JPN');
      expect(trip.legs[0].arrivalDate).toBe('2025-07-15');
      expect(trip.legs[0].flightNumber).toBe('NH101');
      expect(trip.legs[0].airlineCode).toBe('NH');
      expect(trip.legs[0].arrivalAirport).toBe('NRT');
      expect(trip.legs[0].order).toBe(0);
      expect(trip.legs[0].formStatus).toBe('not_started');
      expect(trip.legs[0].submissionStatus).toBe('not_started');
      expect(trip.status).toBe('upcoming');
      expect(trip.name).toBe('Tokyo Trip');
      expect(confidence).toBeGreaterThan(0);
    });

    it('creates a multi-leg trip from multiple flights', () => {
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'NH101',
            airlineCode: 'NH',
            departureAirport: 'LAX',
            arrivalAirport: 'NRT',
            arrivalCity: 'Tokyo',
            flightDate: '2025-07-15',
            destinationCountry: 'JPN',
          },
          {
            flightNumber: 'SQ12',
            airlineCode: 'SQ',
            departureAirport: 'NRT',
            arrivalAirport: 'SIN',
            arrivalCity: 'Singapore',
            flightDate: '2025-07-20',
            destinationCountry: 'SGP',
          },
        ],
        hotels: [],
        rawText: 'multi-flight itinerary',
        confidence: 0.7,
      };

      const { trip } = createTripFromParsedData(result);

      expect(trip.legs).toHaveLength(2);
      expect(trip.legs[0].destinationCountry).toBe('JPN');
      expect(trip.legs[0].order).toBe(0);
      expect(trip.legs[1].destinationCountry).toBe('SGP');
      expect(trip.legs[1].order).toBe(1);
      expect(trip.name).toBe('Tokyo → Singapore');
    });

    it('attaches hotel info to matching leg by city', () => {
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'NH101',
            airlineCode: 'NH',
            arrivalAirport: 'NRT',
            arrivalCity: 'Tokyo',
            flightDate: '2025-07-15',
            destinationCountry: 'JPN',
          },
          {
            flightNumber: 'SQ12',
            airlineCode: 'SQ',
            arrivalAirport: 'SIN',
            arrivalCity: 'Singapore',
            flightDate: '2025-07-20',
            destinationCountry: 'SGP',
          },
        ],
        hotels: [
          {
            name: 'Marina Bay Sands',
            city: 'Singapore',
            phone: '+65-1234-5678',
            bookingReference: 'MBS12345',
          },
        ],
        rawText: 'itinerary with hotel',
        confidence: 0.85,
      };

      const { trip } = createTripFromParsedData(result);

      // Hotel should be attached to the Singapore leg (index 1)
      expect(trip.legs[1].accommodation.name).toBe('Marina Bay Sands');
      expect(trip.legs[1].accommodation.phone).toBe('+65-1234-5678');
      expect(trip.legs[1].accommodation.bookingReference).toBe('MBS12345');
      expect(trip.legs[1].accommodation.address.city).toBe('Singapore');
      expect(trip.legs[1].accommodation.address.country).toBe('SGP');

      // Tokyo leg should have empty accommodation
      expect(trip.legs[0].accommodation.name).toBe('');
    });

    it('defaults hotel to first leg when city is missing', () => {
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'NH101',
            airlineCode: 'NH',
            arrivalAirport: 'NRT',
            arrivalCity: 'Tokyo',
            flightDate: '2025-07-15',
            destinationCountry: 'JPN',
          },
        ],
        hotels: [
          {
            name: 'Mystery Hotel',
          },
        ],
        rawText: 'flight with hotel no city',
        confidence: 0.5,
      };

      const { trip } = createTripFromParsedData(result);

      expect(trip.legs[0].accommodation.name).toBe('Mystery Hotel');
    });

    it('resolves destination country from airport code when not provided', () => {
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'MH370',
            airlineCode: 'MH',
            arrivalAirport: 'KUL',
            // destinationCountry not set
          },
        ],
        hotels: [],
        rawText: 'flight to KUL',
        confidence: 0.6,
      };

      const { trip } = createTripFromParsedData(result);

      expect(trip.legs[0].destinationCountry).toBe('MYS');
    });

    it('returns empty destination country when airport is unknown', () => {
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'XX123',
            airlineCode: 'XX',
            arrivalAirport: 'ZZZ', // Unknown airport
          },
        ],
        hotels: [],
        rawText: 'flight to unknown',
        confidence: 0.3,
      };

      const { trip } = createTripFromParsedData(result);

      expect(trip.legs[0].destinationCountry).toBe('');
    });

    it('uses today as fallback when flight date is missing', () => {
      const today = new Date().toISOString().slice(0, 10);
      const result: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'NH101',
            airlineCode: 'NH',
            arrivalAirport: 'NRT',
            // flightDate not set
          },
        ],
        hotels: [],
        rawText: 'no date',
        confidence: 0.4,
      };

      const { trip } = createTripFromParsedData(result);

      expect(trip.legs[0].arrivalDate).toBe(today);
    });

    it('assigns unique IDs to trip and each leg', () => {
      const result: ConfirmationParseResult = {
        flights: [
          { flightNumber: 'NH101', airlineCode: 'NH', arrivalAirport: 'NRT' },
          { flightNumber: 'SQ12', airlineCode: 'SQ', arrivalAirport: 'SIN' },
        ],
        hotels: [],
        rawText: 'two flights',
        confidence: 0.6,
      };

      const { trip } = createTripFromParsedData(result);

      expect(typeof trip.id).toBe('string');
      expect(trip.id.length).toBeGreaterThan(0);
      expect(typeof trip.legs[0].id).toBe('string');
      expect(trip.legs[0].id.length).toBeGreaterThan(0);
      expect(typeof trip.legs[1].id).toBe('string');
      expect(trip.legs[1].id.length).toBeGreaterThan(0);
      // All IDs are unique
      const ids = [trip.id, trip.legs[0].id, trip.legs[1].id];
      expect(new Set(ids).size).toBe(3);
    });

    it('sets tripId on each leg matching the trip ID', () => {
      const result: ConfirmationParseResult = {
        flights: [
          { flightNumber: 'NH101', airlineCode: 'NH', arrivalAirport: 'NRT' },
        ],
        hotels: [],
        rawText: 'single flight',
        confidence: 0.5,
      };

      const { trip } = createTripFromParsedData(result);

      expect(trip.legs[0].tripId).toBe(trip.id);
    });

    it('returns higher confidence when more data is complete', () => {
      const sparse: ConfirmationParseResult = {
        flights: [{ flightNumber: 'NH101', airlineCode: 'NH' }],
        hotels: [],
        rawText: 'sparse',
        confidence: 0.3,
      };

      const rich: ConfirmationParseResult = {
        flights: [
          {
            flightNumber: 'NH101',
            airlineCode: 'NH',
            arrivalAirport: 'NRT',
            arrivalCity: 'Tokyo',
            flightDate: '2025-07-15',
            destinationCountry: 'JPN',
          },
        ],
        hotels: [{ name: 'Hotel Tokyo', city: 'Tokyo' }],
        rawText: 'rich',
        confidence: 0.9,
      };

      const { confidence: sparseConf } = createTripFromParsedData(sparse);
      const { confidence: richConf } = createTripFromParsedData(rich);

      expect(richConf).toBeGreaterThan(sparseConf);
    });
  });

  describe('generateTripName', () => {
    it('returns "Imported Trip" for empty flights', () => {
      expect(generateTripName([])).toBe('Imported Trip');
    });

    it('returns "City Trip" for a single flight with arrival city', () => {
      const flights: ParsedFlightInfo[] = [
        { flightNumber: 'NH101', airlineCode: 'NH', arrivalCity: 'Tokyo' },
      ];
      expect(generateTripName(flights)).toBe('Tokyo Trip');
    });

    it('generates arrow-separated name for multiple cities', () => {
      const flights: ParsedFlightInfo[] = [
        { flightNumber: 'NH101', airlineCode: 'NH', arrivalCity: 'Tokyo' },
        { flightNumber: 'SQ12', airlineCode: 'SQ', arrivalCity: 'Singapore' },
      ];
      expect(generateTripName(flights)).toBe('Tokyo → Singapore');
    });

    it('looks up city from airport code when arrivalCity is missing', () => {
      const flights: ParsedFlightInfo[] = [
        { flightNumber: 'NH101', airlineCode: 'NH', arrivalAirport: 'NRT' },
      ];
      expect(generateTripName(flights)).toBe('Tokyo Trip');
    });

    it('deduplicates consecutive same cities', () => {
      const flights: ParsedFlightInfo[] = [
        { flightNumber: 'NH101', airlineCode: 'NH', arrivalCity: 'Tokyo' },
        { flightNumber: 'NH102', airlineCode: 'NH', arrivalCity: 'Tokyo' },
        { flightNumber: 'SQ12', airlineCode: 'SQ', arrivalCity: 'Singapore' },
      ];
      expect(generateTripName(flights)).toBe('Tokyo → Singapore');
    });

    it('returns "Imported Trip" when no city info is available', () => {
      const flights: ParsedFlightInfo[] = [
        { flightNumber: 'XX123', airlineCode: 'XX' },
      ];
      expect(generateTripName(flights)).toBe('Imported Trip');
    });
  });
});
