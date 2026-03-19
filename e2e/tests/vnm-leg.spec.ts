import { createCountrySubmissionTests } from '../helpers';

createCountrySubmissionTests({
  suiteName: 'Vietnam Leg',
  countryCode: 'VNM',
  tripName: 'VNM Leg Trip',
  flightNumber: 'VN214',
  airlineCode: 'VN',
  arrivalDate: '2026-10-05',
  departureDate: '2026-10-18',
  accommodation: {
    name: 'Park Hyatt Saigon',
    address: {
      street: '2 Lam Son Square',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      postalCode: '700000',
    },
  },
});
