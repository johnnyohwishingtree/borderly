import { Address } from './profile';

export type LegSubmissionStatus = 'not_started' | 'in_progress' | 'submitted';

export interface Accommodation {
  name: string;
  address: Address;
  phone?: string;
  bookingReference?: string;
}

export interface SavedQRCode {
  id: string;
  legId: string;
  travelerId?: string; // Optional: which traveler this QR belongs to
  type: 'immigration' | 'customs' | 'health' | 'combined';
  imageBase64: string; // Stored locally
  savedAt: string;
  label: string; // e.g., "Visit Japan Web - Customs QR"
}

// Multi-traveler form data structure
export interface TravelerFormData {
  travelerId: string;
  formData: Record<string, unknown>;
  formStatus: 'not_started' | 'in_progress' | 'ready' | 'submitted';
  completionPercentage: number;
  qrCodes?: SavedQRCode[];
}

export interface TripLeg {
  id: string;
  tripId: string;
  destinationCountry: string; // ISO 3166-1 alpha-3
  arrivalDate: string; // ISO 8601
  departureDate?: string;
  flightNumber?: string;
  airlineCode?: string; // IATA 2-letter code
  arrivalAirport?: string; // IATA 3-letter code
  accommodation: Accommodation;
  formStatus: 'not_started' | 'in_progress' | 'ready' | 'submitted';
  submissionStatus: LegSubmissionStatus; // Tracks overall submission state; defaults to 'not_started'
  formData?: Record<string, unknown>; // Legacy: Country-specific form answers for single traveler
  qrCodes?: SavedQRCode[];
  order: number; // Leg ordering within trip
  // Multi-traveler support
  assignedTravelers?: string[]; // Array of traveler profile IDs assigned to this leg
  travelerFormsData?: TravelerFormData[]; // Form data per assigned traveler
}

export interface Trip {
  id: string; // UUID
  name: string; // User-defined, e.g., "Asia Summer 2025"
  status: 'upcoming' | 'active' | 'completed';
  legs: TripLeg[];
  createdAt: string;
  updatedAt: string;
}

/** A single leg stored inside a TripTemplate — country code + typical stay duration. */
export interface TripTemplateLeg {
  /** ISO 3166-1 alpha-3 country code, e.g. "JPN". */
  countryCode: string;
  /** Typical number of days spent in this country. */
  typicalDurationDays: number;
  /** Leg ordering within the template. */
  order: number;
}

/**
 * A reusable trip template.
 * Stores the trip name, ordered list of destinations with typical durations,
 * and creation timestamp.  Dates and submission data are NOT stored.
 */
export interface TripTemplate {
  /** UUID. */
  id: string;
  /** User-facing name for the template, e.g. "Japan–Singapore Loop". */
  name: string;
  /** Ordered list of destinations with typical durations. */
  legs: TripTemplateLeg[];
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}
