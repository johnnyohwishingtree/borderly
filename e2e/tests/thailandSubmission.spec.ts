import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Thailand TM6',
  countryCode: 'THA',
  tripName: 'Thailand Trip',
  flightNumber: 'TG660',
  airlineCode: 'TG',
  arrivalDate: '2026-11-01',
  departureDate: '2026-11-14',
  accommodation: {
    name: 'Shangri-La Bangkok',
    address: {
      street: '89 Soi Wat Suan Plu',
      city: 'Bangkok',
      country: 'Thailand',
      postalCode: '10500',
    },
  },
});
