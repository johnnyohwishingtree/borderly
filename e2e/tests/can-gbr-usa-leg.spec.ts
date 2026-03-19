import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Canada Leg',
  countryCode: 'CAN',
  tripName: 'CAN Leg Trip',
  flightNumber: 'AC302',
  airlineCode: 'AC',
  arrivalDate: '2026-08-01',
  departureDate: '2026-08-10',
  accommodation: {
    name: 'Toronto Grand Hotel',
    address: {
      street: '100 Front Street',
      city: 'Toronto',
      country: 'Canada',
      postalCode: 'M5J 1E3',
    },
  },
});

createCountrySubmissionTests({
  suiteName: 'UK Leg',
  countryCode: 'GBR',
  tripName: 'GBR Leg Trip',
  flightNumber: 'BA178',
  airlineCode: 'BA',
  arrivalDate: '2026-06-15',
  departureDate: '2026-06-25',
  accommodation: {
    name: 'The Savoy',
    address: {
      street: 'Strand',
      city: 'London',
      country: 'United Kingdom',
      postalCode: 'WC2R 0EZ',
    },
  },
});

createCountrySubmissionTests({
  suiteName: 'USA Leg',
  countryCode: 'USA',
  tripName: 'USA Leg Trip',
  flightNumber: 'AA100',
  airlineCode: 'AA',
  arrivalDate: '2026-10-01',
  departureDate: '2026-10-15',
  profileNationality: 'GBR',
  profileIssuingCountry: 'GBR',
  accommodation: {
    name: 'The Plaza Hotel',
    address: {
      street: '768 Fifth Avenue',
      city: 'New York',
      country: 'United States',
      postalCode: '10019',
    },
  },
});
