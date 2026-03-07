import { TravelerProfile, Address } from '../types/profile';
import { Trip } from '../types/trip';
import { generateFilledForm } from '../services/forms/formEngine';
import { CountryFormSchema } from '../types/schema';

/**
 * Demo data utilities for development and testing.
 * Provides realistic sample data for all supported countries and scenarios.
 */

// Demo profiles for different user personas
export const demoProfiles = {
  frequentBusinessTraveler: {
    id: 'demo-business-001',
    passportNumber: 'A12345678',
    surname: 'ANDERSON',
    givenNames: 'SARAH ELIZABETH',
    nationality: 'USA',
    dateOfBirth: '1985-03-12',
    gender: 'F' as const,
    passportExpiry: '2030-03-12',
    issuingCountry: 'USA',
    email: 'sarah.anderson@company.com',
    phoneNumber: '+12125551001',
    homeAddress: {
      line1: '789 Business Ave',
      line2: 'Suite 1200',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94111',
      country: 'USA',
    },
    occupation: 'Senior Manager',
    defaultDeclarations: {
      hasItemsToDeclar: true, // Often carries business equipment
      carryingCurrency: true, // Business expense cash
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: true, // Business samples/materials
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-30T15:30:00Z',
  } as TravelerProfile,

  leisureTourist: {
    id: 'demo-tourist-001',
    passportNumber: 'B98765432',
    surname: 'THOMPSON',
    givenNames: 'MICHAEL JAMES',
    nationality: 'GBR',
    dateOfBirth: '1978-09-25',
    gender: 'M' as const,
    passportExpiry: '2028-11-18',
    issuingCountry: 'GBR',
    email: 'mike.thompson@email.com',
    phoneNumber: '+447700900123',
    homeAddress: {
      line1: '15 Oak Street',
      city: 'Manchester',
      state: 'England',
      postalCode: 'M1 4BT',
      country: 'GBR',
    },
    occupation: 'Teacher',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-05T10:15:00Z',
    updatedAt: '2025-02-01T09:20:00Z',
  } as TravelerProfile,

  digitalNomad: {
    id: 'demo-nomad-001',
    passportNumber: 'C11223344',
    surname: 'CHEN',
    givenNames: 'ALEX',
    nationality: 'CAN',
    dateOfBirth: '1992-07-08',
    gender: 'F' as const,
    passportExpiry: '2029-05-20',
    issuingCountry: 'CAN',
    email: 'alex.chen.nomad@gmail.com',
    phoneNumber: '+16475551234',
    homeAddress: {
      line1: '456 Tech Street',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5V 3A8',
      country: 'CAN',
    },
    occupation: 'Software Developer',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-10T14:45:00Z',
    updatedAt: '2025-02-05T11:10:00Z',
  } as TravelerProfile,

  retireeCouple: {
    id: 'demo-retiree-001',
    passportNumber: 'D55667788',
    surname: 'WILLIAMS',
    givenNames: 'ROBERT FRANK',
    nationality: 'AUS',
    dateOfBirth: '1955-12-03',
    gender: 'M' as const,
    passportExpiry: '2026-08-15',
    issuingCountry: 'AUS',
    email: 'bob.williams@retirement.com',
    phoneNumber: '+61412555987',
    homeAddress: {
      line1: '22 Sunset Boulevard',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      country: 'AUS',
    },
    occupation: 'Retired',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false, // Mostly uses cards
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-15T16:20:00Z',
    updatedAt: '2025-02-10T13:40:00Z',
  } as TravelerProfile,
};

// Demo trips for different travel scenarios
export const demoTrips = {
  asianGrandTour: {
    id: 'demo-trip-001',
    name: '2025 Asian Grand Tour',
    status: 'upcoming' as const,
    legs: [
      {
        id: 'leg-001',
        tripId: 'demo-trip-001',
        destinationCountry: 'JPN',
        arrivalDate: '2025-08-01',
        departureDate: '2025-08-08',
        flightNumber: 'NH5',
        airlineCode: 'NH',
        arrivalAirport: 'NRT',
        accommodation: {
          name: 'Imperial Hotel Tokyo',
          address: {
            line1: '1-1-1 Uchisaiwaicho',
            city: 'Tokyo',
            state: 'Tokyo',
            postalCode: '100-8558',
            country: 'JPN',
          },
          phone: '+81-3-3504-1111',
          bookingReference: 'IMP2025080001',
        },
        formStatus: 'not_started' as const,
        order: 1,
      },
      {
        id: 'leg-002',
        tripId: 'demo-trip-001',
        destinationCountry: 'MYS',
        arrivalDate: '2025-08-08',
        departureDate: '2025-08-12',
        flightNumber: 'MH88',
        airlineCode: 'MH',
        arrivalAirport: 'KUL',
        accommodation: {
          name: 'Four Seasons Hotel Kuala Lumpur',
          address: {
            line1: '145 Jalan Ampang',
            city: 'Kuala Lumpur',
            state: 'Wilayah Persekutuan',
            postalCode: '50450',
            country: 'MYS',
          },
          phone: '+60-3-2382-8888',
          bookingReference: 'FS2025080801',
        },
        formStatus: 'not_started' as const,
        order: 2,
      },
      {
        id: 'leg-003',
        tripId: 'demo-trip-001',
        destinationCountry: 'SGP',
        arrivalDate: '2025-08-12',
        departureDate: '2025-08-16',
        flightNumber: 'SQ28',
        airlineCode: 'SQ',
        arrivalAirport: 'SIN',
        accommodation: {
          name: 'Raffles Singapore',
          address: {
            line1: '1 Beach Road',
            city: 'Singapore',
            postalCode: '189673',
            country: 'SGP',
          },
          phone: '+65-6337-1886',
          bookingReference: 'RAF2025081201',
        },
        formStatus: 'not_started' as const,
        order: 3,
      },
    ],
    createdAt: '2025-06-01T09:00:00Z',
    updatedAt: '2025-06-15T10:30:00Z',
  } as Trip,

  quickBusinessTrip: {
    id: 'demo-trip-002',
    name: 'KL Business Meeting',
    status: 'upcoming' as const,
    legs: [
      {
        id: 'leg-004',
        tripId: 'demo-trip-002',
        destinationCountry: 'MYS',
        arrivalDate: '2025-09-15',
        departureDate: '2025-09-17',
        flightNumber: 'CX721',
        airlineCode: 'CX',
        arrivalAirport: 'KUL',
        accommodation: {
          name: 'Shangri-La Hotel Kuala Lumpur',
          address: {
            line1: '11 Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'Wilayah Persekutuan',
            postalCode: '50250',
            country: 'MYS',
          },
          phone: '+60-3-2032-2388',
          bookingReference: 'SL2025091501',
        },
        formStatus: 'not_started' as const,
        order: 1,
      },
    ],
    createdAt: '2025-08-20T14:15:00Z',
    updatedAt: '2025-08-25T16:45:00Z',
  } as Trip,

  weekendGetaway: {
    id: 'demo-trip-003',
    name: 'Singapore Weekend',
    status: 'upcoming' as const,
    legs: [
      {
        id: 'leg-005',
        tripId: 'demo-trip-003',
        destinationCountry: 'SGP',
        arrivalDate: '2025-10-04',
        departureDate: '2025-10-06',
        flightNumber: 'JQ7',
        airlineCode: 'JQ',
        arrivalAirport: 'SIN',
        accommodation: {
          name: 'Pod Boutique Capsule Hotel',
          address: {
            line1: '289 Beach Road',
            city: 'Singapore',
            postalCode: '199552',
            country: 'SGP',
          },
          phone: '+65-6297-3933',
        },
        formStatus: 'not_started' as const,
        order: 1,
      },
    ],
    createdAt: '2025-09-20T11:30:00Z',
    updatedAt: '2025-09-25T08:15:00Z',
  } as Trip,
};

/**
 * Generates demo form data for development and testing purposes.
 * Creates pre-filled forms with realistic data for UI development.
 */
export function generateDemoFormData(
  profileKey: keyof typeof demoProfiles,
  tripKey: keyof typeof demoTrips,
  countrySchema: CountryFormSchema
) {
  const profile = demoProfiles[profileKey];
  const trip = demoTrips[tripKey];
  
  // Find the leg for the specified country
  const leg = trip.legs.find(l => l.destinationCountry === countrySchema.countryCode);
  
  if (!leg) {
    throw new Error(`No leg found for country ${countrySchema.countryCode} in trip ${tripKey}`);
  }

  // Generate the filled form
  const form = generateFilledForm(profile, leg, countrySchema);

  // Add some realistic user input for demo purposes
  const demoUserInput: Record<string, unknown> = {};
  
  // Add country-specific demo data
  switch (countrySchema.countryCode) {
    case 'JPN':
      demoUserInput.purposeOfVisit = profileKey === 'frequentBusinessTraveler' ? 'business' : 'tourism';
      demoUserInput.currencyOver1M = false;
      demoUserInput.meatProducts = false;
      demoUserInput.plantProducts = false;
      break;
      
    case 'MYS':
      demoUserInput.purposeOfVisit = profileKey === 'frequentBusinessTraveler' ? 'business' : 'tourism';
      demoUserInput.healthCondition = false;
      demoUserInput.visitedHighRiskCountries = false;
      break;
      
    case 'SGP':
      demoUserInput.purposeOfVisit = profileKey === 'frequentBusinessTraveler' ? 'business' : 'tourism';
      demoUserInput.hasSymptoms = false;
      demoUserInput.visitedCountries14Days = false;
      break;
  }

  return {
    profile,
    trip,
    leg,
    form,
    demoUserInput,
    filledForm: generateFilledForm(profile, leg, countrySchema, demoUserInput),
  };
}

/**
 * Creates sample data for specific user personas and travel scenarios.
 */
export const demoScenarios = {
  firstTimeUser: {
    profile: demoProfiles.leisureTourist,
    trip: demoTrips.weekendGetaway,
    description: 'First-time user taking a short leisure trip to Singapore',
  },
  
  experiencedTraveler: {
    profile: demoProfiles.frequentBusinessTraveler,
    trip: demoTrips.asianGrandTour,
    description: 'Business traveler on a multi-country tour with complex declarations',
  },
  
  quickBusinessTrip: {
    profile: demoProfiles.frequentBusinessTraveler,
    trip: demoTrips.quickBusinessTrip,
    description: 'Quick 2-day business trip to Malaysia',
  },
  
  nomadWorkTrip: {
    profile: demoProfiles.digitalNomad,
    trip: demoTrips.asianGrandTour,
    description: 'Digital nomad working while traveling through Asia',
  },
  
  retirementTravel: {
    profile: demoProfiles.retireeCouple,
    trip: demoTrips.asianGrandTour,
    description: 'Retired couple on an extended leisure trip',
  },
};

/**
 * Utility function to get realistic form completion times for testing.
 */
export function getDemoFormCompletionTimes() {
  return {
    experienced: {
      japan: 45, // seconds
      malaysia: 60,
      singapore: 35,
    },
    firstTime: {
      japan: 180, // seconds
      malaysia: 240,
      singapore: 120,
    },
  };
}

/**
 * Common demo address data for testing address formatting.
 */
export const demoAddresses: Record<string, Address> = {
  usUrban: {
    line1: '350 Fifth Avenue',
    line2: 'Floor 34',
    city: 'New York',
    state: 'NY',
    postalCode: '10118',
    country: 'USA',
  },
  
  ukSuburban: {
    line1: '10 Downing Street',
    city: 'Westminster',
    state: 'England',
    postalCode: 'SW1A 2AA',
    country: 'GBR',
  },
  
  australianCity: {
    line1: '1 Macquarie Street',
    city: 'Sydney',
    state: 'NSW',
    postalCode: '2000',
    country: 'AUS',
  },
  
  canadianCity: {
    line1: '111 Wellington Street',
    city: 'Ottawa',
    state: 'ON',
    postalCode: 'K1A 0A6',
    country: 'CAN',
  },
  
  japaneseCity: {
    line1: '2-3-1 Otemachi',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0004',
    country: 'JPN',
  },
};

/**
 * Export everything for easy access in development and testing.
 */
export default {
  profiles: demoProfiles,
  trips: demoTrips,
  scenarios: demoScenarios,
  addresses: demoAddresses,
  generateDemoFormData,
  getDemoFormCompletionTimes,
};