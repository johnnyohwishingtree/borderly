/**
 * Canonical test fixtures for integration tests.
 *
 * A single "JOHN MICHAEL SMITH" profile is used across all pipeline tests so
 * that snapshot outputs remain stable and deterministic.
 */

import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Primary test profile
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
  phoneNumber: '+12125550001',
  homeAddress: {
    line1: '1 Liberty Plaza',
    city: 'New York',
    state: 'NY',
    postalCode: '10006',
    country: 'USA',
  },
  occupation: 'Engineer',
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
      line1: '3-7-1 Nishi-Shinjuku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '160-0023',
      country: 'JPN',
    },
    phone: '+81-3-1234-5678',
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
  flightNumber: 'MH601',
  airlineCode: 'MH',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'Kuala Lumpur City Centre Hotel',
    address: {
      line1: 'KLCC, Jalan Ampang',
      city: 'Kuala Lumpur',
      postalCode: '50450',
      country: 'MYS',
    },
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
  flightNumber: 'SQ321',
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
      postalCode: '10110',
      country: 'THA',
    },
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
  flightNumber: 'VN215',
  airlineCode: 'VN',
  arrivalAirport: 'SGN',
  accommodation: {
    name: 'Ho Chi Minh City Hotel',
    address: {
      line1: '1 Dong Khoi Street',
      city: 'Ho Chi Minh City',
      postalCode: '700000',
      country: 'VNM',
    },
  },
  formStatus: 'not_started',
  order: 5,
};

export const sampleGBRLeg: TripLeg = {
  id: 'leg-gbr-1',
  tripId: 'trip-test-2',
  destinationCountry: 'GBR',
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-07',
  flightNumber: 'BA178',
  airlineCode: 'BA',
  arrivalAirport: 'LHR',
  accommodation: {
    name: 'The Ritz London',
    address: {
      line1: '150 Piccadilly',
      city: 'London',
      state: 'England',
      postalCode: 'W1J 9BR',
      country: 'GBR',
    },
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleUSALeg: TripLeg = {
  id: 'leg-usa-1',
  tripId: 'trip-test-3',
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
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleCANLeg: TripLeg = {
  id: 'leg-can-1',
  tripId: 'trip-test-4',
  destinationCountry: 'CAN',
  arrivalDate: '2026-10-01',
  departureDate: '2026-10-07',
  flightNumber: 'AC852',
  airlineCode: 'AC',
  arrivalAirport: 'YYZ',
  accommodation: {
    name: 'Toronto Marriott City Centre',
    address: {
      line1: '1 Blue Jays Way',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5V 1J4',
      country: 'CAN',
    },
  },
  formStatus: 'not_started',
  order: 1,
};

// ---------------------------------------------------------------------------
// Convenience lookup by country code
// ---------------------------------------------------------------------------

export const SUPPORTED_COUNTRIES = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export const sampleLegByCountry: Record<SupportedCountry, TripLeg> = {
  JPN: sampleJapanLeg,
  MYS: sampleMalaysiaLeg,
  SGP: sampleSingaporeLeg,
  THA: sampleThailandLeg,
  VNM: sampleVietnamLeg,
  GBR: sampleGBRLeg,
  USA: sampleUSALeg,
  CAN: sampleCANLeg,
};
