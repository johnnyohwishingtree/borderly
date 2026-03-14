/**
 * Canonical test fixtures for auto-fill pipeline integration tests.
 *
 * Provides a reusable sample profile (US citizen, full details) and trip legs
 * for all 8 supported countries so integration tests share consistent data.
 */

import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Sample traveler profile
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
  phoneNumber: '+12125551234',
  homeAddress: {
    line1: '123 Main Street',
    line2: 'Apt 4A',
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
      line1: '1-1-1 Nishi-Shinjuku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '160-0023',
      country: 'JPN',
    },
    phone: '+81-3-1234-5678',
    bookingReference: 'JPN123456',
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
  flightNumber: 'MH370',
  airlineCode: 'MH',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'KL City Centre Hotel',
    address: {
      line1: '1 Jalan Bukit Bintang',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '55100',
      country: 'MYS',
    },
    phone: '+60-3-2161-8888',
    bookingReference: 'MYS789012',
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
  flightNumber: 'SQ001',
  airlineCode: 'SQ',
  arrivalAirport: 'SIN',
  accommodation: {
    name: 'Marina Bay Sands',
    address: {
      line1: '10 Bayfront Avenue',
      city: 'Singapore',
      postalCode: '018956',
      country: 'SGP',
    },
    phone: '+65-6688-8888',
    bookingReference: 'SGP345678',
  },
  formStatus: 'not_started',
  order: 3,
};

export const sampleThailandLeg: TripLeg = {
  id: 'leg-tha-1',
  tripId: 'trip-test-1',
  destinationCountry: 'THA',
  arrivalDate: '2026-07-18',
  departureDate: '2026-07-22',
  flightNumber: 'TG661',
  airlineCode: 'TG',
  arrivalAirport: 'BKK',
  accommodation: {
    name: 'Bangkok Palace Hotel',
    address: {
      line1: '1 Sukhumvit Road',
      city: 'Bangkok',
      state: 'Bangkok',
      postalCode: '10110',
      country: 'THA',
    },
    phone: '+66-2-123-4567',
    bookingReference: 'THA901234',
  },
  formStatus: 'not_started',
  order: 4,
};

export const sampleVietnamLeg: TripLeg = {
  id: 'leg-vnm-1',
  tripId: 'trip-test-1',
  destinationCountry: 'VNM',
  arrivalDate: '2026-07-23',
  departureDate: '2026-07-27',
  flightNumber: 'VN101',
  airlineCode: 'VN',
  arrivalAirport: 'HAN',
  accommodation: {
    name: 'Hanoi Boutique Hotel',
    address: {
      line1: '1 Hoan Kiem Street',
      city: 'Hanoi',
      postalCode: '10000',
      country: 'VNM',
    },
    phone: '+84-24-1234-5678',
    bookingReference: 'VNM567890',
  },
  formStatus: 'not_started',
  order: 5,
};

export const sampleUKLeg: TripLeg = {
  id: 'leg-gbr-1',
  tripId: 'trip-test-1',
  destinationCountry: 'GBR',
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-07',
  flightNumber: 'BA178',
  airlineCode: 'BA',
  arrivalAirport: 'LHR',
  accommodation: {
    name: 'London Central Hotel',
    address: {
      line1: '10 Whitehall',
      city: 'London',
      state: 'England',
      postalCode: 'SW1A 2AA',
      country: 'GBR',
    },
    phone: '+44-20-7123-4567',
    bookingReference: 'GBR123789',
  },
  formStatus: 'not_started',
  order: 6,
};

export const sampleUSALeg: TripLeg = {
  id: 'leg-usa-1',
  tripId: 'trip-test-1',
  destinationCountry: 'USA',
  arrivalDate: '2026-09-01',
  departureDate: '2026-09-10',
  flightNumber: 'AA100',
  airlineCode: 'AA',
  arrivalAirport: 'JFK',
  accommodation: {
    name: 'Times Square Hotel',
    address: {
      line1: '1 Times Square',
      city: 'New York',
      state: 'NY',
      postalCode: '10036',
      country: 'USA',
    },
    phone: '+1-212-555-0100',
    bookingReference: 'USA456789',
  },
  formStatus: 'not_started',
  order: 7,
};

export const sampleCanadaLeg: TripLeg = {
  id: 'leg-can-1',
  tripId: 'trip-test-1',
  destinationCountry: 'CAN',
  arrivalDate: '2026-09-15',
  departureDate: '2026-09-20',
  flightNumber: 'AC855',
  airlineCode: 'AC',
  arrivalAirport: 'YYZ',
  accommodation: {
    name: 'Toronto Downtown Hotel',
    address: {
      line1: '100 Front Street West',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5J 1E3',
      country: 'CAN',
    },
    phone: '+1-416-555-0199',
    bookingReference: 'CAN012345',
  },
  formStatus: 'not_started',
  order: 8,
};

// ---------------------------------------------------------------------------
// Lookup by country code
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

export const ALL_SUPPORTED_COUNTRIES = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'] as const;
export type SupportedCountryCode = typeof ALL_SUPPORTED_COUNTRIES[number];
