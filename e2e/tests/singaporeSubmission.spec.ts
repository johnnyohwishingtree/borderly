import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Singapore SG Arrival Card',
  countryCode: 'SGP',
  tripName: 'Singapore Trip',
  flightNumber: 'SQ25',
  airlineCode: 'SQ',
  arrivalDate: '2026-09-05',
  departureDate: '2026-09-12',
  accommodation: {
    name: 'Marina Bay Sands',
    address: {
      street: '10 Bayfront Avenue',
      city: 'Singapore',
      country: 'Singapore',
      postalCode: '018956',
    },
  },
});
