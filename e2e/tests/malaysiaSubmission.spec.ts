import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Malaysia MDAC',
  countryCode: 'MYS',
  tripName: 'Malaysia Trip',
  flightNumber: 'MH88',
  airlineCode: 'MH',
  arrivalDate: '2026-07-10',
  departureDate: '2026-07-20',
  accommodation: {
    name: 'Mandarin Oriental Kuala Lumpur',
    address: {
      street: 'Kuala Lumpur City Centre',
      city: 'Kuala Lumpur',
      country: 'Malaysia',
      postalCode: '50088',
    },
  },
});
