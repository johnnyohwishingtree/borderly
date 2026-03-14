/**
 * sampleProfile.ts — canonical test fixtures for auto-fill pipeline integration tests.
 *
 * These fixtures intentionally mirror the sample data from the issue specification
 * (issue #277) so that every integration test file can import from a single
 * shared source rather than duplicating inline objects.
 */

import type { TravelerProfile } from '../../src/types/profile';
import type { TripLeg } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Primary test profile — US citizen with full details
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
    line1: '456 Main Street',
    line2: 'Apt 7C',
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
// Trip legs — one per supported country
// ---------------------------------------------------------------------------

export const sampleJapanLeg: TripLeg = {
  id: 'leg-jpn-1',
  tripId: 'trip-sample-1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-07-01',
  departureDate: '2026-07-07',
  flightNumber: 'NH101',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Shinjuku Grand Hotel',
    address: {
      line1: '3-7-1 Shinjuku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '160-0022',
      country: 'JPN',
    },
    phone: '+81-3-1234-5678',
    bookingReference: 'SGH20260701',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleMalaysiaLeg: TripLeg = {
  id: 'leg-mys-1',
  tripId: 'trip-sample-1',
  destinationCountry: 'MYS',
  arrivalDate: '2026-07-08',
  departureDate: '2026-07-14',
  flightNumber: 'MH380',
  airlineCode: 'MH',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'Kuala Lumpur Marriott',
    address: {
      line1: '183 Jalan Bukit Bintang',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '55100',
      country: 'MYS',
    },
    phone: '+60-3-2715-9000',
    bookingReference: 'KLM20260708',
  },
  formStatus: 'not_started',
  order: 2,
};

export const sampleSingaporeLeg: TripLeg = {
  id: 'leg-sgp-1',
  tripId: 'trip-sample-1',
  destinationCountry: 'SGP',
  arrivalDate: '2026-07-14',
  departureDate: '2026-07-18',
  flightNumber: 'SQ021',
  airlineCode: 'SQ',
  arrivalAirport: 'SIN',
  accommodation: {
    name: 'Raffles Hotel Singapore',
    address: {
      line1: '1 Beach Road',
      city: 'Singapore',
      postalCode: '189673',
      country: 'SGP',
    },
    phone: '+65-6337-1886',
    bookingReference: 'RHS20260714',
  },
  formStatus: 'not_started',
  order: 3,
};

export const sampleUSALeg: TripLeg = {
  id: 'leg-usa-1',
  tripId: 'trip-sample-2',
  destinationCountry: 'USA',
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-10',
  flightNumber: 'AA100',
  airlineCode: 'AA',
  arrivalAirport: 'JFK',
  accommodation: {
    name: 'The Plaza Hotel',
    address: {
      line1: '768 Fifth Avenue',
      city: 'New York',
      state: 'NY',
      postalCode: '10019',
      country: 'USA',
    },
    phone: '+1-212-759-3000',
    bookingReference: 'PLZ20260801',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleCanadaLeg: TripLeg = {
  id: 'leg-can-1',
  tripId: 'trip-sample-3',
  destinationCountry: 'CAN',
  arrivalDate: '2026-09-01',
  departureDate: '2026-09-07',
  flightNumber: 'AC001',
  airlineCode: 'AC',
  arrivalAirport: 'YYZ',
  accommodation: {
    name: 'Fairmont Royal York',
    address: {
      line1: '100 Front Street West',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5J 1E3',
      country: 'CAN',
    },
    phone: '+1-416-368-2511',
    bookingReference: 'FRY20260901',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleGBRLeg: TripLeg = {
  id: 'leg-gbr-1',
  tripId: 'trip-sample-4',
  destinationCountry: 'GBR',
  arrivalDate: '2026-10-01',
  departureDate: '2026-10-08',
  flightNumber: 'BA178',
  airlineCode: 'BA',
  arrivalAirport: 'LHR',
  accommodation: {
    name: 'The Savoy London',
    address: {
      line1: 'Strand',
      city: 'London',
      state: 'England',
      postalCode: 'WC2R 0EU',
      country: 'GBR',
    },
    phone: '+44-20-7836-4343',
    bookingReference: 'SAV20261001',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleThailandLeg: TripLeg = {
  id: 'leg-tha-1',
  tripId: 'trip-sample-5',
  destinationCountry: 'THA',
  arrivalDate: '2026-11-01',
  departureDate: '2026-11-10',
  flightNumber: 'TG917',
  airlineCode: 'TG',
  arrivalAirport: 'BKK',
  accommodation: {
    name: 'Mandarin Oriental Bangkok',
    address: {
      line1: '48 Oriental Avenue',
      city: 'Bangkok',
      state: 'Bangkok',
      postalCode: '10500',
      country: 'THA',
    },
    phone: '+66-2-659-9000',
    bookingReference: 'MOB20261101',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleVietnamLeg: TripLeg = {
  id: 'leg-vnm-1',
  tripId: 'trip-sample-6',
  destinationCountry: 'VNM',
  arrivalDate: '2026-12-01',
  departureDate: '2026-12-08',
  flightNumber: 'VN001',
  airlineCode: 'VN',
  arrivalAirport: 'SGN',
  accommodation: {
    name: 'Park Hyatt Saigon',
    address: {
      line1: '2 Lam Son Square',
      city: 'Ho Chi Minh City',
      state: 'Ho Chi Minh',
      postalCode: '70000',
      country: 'VNM',
    },
    phone: '+84-28-3824-1234',
    bookingReference: 'PHS20261201',
  },
  formStatus: 'not_started',
  order: 1,
};

// ---------------------------------------------------------------------------
// Country → trip leg lookup table (used in parameterised tests)
// ---------------------------------------------------------------------------

export const sampleLegByCountry: Record<string, TripLeg> = {
  JPN: sampleJapanLeg,
  MYS: sampleMalaysiaLeg,
  SGP: sampleSingaporeLeg,
  USA: sampleUSALeg,
  CAN: sampleCanadaLeg,
  GBR: sampleGBRLeg,
  THA: sampleThailandLeg,
  VNM: sampleVietnamLeg,
};

/** The canonical list of all 8 supported countries. */
export const ALL_SUPPORTED_COUNTRIES = ['JPN', 'MYS', 'SGP', 'USA', 'CAN', 'GBR', 'THA', 'VNM'] as const;
export type SupportedCountry = typeof ALL_SUPPORTED_COUNTRIES[number];
