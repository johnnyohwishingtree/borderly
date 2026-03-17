import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Vietnam E-Visa',
  countryCode: 'VNM',
  tripName: 'Vietnam Trip',
  flightNumber: 'VN300',
  airlineCode: 'VN',
  arrivalDate: '2026-12-01',
  departureDate: '2026-12-14',
  accommodation: {
    name: 'Sofitel Legend Metropole',
    address: {
      street: '15 Ngo Quyen Street',
      city: 'Hanoi',
      country: 'Vietnam',
      postalCode: '100000',
    },
  },
});
