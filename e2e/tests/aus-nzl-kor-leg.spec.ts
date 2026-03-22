import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Australia Leg',
  countryCode: 'AUS',
  tripName: 'AUS Leg Trip',
  flightNumber: 'QF001',
  airlineCode: 'QF',
  arrivalDate: '2026-07-15',
  departureDate: '2026-07-25',
  accommodation: {
    name: 'Park Hyatt Sydney',
    address: {
      street: '7 Hickson Road',
      city: 'Sydney',
      country: 'Australia',
      postalCode: '2000',
    },
  },
});

createCountrySubmissionTests({
  suiteName: 'New Zealand Leg',
  countryCode: 'NZL',
  tripName: 'NZL Leg Trip',
  flightNumber: 'NZ105',
  airlineCode: 'NZ',
  arrivalDate: '2026-08-20',
  departureDate: '2026-08-30',
  accommodation: {
    name: 'The Langham Auckland',
    address: {
      street: '83 Symonds Street',
      city: 'Auckland',
      country: 'New Zealand',
      postalCode: '1010',
    },
  },
});

createCountrySubmissionTests({
  suiteName: 'South Korea Leg',
  countryCode: 'KOR',
  tripName: 'KOR Leg Trip',
  flightNumber: 'KE603',
  airlineCode: 'KE',
  arrivalDate: '2026-09-05',
  departureDate: '2026-09-15',
  accommodation: {
    name: 'Lotte Hotel Seoul',
    address: {
      street: '30 Eulji-ro',
      city: 'Seoul',
      country: 'South Korea',
      postalCode: '04560',
    },
  },
});
