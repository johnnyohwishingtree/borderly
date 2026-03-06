import { Address } from './profile';

export interface Accommodation {
  name: string;
  address: Address;
  phone?: string;
  bookingReference?: string;
}

export interface SavedQRCode {
  id: string;
  legId: string;
  type: 'immigration' | 'customs' | 'health' | 'combined';
  imageBase64: string; // Stored locally
  savedAt: string;
  label: string; // e.g., "Visit Japan Web - Customs QR"
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
  formData?: Record<string, unknown>; // Country-specific form answers
  qrCodes?: SavedQRCode[];
  order: number; // Leg ordering within trip
}

export interface Trip {
  id: string; // UUID
  name: string; // User-defined, e.g., "Asia Summer 2025"
  status: 'upcoming' | 'active' | 'completed';
  legs: TripLeg[];
  createdAt: string;
  updatedAt: string;
}
