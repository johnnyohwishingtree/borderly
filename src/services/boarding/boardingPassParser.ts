/**
 * IATA BCBP (Bar Coded Boarding Pass) parser service
 * 
 * Wraps the 'bcbp' npm package to parse boarding pass barcodes into structured data
 * and maps the results to TripLeg fields with destination country auto-detection.
 */

import { decode } from 'bcbp';
import { 
  BCBPData, 
  ParsedBoardingPass, 
  ParsedMultiLegBoardingPass, 
  BCBPParseError 
} from '../../types/boarding';
import { getCountryFromAirport, isSupportedDestination } from './airportLookup';

/**
 * Parse BCBP barcode data into structured boarding pass information
 */
export function parseBoardingPass(
  rawBarcode: string, 
  referenceYear?: number
): ParsedBoardingPass | BCBPParseError {
  try {
    // Use current year if not provided
    const year = referenceYear || new Date().getFullYear();
    
    // Decode the BCBP barcode
    const bcbpData: BCBPData = decode(rawBarcode, year);
    
    // Validate we have passenger data
    if (!bcbpData.passengers || bcbpData.passengers.length === 0) {
      return {
        code: 'MISSING_FIELDS',
        message: 'No passenger data found in boarding pass',
        originalData: rawBarcode,
      };
    }

    // Parse the first passenger's data
    const passenger = bcbpData.passengers[0];
    
    // Validate required fields
    if (!passenger.fromCity || !passenger.toCity || !passenger.flightNumber) {
      return {
        code: 'MISSING_FIELDS',
        message: 'Missing required flight information (departure/arrival airports or flight number)',
        originalData: rawBarcode,
      };
    }

    // Convert Julian date to ISO format
    let flightDate: string;
    try {
      flightDate = convertJulianDateToISO(passenger.dateOfFlight, year);
    } catch (error) {
      return {
        code: 'PARSE_ERROR',
        message: `Invalid flight date format: ${passenger.dateOfFlight}`,
        originalData: rawBarcode,
      };
    }

    // Extract airline code (2-letter IATA code)
    const airlineCode = passenger.operatingCarrierDesignator || passenger.marketingCarrierDesignator;
    
    if (!airlineCode) {
      return {
        code: 'MISSING_FIELDS',
        message: 'Missing airline code in boarding pass',
        originalData: rawBarcode,
      };
    }

    // Parse airport codes
    const departureAirport = passenger.fromCity.toUpperCase();
    const arrivalAirport = passenger.toCity.toUpperCase();

    // Get destination country from arrival airport
    const destinationCountry = getCountryFromAirport(arrivalAirport);

    // Check if destination is supported
    if (destinationCountry && !isSupportedDestination(arrivalAirport)) {
      console.warn(`Destination airport ${arrivalAirport} (${destinationCountry}) is not in supported countries`);
    }

    const parsedPass: ParsedBoardingPass = {
      passengerName: passenger.passengerName || '',
      airlineCode,
      flightNumber: passenger.flightNumber,
      departureAirport,
      arrivalAirport,
      flightDate,
      seatNumber: passenger.seatNumber ? passenger.seatNumber : undefined,
      classOfService: passenger.compartmentCode ? passenger.compartmentCode : undefined,
      bookingReference: passenger.documentFormSerialNumber ? passenger.documentFormSerialNumber : undefined,
      destinationCountry: destinationCountry ? destinationCountry : undefined,
    };

    return parsedPass;

  } catch (error) {
    return {
      code: 'PARSE_ERROR',
      message: `Failed to parse boarding pass: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalData: rawBarcode,
    };
  }
}

/**
 * Parse multi-leg boarding pass with up to 4 flight legs
 */
export function parseMultiLegBoardingPass(
  rawBarcode: string,
  referenceYear?: number
): ParsedMultiLegBoardingPass | BCBPParseError {
  try {
    const year = referenceYear || new Date().getFullYear();
    const bcbpData: BCBPData = decode(rawBarcode, year);
    
    if (!bcbpData.passengers || bcbpData.passengers.length === 0) {
      return {
        code: 'MISSING_FIELDS',
        message: 'No passenger data found in boarding pass',
        originalData: rawBarcode,
      };
    }

    const legs: ParsedBoardingPass[] = [];
    let commonPassengerName = '';

    // Parse each passenger (leg) in the boarding pass
    for (const passenger of bcbpData.passengers) {
      // Set common passenger name from first leg
      if (!commonPassengerName) {
        commonPassengerName = passenger.passengerName || '';
      }

      // Skip legs with missing critical data
      if (!passenger.fromCity || !passenger.toCity || !passenger.flightNumber) {
        continue;
      }

      let flightDate: string;
      try {
        flightDate = convertJulianDateToISO(passenger.dateOfFlight, year);
      } catch (error) {
        // Skip legs with invalid dates
        continue;
      }

      const airlineCode = passenger.operatingCarrierDesignator || passenger.marketingCarrierDesignator;
      if (!airlineCode) {
        continue;
      }

      const departureAirport = passenger.fromCity.toUpperCase();
      const arrivalAirport = passenger.toCity.toUpperCase();
      const destinationCountry = getCountryFromAirport(arrivalAirport);

      const leg: ParsedBoardingPass = {
        passengerName: passenger.passengerName || commonPassengerName,
        airlineCode,
        flightNumber: passenger.flightNumber,
        departureAirport,
        arrivalAirport,
        flightDate,
        seatNumber: passenger.seatNumber ? passenger.seatNumber : undefined,
        classOfService: passenger.compartmentCode ? passenger.compartmentCode : undefined,
        bookingReference: passenger.documentFormSerialNumber ? passenger.documentFormSerialNumber : undefined,
        destinationCountry: destinationCountry ? destinationCountry : undefined,
      };

      legs.push(leg);
    }

    if (legs.length === 0) {
      return {
        code: 'MISSING_FIELDS',
        message: 'No valid flight legs found in boarding pass',
        originalData: rawBarcode,
      };
    }

    return {
      legs,
      totalLegs: legs.length,
      passengerName: commonPassengerName,
    };

  } catch (error) {
    return {
      code: 'PARSE_ERROR',
      message: `Failed to parse multi-leg boarding pass: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalData: rawBarcode,
    };
  }
}

/**
 * Convert Julian date (DDD format) to ISO 8601 date string
 */
function convertJulianDateToISO(julianDay: string, year: number): string {
  if (!julianDay || julianDay.length !== 3) {
    throw new Error(`Invalid Julian day format: ${julianDay}`);
  }

  const dayOfYear = parseInt(julianDay, 10);
  if (isNaN(dayOfYear) || dayOfYear < 1 || dayOfYear > 366) {
    throw new Error(`Invalid Julian day value: ${julianDay}`);
  }

  // Create date from day of year
  const date = new Date(year, 0, dayOfYear);
  
  // Check if the calculated date is valid
  if (date.getFullYear() !== year) {
    throw new Error(`Invalid date calculation for Julian day ${julianDay} in year ${year}`);
  }

  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

/**
 * Create TripLeg data from parsed boarding pass
 */
export function createTripLegFromBoardingPass(
  parsedPass: ParsedBoardingPass,
  tripId: string,
  order: number = 0
): Partial<import('../../types/trip').TripLeg> {
  return {
    tripId,
    destinationCountry: parsedPass.destinationCountry || '',
    arrivalDate: parsedPass.flightDate,
    flightNumber: parsedPass.flightNumber,
    airlineCode: parsedPass.airlineCode,
    arrivalAirport: parsedPass.arrivalAirport,
    formStatus: 'not_started' as const,
    order,
    // Note: accommodation needs to be provided separately as it's not in boarding pass data
  };
}

/**
 * Check if a boarding pass destination is supported by the app
 */
export function isBoardingPassSupported(parsedPass: ParsedBoardingPass): boolean {
  return parsedPass.destinationCountry ? 
    isSupportedDestination(parsedPass.arrivalAirport) : false;
}

/**
 * Get error message for unsupported destinations
 */
export function getUnsupportedDestinationMessage(parsedPass: ParsedBoardingPass): string {
  if (!parsedPass.destinationCountry) {
    return `Airport ${parsedPass.arrivalAirport} is not in our database. Please check the airport code.`;
  }
  
  return `${parsedPass.destinationCountry} is not yet supported. Currently supported countries: Japan, Malaysia, Singapore.`;
}