/**
 * TypeScript types for IATA BCBP (Bar Coded Boarding Pass) parsing
 * 
 * BCBP standard: https://www.iata.org/en/programs/passenger/one-id/implementation-doc/
 */

export interface BCBPPassengerData {
  passengerName: string;
  fromCity: string;
  toCity: string;
  operatingCarrierDesignator: string; // IATA 2-letter airline code
  flightNumber: string;
  dateOfFlight: string; // Julian day format (DDD)
  compartmentCode: string; // Class of service
  seatNumber: string;
  checkInSequenceNumber: string;
  passengerStatus: string;
  airlineNumericCode: string;
  documentFormSerialNumber: string;
  selecteeIndicator: string;
  internationalDocumentationVerification: string;
  marketingCarrierDesignator: string;
  frequentFlyerAirlineDesignator: string;
  frequentFlyerNumber: string;
  idAdIndicator: string;
  freeBaggageAllowance: string;
  fastTrack: string;
}

export interface BCBPData {
  passengers: BCBPPassengerData[];
  formatCode: string;
  numberOfPassengers: number;
}

export interface ParsedBoardingPass {
  /** Passenger name from boarding pass */
  passengerName: string;
  /** IATA airline code (2-letter) */
  airlineCode: string;
  /** Flight number */
  flightNumber: string;
  /** Departure airport IATA code (3-letter) */
  departureAirport: string;
  /** Arrival airport IATA code (3-letter) */
  arrivalAirport: string;
  /** Flight date in ISO 8601 format */
  flightDate: string;
  /** Seat number */
  seatNumber?: string | undefined;
  /** Class of service */
  classOfService?: string | undefined;
  /** Booking reference */
  bookingReference?: string | undefined;
  /** Destination country derived from arrival airport */
  destinationCountry?: string | undefined;
}

export interface ParsedMultiLegBoardingPass {
  /** Array of parsed flight legs */
  legs: ParsedBoardingPass[];
  /** Total number of legs in the boarding pass */
  totalLegs: number;
  /** Common passenger name across all legs */
  passengerName: string;
}

export interface BCBPParseError {
  code: 'PARSE_ERROR' | 'MISSING_FIELDS';
  message: string;
  originalData?: string;
}