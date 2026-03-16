/**
 * Confirmation Text Parser
 *
 * Parses pasted booking confirmation emails/text to extract flight and hotel
 * information. Uses regex pattern matching — no external APIs.
 *
 * Handles common formats from airlines, OTAs (Booking.com, Expedia, etc.),
 * and email confirmations.
 */

import { lookupAirline } from './airlineDatabase';
import { lookupAirport } from '../boarding/airportLookup';
import type {
  ParsedFlightInfo,
  ParsedHotelInfo,
  ConfirmationParseResult,
} from '../../types/import';

/**
 * Parse a pasted confirmation text for flight and hotel info.
 */
export function parseConfirmationText(text: string): ConfirmationParseResult {
  const normalized = text.replace(/\r\n/g, '\n');

  const flights = parseFlights(normalized);
  const hotels = parseHotels(normalized);

  const totalFields = countPopulatedFields(flights, hotels);
  const confidence = computeConfidence(totalFields, flights.length, hotels.length);

  return {
    flights,
    hotels,
    rawText: text,
    confidence,
  };
}

// --- Flight Parsing ---

/**
 * Extract flight info from text. Looks for patterns like:
 * - "NH101" / "JL 723" / "SQ12" (flight numbers)
 * - "LAX → NRT" / "LAX - NRT" / "LAX to NRT" (routes)
 * - Date patterns near flight context
 */
function parseFlights(text: string): ParsedFlightInfo[] {
  const flights: ParsedFlightInfo[] = [];
  const seen = new Set<string>();

  // Pattern: flight number (2-letter code + digits)
  const flightNumberPattern = /\b([A-Z]{2})\s?(\d{1,4})\b/g;
  let match: RegExpExecArray | null;

  while ((match = flightNumberPattern.exec(text)) !== null) {
    const airlineCode = match[1];
    const flightNum = match[2];
    const fullNumber = `${airlineCode}${flightNum}`;

    // Only include if the airline code is recognized
    const airline = lookupAirline(airlineCode);
    if (!airline) continue;

    // Deduplicate
    if (seen.has(fullNumber)) continue;
    seen.add(fullNumber);

    const flight: ParsedFlightInfo = {
      flightNumber: fullNumber,
      airlineCode,
      airlineName: airline.name,
    };

    // Look for route near this flight number (within ~200 chars)
    const contextStart = Math.max(0, match.index - 100);
    const contextEnd = Math.min(text.length, match.index + match[0].length + 200);
    const context = text.slice(contextStart, contextEnd);

    const route = extractRoute(context);
    if (route) {
      flight.departureAirport = route.departure;
      flight.arrivalAirport = route.arrival;

      const depInfo = lookupAirport(route.departure);
      if (depInfo) flight.departureCity = depInfo.city;

      const arrInfo = lookupAirport(route.arrival);
      if (arrInfo) {
        flight.arrivalCity = arrInfo.city;
        flight.destinationCountry = arrInfo.country;
      }
    }

    // Look for date near this flight number
    const date = extractDateNear(context);
    if (date) flight.flightDate = date;

    flights.push(flight);
  }

  return flights;
}

/**
 * Extract airport route patterns like "LAX → NRT", "LAX - NRT", "LAX to NRT",
 * "From: LAX To: NRT", "Departing LAX Arriving NRT"
 */
function extractRoute(
  context: string
): { departure: string; arrival: string } | null {
  const patterns = [
    // "LAX → NRT" or "LAX -> NRT" or "LAX - NRT"
    /\b([A-Z]{3})\s*(?:→|->|–|—|-)\s*([A-Z]{3})\b/,
    // "LAX to NRT"
    /\b([A-Z]{3})\s+to\s+([A-Z]{3})\b/i,
    // "From LAX To NRT" or "From: LAX To: NRT"
    /[Ff]rom:?\s*([A-Z]{3})\s+[Tt]o:?\s*([A-Z]{3})/,
    // "Departing LAX Arriving NRT"
    /[Dd]epart(?:ing|ure)?:?\s*([A-Z]{3})[\s\S]{0,50}[Aa]rriv(?:ing|al)?:?\s*([A-Z]{3})/,
  ];

  for (const pattern of patterns) {
    const m = context.match(pattern);
    if (m) {
      const dep = m[1].toUpperCase();
      const arr = m[2].toUpperCase();
      // Validate at least one is a known airport
      if (lookupAirport(dep) || lookupAirport(arr)) {
        return { departure: dep, arrival: arr };
      }
    }
  }
  return null;
}

// --- Hotel Parsing ---

/**
 * Extract hotel info from text. Looks for patterns like:
 * - "Hotel: ..." / "Property: ..." / "Accommodation: ..."
 * - "Check-in: ..." / "Check-out: ..."
 * - "Booking Reference: ..." / "Confirmation: ..."
 * - Address patterns
 */
function parseHotels(text: string): ParsedHotelInfo[] {
  const hotels: ParsedHotelInfo[] = [];

  // Try to find hotel name
  const name = extractHotelName(text);
  if (!name) return hotels;

  const hotel: ParsedHotelInfo = { name };

  // Check-in / Check-out dates
  const checkIn = extractLabeledDate(text, [
    'check-?in',
    'checkin',
    'arrival',
    'arriving',
  ]);
  if (checkIn) hotel.checkInDate = checkIn;

  const checkOut = extractLabeledDate(text, [
    'check-?out',
    'checkout',
    'departure',
    'departing',
  ]);
  if (checkOut) hotel.checkOutDate = checkOut;

  // Booking reference
  const ref = extractBookingReference(text);
  if (ref) hotel.bookingReference = ref;

  // Address
  const address = extractAddress(text);
  if (address) hotel.address = address;

  // Phone
  const phone = extractPhone(text);
  if (phone) hotel.phone = phone;

  hotels.push(hotel);
  return hotels;
}

/**
 * Extract hotel name from common patterns
 */
function extractHotelName(text: string): string | null {
  const patterns = [
    // "Hotel: Hilton Tokyo" / "Property: ..." — requires colon separator
    /(?:hotel|property|accommodation|resort|hostel|inn|ryokan)\s*(?:name)?\s*:\s*(.+)/i,
    // "Your stay at Hilton Tokyo"
    /your\s+(?:stay|reservation|booking)\s+at\s+(.+?)(?:\n|$)/i,
    // "Hilton Tokyo Hotel" / "Tokyo Marriott Hotel" (name ending in Hotel/Resort/Inn)
    /\b((?:[A-Z][a-zA-Z'-]+\s+){1,5}(?:Hotel|Resort|Inn|Hostel|Ryokan|Suites?))\b/,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return m[1].trim().replace(/[,.]$/, '');
    }
  }
  return null;
}

/**
 * Extract a date following a specific label (e.g., "Check-in: March 15, 2025")
 */
function extractLabeledDate(
  text: string,
  labels: string[]
): string | null {
  const labelPattern = labels.join('|');
  const regex = new RegExp(
    `(?:${labelPattern})\\s*(?:date)?\\s*:?\\s*(.+?)(?:\\n|$)`,
    'i'
  );
  const m = text.match(regex);
  if (!m) return null;

  return parseDate(m[1].trim());
}

/**
 * Extract booking/confirmation reference
 */
function extractBookingReference(text: string): string | null {
  const patterns = [
    /(?:booking|confirmation|reservation)\s*(?:number|ref(?:erence)?|code|#|id)\s*:?\s*([A-Z0-9-]{4,20})/i,
    /(?:ref|conf)\s*#?\s*:?\s*([A-Z0-9-]{4,20})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Extract an address pattern from text
 */
function extractAddress(text: string): string | null {
  const patterns = [
    /[Aa]ddress:?\s*(.+?)(?:\n\n|\n(?=[A-Z]))/s,
    // Street number + street name pattern
    /\b(\d{1,5}\s+[A-Za-z\s]+(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Blvd|Boulevard|Dr(?:ive)?|Lane|Way|Place|Pl)[.,]?\s*.+?)(?:\n\n|\n(?=[A-Z]))/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return m[1].trim().replace(/\n/g, ', ');
    }
  }
  return null;
}

/**
 * Extract a phone number from text
 */
function extractPhone(text: string): string | null {
  const patterns = [
    /(?:phone|tel(?:ephone)?|contact)\s*:?\s*([+\d\s()-]{7,20})/i,
    // International phone format
    /(\+\d{1,3}[\s-]?\d{1,4}[\s-]?\d{3,4}[\s-]?\d{3,4})/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1].trim();
  }
  return null;
}

// --- Date Parsing ---

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Try to parse a date string into ISO 8601 format.
 * Handles: "March 15, 2025", "15 Mar 2025", "2025-03-15", "03/15/2025", "15/03/2025"
 */
export function parseDate(input: string): string | null {
  const trimmed = input.trim();

  // ISO 8601: "2025-03-15"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // "March 15, 2025" or "Mar 15, 2025"
  const mdyNameMatch = trimmed.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/
  );
  if (mdyNameMatch) {
    const month = MONTH_NAMES[mdyNameMatch[1].toLowerCase()];
    if (month) {
      return formatISODate(
        parseInt(mdyNameMatch[3], 10),
        month,
        parseInt(mdyNameMatch[2], 10)
      );
    }
  }

  // "15 March 2025" or "15 Mar 2025"
  const dmyNameMatch = trimmed.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/
  );
  if (dmyNameMatch) {
    const month = MONTH_NAMES[dmyNameMatch[2].toLowerCase()];
    if (month) {
      return formatISODate(
        parseInt(dmyNameMatch[3], 10),
        month,
        parseInt(dmyNameMatch[1], 10)
      );
    }
  }

  // "MM/DD/YYYY" (US format, assumed when month <= 12 and day > 12, else ambiguous)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10);
    const b = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    // Assume MM/DD/YYYY (US format)
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return formatISODate(year, a, b);
    }
  }

  return null;
}

function formatISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Extract a date from nearby context (within the text chunk)
 */
function extractDateNear(context: string): string | null {
  // Try various date patterns
  const patterns = [
    // "March 15, 2025" / "Mar 15, 2025"
    /\b([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/,
    // "15 March 2025" / "15 Mar 2025"
    /\b(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})\b/,
    // ISO: "2025-03-15"
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    // "03/15/2025"
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const m = context.match(pattern);
    if (m) {
      return parseDate(m[0]);
    }
  }
  return null;
}

// --- Confidence Scoring ---

function countPopulatedFields(
  flights: ParsedFlightInfo[],
  hotels: ParsedHotelInfo[]
): number {
  let count = 0;
  for (const f of flights) {
    if (f.flightNumber) count++;
    if (f.airlineName) count++;
    if (f.departureAirport) count++;
    if (f.arrivalAirport) count++;
    if (f.flightDate) count++;
  }
  for (const h of hotels) {
    if (h.name) count++;
    if (h.address) count++;
    if (h.checkInDate) count++;
    if (h.checkOutDate) count++;
    if (h.bookingReference) count++;
    if (h.phone) count++;
  }
  return count;
}

function computeConfidence(
  totalFields: number,
  flightCount: number,
  hotelCount: number
): number {
  if (flightCount === 0 && hotelCount === 0) return 0;
  // Base confidence from having found items
  let confidence = 0.3;
  // More fields = higher confidence (diminishing returns)
  confidence += Math.min(0.5, totalFields * 0.05);
  // Bonus for having both flights and hotels
  if (flightCount > 0 && hotelCount > 0) confidence += 0.1;
  // Bonus for route info on flights
  const flightsWithRoutes = flightCount > 0 ? 0.1 : 0;
  confidence += flightsWithRoutes;

  return Math.min(1, Math.round(confidence * 100) / 100);
}
