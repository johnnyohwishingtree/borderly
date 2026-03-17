import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'USA ESTA',
  countryCode: 'USA',
  tripName: 'USA Trip',
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
