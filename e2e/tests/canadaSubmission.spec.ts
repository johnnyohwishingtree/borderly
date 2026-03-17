import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Canada eTA',
  countryCode: 'CAN',
  tripName: 'Canada Trip',
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
