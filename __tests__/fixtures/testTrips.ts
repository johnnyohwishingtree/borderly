import { Trip, TripLeg, Accommodation } from '../../src/types/trip';

/**
 * Test fixture trips for comprehensive form engine testing.
 * Covers various travel scenarios, durations, and accommodation types.
 */

// Japan Trip Leg
export const japanLeg: TripLeg = {
  id: 'leg-japan-001',
  tripId: 'trip-asia-001',
  destinationCountry: 'JPN',
  arrivalDate: '2025-07-15',
  departureDate: '2025-07-22',
  flightNumber: 'NH107',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Park Hyatt Tokyo',
    address: {
      line1: '3-7-1-2 Nishi-Shinjuku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '163-1055',
      country: 'JPN',
    },
    phone: '+81-3-5322-1234',
    bookingReference: 'PH123456789',
  },
  formStatus: 'not_started',
  order: 1,
};

// Malaysia Trip Leg
export const malaysiaLeg: TripLeg = {
  id: 'leg-malaysia-001',
  tripId: 'trip-asia-001',
  destinationCountry: 'MYS',
  arrivalDate: '2025-07-22',
  departureDate: '2025-07-26',
  flightNumber: 'MH780',
  airlineCode: 'MH',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'Mandarin Oriental Kuala Lumpur',
    address: {
      line1: 'Kuala Lumpur City Centre',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '50088',
      country: 'MYS',
    },
    phone: '+60-3-2380-8888',
    bookingReference: 'MO789012345',
  },
  formStatus: 'not_started',
  order: 2,
};

// Singapore Trip Leg
export const singaporeLeg: TripLeg = {
  id: 'leg-singapore-001',
  tripId: 'trip-asia-001',
  destinationCountry: 'SGP',
  arrivalDate: '2025-07-26',
  departureDate: '2025-07-30',
  flightNumber: 'SQ118',
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
    bookingReference: 'MBS345678901',
  },
  formStatus: 'not_started',
  order: 3,
};

// Complete Asia Trip
export const asiaTrip: Trip = {
  id: 'trip-asia-001',
  name: 'Asia Summer Adventure 2025',
  status: 'upcoming',
  legs: [japanLeg, malaysiaLeg, singaporeLeg],
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
};

// Business Trip to Japan (short duration)
export const japanBusinessLeg: TripLeg = {
  id: 'leg-japan-business-001',
  tripId: 'trip-japan-business-001',
  destinationCountry: 'JPN',
  arrivalDate: '2025-08-10',
  departureDate: '2025-08-13',
  flightNumber: 'UA7',
  airlineCode: 'UA',
  arrivalAirport: 'HND',
  accommodation: {
    name: 'Hotel New Otani Tokyo',
    address: {
      line1: '4-1 Kioi-cho, Chiyoda-ku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '102-8578',
      country: 'JPN',
    },
    phone: '+81-3-3265-1111',
  },
  formStatus: 'not_started',
  order: 1,
};

export const japanBusinessTrip: Trip = {
  id: 'trip-japan-business-001',
  name: 'Tokyo Business Conference',
  status: 'upcoming',
  legs: [japanBusinessLeg],
  createdAt: '2025-07-01T09:30:00Z',
  updatedAt: '2025-07-01T09:30:00Z',
};

// Long-stay Malaysia Trip (student/research)
export const malaysiaLongStayLeg: TripLeg = {
  id: 'leg-malaysia-long-001',
  tripId: 'trip-malaysia-research-001',
  destinationCountry: 'MYS',
  arrivalDate: '2025-09-01',
  departureDate: '2025-11-30', // 90 days (maximum tourist stay)
  flightNumber: 'AA8748',
  airlineCode: 'AA',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'University Guest House',
    address: {
      line1: 'Universiti Malaya',
      line2: 'Research Faculty Building',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '50603',
      country: 'MYS',
    },
    phone: '+60-3-7967-3200',
  },
  formStatus: 'not_started',
  order: 1,
};

export const malaysiaResearchTrip: Trip = {
  id: 'trip-malaysia-research-001',
  name: 'Research Exchange Program',
  status: 'upcoming',
  legs: [malaysiaLongStayLeg],
  createdAt: '2025-08-01T14:15:00Z',
  updatedAt: '2025-08-01T14:15:00Z',
};

// Transit-only Singapore Trip
export const singaporeTransitLeg: TripLeg = {
  id: 'leg-singapore-transit-001',
  tripId: 'trip-singapore-transit-001',
  destinationCountry: 'SGP',
  arrivalDate: '2025-12-15',
  departureDate: '2025-12-16',
  flightNumber: 'EK354',
  airlineCode: 'EK',
  arrivalAirport: 'SIN',
  accommodation: {
    name: 'Transit Hotel at Changi Airport',
    address: {
      line1: 'Singapore Changi Airport Terminal 3',
      city: 'Singapore',
      postalCode: '819663',
      country: 'SGP',
    },
    phone: '+65-6543-0300',
  },
  formStatus: 'not_started',
  order: 1,
};

export const singaporeTransitTrip: Trip = {
  id: 'trip-singapore-transit-001',
  name: 'Singapore Transit Stop',
  status: 'upcoming',
  legs: [singaporeTransitLeg],
  createdAt: '2025-11-20T16:45:00Z',
  updatedAt: '2025-11-20T16:45:00Z',
};

// Edge case: Trip with missing departure date
export const openEndedMalaysiaLeg: TripLeg = {
  id: 'leg-malaysia-openended-001',
  tripId: 'trip-malaysia-openended-001',
  destinationCountry: 'MYS',
  arrivalDate: '2025-10-01',
  // departureDate: undefined, // Open-ended trip
  flightNumber: 'CX715',
  airlineCode: 'CX',
  arrivalAirport: 'KUL',
  accommodation: {
    name: 'Backpacker Hostel',
    address: {
      line1: '123 Petaling Street',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postalCode: '50000',
      country: 'MYS',
    },
  },
  formStatus: 'not_started',
  order: 1,
};

export const openEndedTrip: Trip = {
  id: 'trip-malaysia-openended-001',
  name: 'Open-ended Backpacking',
  status: 'upcoming',
  legs: [openEndedMalaysiaLeg],
  createdAt: '2025-09-15T12:00:00Z',
  updatedAt: '2025-09-15T12:00:00Z',
};

// Edge case: Trip with minimal accommodation info
export const minimalAccommodationLeg: TripLeg = {
  id: 'leg-minimal-accommodation-001',
  tripId: 'trip-minimal-001',
  destinationCountry: 'JPN',
  arrivalDate: '2025-11-01',
  departureDate: '2025-11-05',
  flightNumber: 'AC4',
  airlineCode: 'AC',
  arrivalAirport: 'KIX',
  accommodation: {
    name: 'Budget Inn',
    address: {
      line1: '',
      city: '',
      postalCode: '',
      country: '',
    },
    // No phone number
  },
  formStatus: 'not_started',
  order: 1,
};

export const minimalTrip: Trip = {
  id: 'trip-minimal-001',
  name: 'Last-minute Trip',
  status: 'upcoming',
  legs: [minimalAccommodationLeg],
  createdAt: '2025-10-30T20:00:00Z',
  updatedAt: '2025-10-30T20:00:00Z',
};

/**
 * Test trips organized by scenario for easy access in tests.
 */
export const testTrips = {
  asiaTrip,
  japanBusinessTrip,
  malaysiaResearchTrip,
  singaporeTransitTrip,
  openEndedTrip,
  minimalTrip,
};

/**
 * Individual trip legs organized by country.
 */
export const tripLegsByCountry = {
  JPN: [japanLeg, japanBusinessLeg, minimalAccommodationLeg],
  MYS: [malaysiaLeg, malaysiaLongStayLeg, openEndedMalaysiaLeg],
  SGP: [singaporeLeg, singaporeTransitLeg],
};

/**
 * Trip scenarios for specific testing needs.
 */
export const tripScenarios = {
  // Multi-country trip
  multiCountry: asiaTrip,
  
  // Short business trip
  shortBusiness: japanBusinessTrip,
  
  // Long stay (research/study)
  longStay: malaysiaResearchTrip,
  
  // Transit only
  transitOnly: singaporeTransitTrip,
  
  // Open-ended departure
  openEnded: openEndedTrip,
  
  // Minimal data
  minimalData: minimalTrip,
};

/**
 * Common flight routes for testing different airline patterns.
 */
export const flightPatterns = {
  // US to Asia routes
  usToJapan: { airline: 'NH', flightNumber: 'NH107', route: 'LAX-NRT' },
  usToMalaysia: { airline: 'AA', flightNumber: 'AA8748', route: 'LAX-KUL' },
  
  // Intra-Asia routes
  japanToMalaysia: { airline: 'MH', flightNumber: 'MH780', route: 'NRT-KUL' },
  malaysiaToSingapore: { airline: 'SQ', flightNumber: 'SQ118', route: 'KUL-SIN' },
  
  // European routes
  ukToAsia: { airline: 'BA', flightNumber: 'BA12', route: 'LHR-SIN' },
  
  // Transit patterns
  middleEastTransit: { airline: 'EK', flightNumber: 'EK354', route: 'DXB-SIN' },
};