import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Thailand Leg',
  countryCode: 'THA',
  tripName: 'THA Leg Trip',
  flightNumber: 'TG402',
  airlineCode: 'TG',
  arrivalDate: '2026-09-10',
  departureDate: '2026-09-20',
  accommodation: {
    name: 'Mandarin Oriental Bangkok',
    address: {
      street: '48 Oriental Avenue',
      city: 'Bangkok',
      country: 'Thailand',
      postalCode: '10500',
    },
  },
});
