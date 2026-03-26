/**
 * Tests for tripModelMapper: mapTripModelToTrip
 */

import { mapTripModelToTrip } from '../../src/stores/tripModelMapper';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createTripModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    name: 'Asia Trip',
    status: 'upcoming',
    createdAtISO: '2025-06-01T00:00:00.000Z',
    updatedAtISO: '2025-06-02T00:00:00.000Z',
    ...overrides,
  };
}

function createLegModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leg-1',
    destinationCountry: 'JPN',
    arrivalDateISO: '2025-07-01',
    departureDateISO: '2025-07-10',
    flightNumber: 'NH123',
    airlineCode: 'NH',
    arrivalAirport: 'NRT',
    accommodation: { name: 'Hotel Tokyo', address: {} },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    formData: { field1: 'value1' },
    order: 0,
    assignedTravelers: ['t1'],
    travelerFormsData: [{ travelerId: 't1', formData: {} }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapTripModelToTrip
// ---------------------------------------------------------------------------

describe('mapTripModelToTrip', () => {
  it('maps trip model fields correctly', () => {
    const tripModel = createTripModel();
    const result = mapTripModelToTrip(tripModel, []);

    expect(result.id).toBe('trip-1');
    expect(result.name).toBe('Asia Trip');
    expect(result.status).toBe('upcoming');
    expect(result.createdAt).toBe('2025-06-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2025-06-02T00:00:00.000Z');
    expect(result.legs).toEqual([]);
  });

  it('maps leg model fields correctly', () => {
    const tripModel = createTripModel();
    const legModel = createLegModel();
    const result = mapTripModelToTrip(tripModel, [legModel]);

    expect(result.legs).toHaveLength(1);
    const leg = result.legs[0];
    expect(leg.id).toBe('leg-1');
    expect(leg.tripId).toBe('trip-1');
    expect(leg.destinationCountry).toBe('JPN');
    expect(leg.arrivalDate).toBe('2025-07-01');
    expect(leg.departureDate).toBe('2025-07-10');
    expect(leg.flightNumber).toBe('NH123');
    expect(leg.airlineCode).toBe('NH');
    expect(leg.arrivalAirport).toBe('NRT');
    expect(leg.accommodation).toEqual({ name: 'Hotel Tokyo', address: {} });
    expect(leg.formStatus).toBe('not_started');
    expect(leg.submissionStatus).toBe('not_started');
    expect(leg.formData).toEqual({ field1: 'value1' });
    expect(leg.order).toBe(0);
    expect(leg.qrCodes).toEqual([]);
    expect(leg.assignedTravelers).toEqual(['t1']);
    expect(leg.travelerFormsData).toEqual([{ travelerId: 't1', formData: {} }]);
  });

  it('maps multiple legs preserving order', () => {
    const tripModel = createTripModel();
    const leg1 = createLegModel({ id: 'leg-1', order: 0 });
    const leg2 = createLegModel({ id: 'leg-2', order: 1, destinationCountry: 'SGP' });

    const result = mapTripModelToTrip(tripModel, [leg1, leg2]);
    expect(result.legs).toHaveLength(2);
    expect(result.legs[0].id).toBe('leg-1');
    expect(result.legs[1].id).toBe('leg-2');
    expect(result.legs[1].destinationCountry).toBe('SGP');
  });

  it('defaults submissionStatus to not_started when missing', () => {
    const tripModel = createTripModel();
    const legModel = createLegModel({ submissionStatus: undefined });

    const result = mapTripModelToTrip(tripModel, [legModel]);
    expect(result.legs[0].submissionStatus).toBe('not_started');
  });

  it('defaults assignedTravelers to empty array when missing', () => {
    const tripModel = createTripModel();
    const legModel = createLegModel({ assignedTravelers: undefined });

    const result = mapTripModelToTrip(tripModel, [legModel]);
    expect(result.legs[0].assignedTravelers).toEqual([]);
  });

  it('defaults travelerFormsData to empty array when missing', () => {
    const tripModel = createTripModel();
    const legModel = createLegModel({ travelerFormsData: undefined });

    const result = mapTripModelToTrip(tripModel, [legModel]);
    expect(result.legs[0].travelerFormsData).toEqual([]);
  });

  it('always sets qrCodes to empty array', () => {
    const tripModel = createTripModel();
    const legModel = createLegModel();

    const result = mapTripModelToTrip(tripModel, [legModel]);
    expect(result.legs[0].qrCodes).toEqual([]);
  });
});
