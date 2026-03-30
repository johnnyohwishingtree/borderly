/**
 * Belief: Trip creation should be lightweight — name + destinations only.
 *
 * Status: hypothesis
 * Confirm: CreateTripScreen has at most trip name + country selection per leg
 * Invalidate: Users need flight/accommodation details at trip creation time for auto-fill to work
 *
 * Flight number, airline code, arrival airport, accommodation, and address
 * fields belong on the leg form (LegFormScreen), not on trip creation.
 * The create trip screen should only ask: what's the trip called, and where are you going?
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

describe('Belief: trip creation should be lightweight', () => {
  it('CreateTripScreen LegCard does not have flight detail fields', () => {
    const legCard = readFileSync(
      resolve(ROOT, 'src/screens/trips/CreateTripScreen/CreateTripScreen.LegCard.tsx'),
      'utf-8',
    );

    const flightFields = [
      'flightNumber',
      'airlineCode',
      'arrivalAirport',
    ];

    const found = flightFields.filter(f => legCard.includes(f));
    expect(found).toEqual([]);
  });

  it('CreateTripScreen LegCard does not have accommodation fields', () => {
    const legCard = readFileSync(
      resolve(ROOT, 'src/screens/trips/CreateTripScreen/CreateTripScreen.LegCard.tsx'),
      'utf-8',
    );

    const accommodationFields = [
      'AccommodationAutocomplete',
      'AddressAutocomplete',
      'accommodationName',
      'accommodationAddress',
      'accommodationPhone',
    ];

    const found = accommodationFields.filter(f => legCard.includes(f));
    expect(found).toEqual([]);
  });

  it('CreateTripScreen testIDs only include trip name, country, dates, and actions', () => {
    const testIDs = readFileSync(
      resolve(ROOT, 'src/screens/trips/CreateTripScreen/testIDs.ts'),
      'utf-8',
    );

    // These should NOT exist in create trip testIDs
    const disallowedFields = [
      'flight-number',
      'airline-code',
      'arrival-airport',
      'accommodation-name',
      'accommodation-address',
    ];

    const found = disallowedFields.filter(f => testIDs.includes(f));
    expect(found).toEqual([]);
  });
});
