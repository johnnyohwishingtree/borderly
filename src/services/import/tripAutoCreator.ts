/**
 * Trip Auto-Creator
 *
 * Converts a ConfirmationParseResult (from confirmationParser) into a draft
 * Trip with TripLeg objects. Resolves airport codes to countries via
 * airportLookup, attaches parsed hotel info to matching legs, and generates
 * a human-readable trip name from the destinations.
 *
 * Returns a draft Trip (not persisted) — the caller saves it to the store.
 */

import type {
  ConfirmationParseResult,
  ParsedFlightInfo,
  ParsedHotelInfo,
} from '../../types/import';
import type { Trip, TripLeg, Accommodation } from '../../types/trip';
import type { Address } from '../../types/profile';
import { lookupAirport, getCountryFromAirport } from '../boarding/airportLookup';

export interface DraftTripResult {
  trip: Trip;
  confidence: number; // 0-1, indicating data completeness
}

function generateId(): string {
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build a draft Trip from parsed confirmation data.
 *
 * Each ParsedFlightInfo becomes a TripLeg. Hotels are matched to legs by
 * arrival city. The trip is returned as a draft — not yet saved.
 */
export function createTripFromParsedData(
  result: ConfirmationParseResult
): DraftTripResult {
  const tripId = generateId();
  const now = new Date().toISOString();

  const legs = result.flights.map((flight, index) =>
    createLegFromFlight(flight, tripId, index)
  );

  attachHotelsToLegs(legs, result.hotels);

  const name = generateTripName(result.flights);
  const confidence = computeDraftConfidence(legs, result.confidence);

  const trip: Trip = {
    id: tripId,
    name,
    status: 'upcoming',
    legs,
    createdAt: now,
    updatedAt: now,
  };

  return { trip, confidence };
}

function createLegFromFlight(
  flight: ParsedFlightInfo,
  tripId: string,
  order: number
): TripLeg {
  const destinationCountry = resolveDestinationCountry(flight);
  const arrivalDate = flight.flightDate ?? new Date().toISOString().slice(0, 10);

  const leg: TripLeg = {
    id: generateId(),
    tripId,
    destinationCountry,
    arrivalDate,
    flightNumber: flight.flightNumber,
    airlineCode: flight.airlineCode,
    accommodation: emptyAccommodation(),
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order,
  };

  if (flight.arrivalAirport) {
    leg.arrivalAirport = flight.arrivalAirport;
  }

  return leg;
}

/**
 * Resolve the destination country from flight data.
 * Priority: flight.destinationCountry > airport lookup > empty string.
 */
function resolveDestinationCountry(flight: ParsedFlightInfo): string {
  if (flight.destinationCountry) return flight.destinationCountry;
  if (flight.arrivalAirport) {
    const country = getCountryFromAirport(flight.arrivalAirport);
    if (country) return country;
  }
  return '';
}

function emptyAccommodation(): Accommodation {
  const address: Address = {
    line1: '',
    city: '',
    postalCode: '',
    country: '',
  };
  return { name: '', address };
}

/**
 * Match parsed hotels to legs by comparing the hotel's city to each leg's
 * arrival city (looked up from the arrival airport code).
 */
function attachHotelsToLegs(
  legs: TripLeg[],
  hotels: ParsedHotelInfo[]
): void {
  for (const hotel of hotels) {
    const matchingLeg = findLegForHotel(legs, hotel);
    if (matchingLeg) {
      matchingLeg.accommodation = hotelToAccommodation(hotel, matchingLeg.destinationCountry);
    }
  }
}

function findLegForHotel(
  legs: TripLeg[],
  hotel: ParsedHotelInfo
): TripLeg | undefined {
  if (!hotel.city) return legs[0]; // Default to first leg if no city

  const hotelCity = hotel.city.toLowerCase();

  for (const leg of legs) {
    if (!leg.arrivalAirport) continue;
    const airportInfo = lookupAirport(leg.arrivalAirport);
    if (airportInfo && airportInfo.city.toLowerCase() === hotelCity) {
      return leg;
    }
  }

  // No match by city — default to first leg
  return legs[0];
}

function hotelToAccommodation(
  hotel: ParsedHotelInfo,
  countryCode: string
): Accommodation {
  const address: Address = {
    line1: hotel.address ?? '',
    city: hotel.city ?? '',
    postalCode: hotel.postalCode ?? '',
    country: countryCode,
  };

  const accommodation: Accommodation = {
    name: hotel.name,
    address,
  };

  if (hotel.phone) {
    accommodation.phone = hotel.phone;
  }
  if (hotel.bookingReference) {
    accommodation.bookingReference = hotel.bookingReference;
  }

  return accommodation;
}

/**
 * Generate a trip name from the flight destinations.
 * e.g., "Tokyo → Singapore → Home" or "Tokyo Trip"
 */
export function generateTripName(flights: ParsedFlightInfo[]): string {
  if (flights.length === 0) return 'Imported Trip';

  const cities = flights
    .map(f => {
      if (f.arrivalCity) return f.arrivalCity;
      if (f.arrivalAirport) {
        const info = lookupAirport(f.arrivalAirport);
        if (info) return info.city;
      }
      return null;
    })
    .filter((city): city is string => city !== null);

  // Deduplicate consecutive cities
  const uniqueCities: string[] = [];
  for (const city of cities) {
    if (uniqueCities.length === 0 || uniqueCities[uniqueCities.length - 1] !== city) {
      uniqueCities.push(city);
    }
  }

  if (uniqueCities.length === 0) return 'Imported Trip';
  if (uniqueCities.length === 1) return `${uniqueCities[0]} Trip`;
  return uniqueCities.join(' → ');
}

/**
 * Compute confidence for the draft trip based on data completeness.
 * Factors: parse confidence, legs with countries, legs with dates, accommodation.
 */
function computeDraftConfidence(
  legs: TripLeg[],
  parseConfidence: number
): number {
  if (legs.length === 0) return 0;

  let score = parseConfidence * 0.5; // Parse quality is half the score

  const legsWithCountry = legs.filter(l => l.destinationCountry !== '').length;
  const legsWithDate = legs.filter(l => l.arrivalDate !== new Date().toISOString().slice(0, 10)).length;
  const legsWithAccommodation = legs.filter(l => l.accommodation.name !== '').length;

  score += (legsWithCountry / legs.length) * 0.25;
  score += (legsWithDate / legs.length) * 0.15;
  score += (legsWithAccommodation / legs.length) * 0.1;

  return Math.min(1, Math.round(score * 100) / 100);
}
