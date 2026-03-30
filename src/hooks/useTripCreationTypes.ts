import type { Address } from '../types/profile';

export interface LegFormData {
  destinationCountry: string;
  arrivalDate: string;
  departureDate: string;
  flightNumber: string;
  airlineCode: string;
  arrivalAirport: string;
  accommodation: {
    name: string;
    address: Address;
    phone: string;
  };
  assignedTravelers: string[];
  autoFilledFields?: {
    destinationCountry?: 'auto';
    arrivalDate?: 'auto';
    flightNumber?: 'auto';
    airlineCode?: 'auto';
    arrivalAirport?: 'auto';
  };
}

export interface TripFormData {
  name: string;
  status: 'upcoming' | 'active' | 'completed';
}

export interface UseTripCreationOptions {
}
