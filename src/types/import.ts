/**
 * Types for Smart Import — confirmation parsing and flight lookup
 */

export interface ParsedFlightInfo {
  flightNumber: string;
  airlineCode: string;
  airlineName?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureCity?: string;
  arrivalCity?: string;
  flightDate?: string; // ISO 8601
  destinationCountry?: string; // ISO 3166-1 alpha-3
}

export interface ParsedHotelInfo {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  checkInDate?: string; // ISO 8601
  checkOutDate?: string; // ISO 8601
  bookingReference?: string;
}

export interface ConfirmationParseResult {
  flights: ParsedFlightInfo[];
  hotels: ParsedHotelInfo[];
  rawText: string;
  confidence: number; // 0-1
}

export interface FlightLookupResult {
  success: boolean;
  flight?: ParsedFlightInfo;
  error?: string;
}
