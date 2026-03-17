import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'UK ETA',
  countryCode: 'GBR',
  tripName: 'UK Trip',
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
