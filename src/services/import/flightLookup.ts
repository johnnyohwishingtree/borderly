/**
 * Flight Number Lookup Service
 *
 * Takes a flight number (e.g., "NH101") and optional date, returns structured
 * flight data using the bundled airport and airline databases.
 *
 * No external API calls — all data is resolved client-side.
 */

import { lookupAirline, extractAirlineCode } from './airlineDatabase';
import { lookupAirport, isSupportedDestination, getCountryFromAirport } from '../boarding/airportLookup';
import type { FlightLookupResult, ParsedFlightInfo } from '../../types/import';

/**
 * Look up a flight by its flight number and optional date.
 *
 * Resolves the airline code to a name and validates the format.
 * Airport codes must be provided separately (flight numbers don't encode routes).
 */
export function lookupFlight(
  flightNumber: string,
  options?: {
    date?: string; // ISO 8601 date
    arrivalAirport?: string; // IATA 3-letter code
    departureAirport?: string; // IATA 3-letter code
  }
): FlightLookupResult {
  const trimmed = flightNumber.trim().toUpperCase();

  if (!trimmed) {
    return { success: false, error: 'Flight number is required' };
  }

  // Extract airline code
  const airlineCode = extractAirlineCode(trimmed);
  if (!airlineCode) {
    return {
      success: false,
      error: 'Invalid flight number format. Expected format: NH101, JL723, SQ12',
    };
  }

  // Validate flight number has digits
  const numericMatch = trimmed.match(/^[A-Z]{2}\s*(\d+)/);
  if (!numericMatch) {
    return {
      success: false,
      error: 'Flight number must include digits (e.g., NH101)',
    };
  }

  // Look up airline
  const airline = lookupAirline(airlineCode);

  // Normalize flight number (remove spaces)
  const normalizedFlightNumber = trimmed.replace(/\s+/g, '');

  const flight: ParsedFlightInfo = {
    flightNumber: normalizedFlightNumber,
    airlineCode,
    ...(airline?.name ? { airlineName: airline.name } : {}),
  };

  // Resolve arrival airport if provided
  if (options?.arrivalAirport) {
    const arrivalInfo = lookupAirport(options.arrivalAirport);
    if (arrivalInfo) {
      flight.arrivalAirport = arrivalInfo.code;
      flight.arrivalCity = arrivalInfo.city;
      flight.destinationCountry = arrivalInfo.country;
    } else {
      flight.arrivalAirport = options.arrivalAirport.toUpperCase();
    }
  }

  // Resolve departure airport if provided
  if (options?.departureAirport) {
    const departureInfo = lookupAirport(options.departureAirport);
    if (departureInfo) {
      flight.departureAirport = departureInfo.code;
      flight.departureCity = departureInfo.city;
    } else {
      flight.departureAirport = options.departureAirport.toUpperCase();
    }
  }

  // Add date if provided
  if (options?.date) {
    flight.flightDate = options.date;
  }

  return { success: true, flight };
}

/**
 * Check if a flight's destination is a supported country
 */
export function isFlightToSupportedCountry(flight: ParsedFlightInfo): boolean {
  if (!flight.arrivalAirport) return false;
  return isSupportedDestination(flight.arrivalAirport);
}

/**
 * Get the destination country name for a flight
 */
export function getFlightDestinationCountry(flight: ParsedFlightInfo): string | null {
  if (!flight.arrivalAirport) return null;
  return getCountryFromAirport(flight.arrivalAirport);
}
