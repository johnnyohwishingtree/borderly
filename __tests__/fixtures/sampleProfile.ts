/**
 * Canonical sample fixtures for integration tests.
 * Used across autoFillPipeline, autoFillResultHandling, and portalNavigation tests.
 */

import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Sample traveler profile — US citizen, full details
// ---------------------------------------------------------------------------

export const sampleProfile: TravelerProfile = {
  id: 'test-user-1',
  surname: 'SMITH',
  givenNames: 'JOHN MICHAEL',
  passportNumber: 'L12345678',
  nationality: 'USA',
  dateOfBirth: '1985-06-15',
  gender: 'M',
  passportExpiry: '2032-03-20',
  issuingCountry: 'USA',
  email: 'john.smith@example.com',
  phoneNumber: '+12125550101',
  homeAddress: {
    line1: '100 Main Street',
    line2: 'Suite 200',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Software Engineer',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Per-country trip legs
// ---------------------------------------------------------------------------

export const sampleJapanLeg: TripLeg = {
  id: 'leg-jpn-1',
  tripId: 'trip-test-1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-07-01',
  departureDate: '2026-07-07',
  flightNumber: 'NH101',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Shinjuku Grand Hotel',
    address: {
      line1: '1-2-3 Nishi-Shinjuku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '160-0023',
      country: 'JPN',
    },
    phone: '+81-3-1234-5678',
    bookingReference: 'JPN-REF-001',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleMalaysiaLeg: TripLeg = {
  id: 'leg-mys-1',
  tripId: 'trip-test-1',
  destinationCountry: 'MYS',
  arrivalDate: '2026-07-08',
  departureDate: '2026-07-12',
  flightNumber: 'MH200',
  airlineCode: 'MH',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'Kuala Lumpur City Hotel',
    address: {
      line1: '10 Jalan Bukit Bintang',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '55100',
      country: 'MYS',
    },
    phone: '+60-3-1234-5678',
    bookingReference: 'MYS-REF-001',
  },
  formStatus: 'not_started',
  order: 2,
};

export const sampleSingaporeLeg: TripLeg = {
  id: 'leg-sgp-1',
  tripId: 'trip-test-1',
  destinationCountry: 'SGP',
  arrivalDate: '2026-07-13',
  departureDate: '2026-07-17',
  flightNumber: 'SQ200',
  airlineCode: 'SQ',
  arrivalAirport: 'SIN',
  accommodation: {
    name: 'Marina Bay View Hotel',
    address: {
      line1: '5 Bayfront Avenue',
      city: 'Singapore',
      postalCode: '018957',
      country: 'SGP',
    },
    phone: '+65-6123-4567',
    bookingReference: 'SGP-REF-001',
  },
  formStatus: 'not_started',
  order: 3,
};

export const sampleThailandLeg: TripLeg = {
  id: 'leg-tha-1',
  tripId: 'trip-test-2',
  destinationCountry: 'THA',
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-07',
  flightNumber: 'TG660',
  airlineCode: 'TG',
  arrivalAirport: 'BKK',
  accommodation: {
    name: 'Bangkok Palace Hotel',
    address: {
      line1: '123 Sukhumvit Road',
      city: 'Bangkok',
      state: 'Bangkok',
      postalCode: '10110',
      country: 'THA',
    },
    phone: '+66-2-123-4567',
    bookingReference: 'THA-REF-001',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleVietnamLeg: TripLeg = {
  id: 'leg-vnm-1',
  tripId: 'trip-test-2',
  destinationCountry: 'VNM',
  arrivalDate: '2026-08-08',
  departureDate: '2026-08-14',
  flightNumber: 'VN300',
  airlineCode: 'VN',
  arrivalAirport: 'SGN',
  accommodation: {
    name: 'Ho Chi Minh City Hotel',
    address: {
      line1: '45 Nguyen Hue Boulevard',
      city: 'Ho Chi Minh City',
      postalCode: '700000',
      country: 'VNM',
    },
    phone: '+84-28-1234-5678',
    bookingReference: 'VNM-REF-001',
  },
  formStatus: 'not_started',
  order: 2,
};

export const sampleUKLeg: TripLeg = {
  id: 'leg-gbr-1',
  tripId: 'trip-test-3',
  destinationCountry: 'GBR',
  arrivalDate: '2026-09-01',
  departureDate: '2026-09-10',
  flightNumber: 'BA178',
  airlineCode: 'BA',
  arrivalAirport: 'LHR',
  accommodation: {
    name: 'London Central Hotel',
    address: {
      line1: '20 Oxford Street',
      city: 'London',
      state: 'England',
      postalCode: 'W1D 1AS',
      country: 'GBR',
    },
    phone: '+44-20-1234-5678',
    bookingReference: 'GBR-REF-001',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleUSALeg: TripLeg = {
  id: 'leg-usa-1',
  tripId: 'trip-test-4',
  destinationCountry: 'USA',
  arrivalDate: '2026-10-01',
  departureDate: '2026-10-08',
  flightNumber: 'AA100',
  airlineCode: 'AA',
  arrivalAirport: 'JFK',
  accommodation: {
    name: 'New York Midtown Hotel',
    address: {
      line1: '350 Fifth Avenue',
      city: 'New York',
      state: 'NY',
      postalCode: '10118',
      country: 'USA',
    },
    phone: '+1-212-555-0100',
    bookingReference: 'USA-REF-001',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleCanadaLeg: TripLeg = {
  id: 'leg-can-1',
  tripId: 'trip-test-4',
  destinationCountry: 'CAN',
  arrivalDate: '2026-10-09',
  departureDate: '2026-10-15',
  flightNumber: 'AC100',
  airlineCode: 'AC',
  arrivalAirport: 'YYZ',
  accommodation: {
    name: 'Toronto Downtown Hotel',
    address: {
      line1: '100 King Street West',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5X 1E1',
      country: 'CAN',
    },
    phone: '+1-416-555-0100',
    bookingReference: 'CAN-REF-001',
  },
  formStatus: 'not_started',
  order: 2,
};

// ---------------------------------------------------------------------------
// Lookup table: country code → sample leg
// ---------------------------------------------------------------------------

export const sampleLegByCountry: Record<string, TripLeg> = {
  JPN: sampleJapanLeg,
  MYS: sampleMalaysiaLeg,
  SGP: sampleSingaporeLeg,
  THA: sampleThailandLeg,
  VNM: sampleVietnamLeg,
  GBR: sampleUKLeg,
  USA: sampleUSALeg,
  CAN: sampleCanadaLeg,
};

/** All 8 supported country codes in registration order. */
export const SUPPORTED_COUNTRIES = ['JPN', 'MYS', 'SGP', 'USA', 'CAN', 'GBR', 'THA', 'VNM'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];
