/**
 * Canonical sample profile and trip leg fixtures for integration tests.
 * Used by autoFillPipeline, autoFillResultHandling, and portalNavigation tests.
 */

import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Primary sample profile — US citizen with full details
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
// Per-country trip legs
// ---------------------------------------------------------------------------

export const sampleJapanLeg: TripLeg = {
  id: 'leg-jpn-1',
  tripId: 'trip-asia-1',
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
    phone: '+81-3-5321-0000',
    bookingReference: 'SGH123456',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleMalaysiaLeg: TripLeg = {
  id: 'leg-mys-1',
  tripId: 'trip-asia-1',
  destinationCountry: 'MYS',
  arrivalDate: '2026-07-08',
  departureDate: '2026-07-12',
  flightNumber: 'MH621',
  airlineCode: 'MH',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'Kuala Lumpur Tower Hotel',
    address: {
      line1: 'Jalan P. Ramlee',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '50250',
      country: 'MYS',
    },
    phone: '+60-3-2020-0000',
    bookingReference: 'KLTH789',
  },
  formStatus: 'not_started',
  order: 2,
};

export const sampleSingaporeLeg: TripLeg = {
  id: 'leg-sgp-1',
  tripId: 'trip-asia-1',
  destinationCountry: 'SGP',
  arrivalDate: '2026-07-13',
  departureDate: '2026-07-17',
  flightNumber: 'SQ312',
  airlineCode: 'SQ',
  arrivalAirport: 'SIN',
  accommodation: {
    name: 'Raffles Hotel',
    address: {
      line1: '1 Beach Road',
      city: 'Singapore',
      postalCode: '189673',
      country: 'SGP',
    },
    phone: '+65-6337-1886',
    bookingReference: 'RH456789',
  },
  formStatus: 'not_started',
  order: 3,
};

export const sampleThailandLeg: TripLeg = {
  id: 'leg-tha-1',
  tripId: 'trip-asia-1',
  destinationCountry: 'THA',
  arrivalDate: '2026-07-18',
  departureDate: '2026-07-22',
  flightNumber: 'TG661',
  airlineCode: 'TG',
  arrivalAirport: 'BKK',
  accommodation: {
    name: 'Bangkok Grand Hotel',
    address: {
      line1: '123 Sukhumvit Road',
      city: 'Bangkok',
      postalCode: '10110',
      country: 'THA',
    },
    phone: '+66-2-123-4567',
    bookingReference: 'BGH101',
  },
  formStatus: 'not_started',
  order: 4,
};

export const sampleVietnamLeg: TripLeg = {
  id: 'leg-vnm-1',
  tripId: 'trip-asia-1',
  destinationCountry: 'VNM',
  arrivalDate: '2026-07-23',
  departureDate: '2026-07-27',
  flightNumber: 'VN270',
  airlineCode: 'VN',
  arrivalAirport: 'HAN',
  accommodation: {
    name: 'Hanoi Heritage Hotel',
    address: {
      line1: '25 Trang Tien Street',
      city: 'Hanoi',
      postalCode: '100000',
      country: 'VNM',
    },
    phone: '+84-24-3936-0000',
    bookingReference: 'HHH202',
  },
  formStatus: 'not_started',
  order: 5,
};

export const sampleGBRLeg: TripLeg = {
  id: 'leg-gbr-1',
  tripId: 'trip-europe-1',
  destinationCountry: 'GBR',
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-07',
  flightNumber: 'BA178',
  airlineCode: 'BA',
  arrivalAirport: 'LHR',
  accommodation: {
    name: 'London Central Hotel',
    address: {
      line1: '10 Oxford Street',
      city: 'London',
      state: 'England',
      postalCode: 'W1D 1BS',
      country: 'GBR',
    },
    phone: '+44-20-7123-4567',
    bookingReference: 'LCH303',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleUSALeg: TripLeg = {
  id: 'leg-usa-1',
  tripId: 'trip-usa-1',
  destinationCountry: 'USA',
  arrivalDate: '2026-09-01',
  departureDate: '2026-09-10',
  flightNumber: 'AA100',
  airlineCode: 'AA',
  arrivalAirport: 'JFK',
  accommodation: {
    name: 'New York Hilton',
    address: {
      line1: '1335 Avenue of the Americas',
      city: 'New York',
      state: 'NY',
      postalCode: '10019',
      country: 'USA',
    },
    phone: '+1-212-586-7000',
    bookingReference: 'NYH404',
  },
  formStatus: 'not_started',
  order: 1,
};

export const sampleCANLeg: TripLeg = {
  id: 'leg-can-1',
  tripId: 'trip-can-1',
  destinationCountry: 'CAN',
  arrivalDate: '2026-10-01',
  departureDate: '2026-10-07',
  flightNumber: 'AC001',
  airlineCode: 'AC',
  arrivalAirport: 'YYZ',
  accommodation: {
    name: 'Toronto Marriott',
    address: {
      line1: '525 Bay Street',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5G 2L2',
      country: 'CAN',
    },
    phone: '+1-416-597-9200',
    bookingReference: 'TM505',
  },
  formStatus: 'not_started',
  order: 1,
};

// ---------------------------------------------------------------------------
// Convenience lookup: country code → sample leg
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
