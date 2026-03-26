/**
 * Tests for forms/formEngine/travelerForms
 */

import {
  getTravelerFormStatus,
  updateTravelerFormData,
  updateTravelerFormStatus,
  getOverallLegFormStatus,
} from '@/services/forms/formEngine/travelerForms';
import { TripLeg } from '@/types/trip';

// Mock formEngine to avoid pulling in full schema/profile deps
jest.mock('@/services/forms/formEngine/formEngine', () => ({
  generateFilledForm: jest.fn(),
  updateFormData: jest.fn().mockImplementation(
    (existing: Record<string, unknown>, fieldId: string, value: unknown) => ({
      ...existing,
      [fieldId]: value,
    }),
  ),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeLeg(overrides?: Partial<TripLeg>): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2026-04-01',
    formStatus: 'not_started',
    order: 0,
    assignedTravelers: ['t1', 't2'],
    travelerFormsData: [],
    ...overrides,
  } as TripLeg;
}

// ---------------------------------------------------------------------------
// getTravelerFormStatus
// ---------------------------------------------------------------------------
describe('getTravelerFormStatus', () => {
  it('returns not_started when no traveler form data exists', () => {
    expect(getTravelerFormStatus('t1', makeLeg())).toBe('not_started');
  });

  it('returns the status for a matching traveler', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't1', formData: {}, formStatus: 'ready', completionPercentage: 100 },
      ],
    });
    expect(getTravelerFormStatus('t1', leg)).toBe('ready');
  });

  it('returns not_started when traveler not found in data', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't2', formData: {}, formStatus: 'in_progress', completionPercentage: 50 },
      ],
    });
    expect(getTravelerFormStatus('t1', leg)).toBe('not_started');
  });
});

// ---------------------------------------------------------------------------
// updateTravelerFormData
// ---------------------------------------------------------------------------
describe('updateTravelerFormData', () => {
  it('creates new traveler entry when none exists', () => {
    const leg = makeLeg();
    const updated = updateTravelerFormData('t1', leg, 'surname', 'Tanaka');
    const travelerData = updated.travelerFormsData?.find(t => t.travelerId === 't1');
    expect(travelerData).toBeTruthy();
    expect(travelerData?.formData.surname).toBe('Tanaka');
    expect(travelerData?.formStatus).toBe('in_progress');
  });

  it('updates existing traveler form data', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't1', formData: { surname: 'Old' }, formStatus: 'in_progress', completionPercentage: 10 },
      ],
    });
    const updated = updateTravelerFormData('t1', leg, 'surname', 'New');
    const travelerData = updated.travelerFormsData?.find(t => t.travelerId === 't1');
    expect(travelerData?.formData.surname).toBe('New');
  });

  it('initializes travelerFormsData when empty', () => {
    const leg = makeLeg({ travelerFormsData: [] });
    const updated = updateTravelerFormData('t1', leg, 'field1', 'val');
    expect(updated.travelerFormsData).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateTravelerFormStatus
// ---------------------------------------------------------------------------
describe('updateTravelerFormStatus', () => {
  it('updates status for an existing traveler', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't1', formData: {}, formStatus: 'in_progress', completionPercentage: 50 },
      ],
    });
    const updated = updateTravelerFormStatus('t1', leg, 'ready');
    expect(updated.travelerFormsData?.find(t => t.travelerId === 't1')?.formStatus).toBe('ready');
  });

  it('creates new entry when traveler not in data', () => {
    const leg = makeLeg();
    const updated = updateTravelerFormStatus('t3', leg, 'submitted');
    expect(updated.travelerFormsData?.find(t => t.travelerId === 't3')?.formStatus).toBe('submitted');
  });
});

// ---------------------------------------------------------------------------
// getOverallLegFormStatus
// ---------------------------------------------------------------------------
describe('getOverallLegFormStatus', () => {
  it('returns not_started when no travelers assigned', () => {
    expect(getOverallLegFormStatus(makeLeg({ assignedTravelers: [] }))).toBe('not_started');
  });

  it('returns submitted when all travelers submitted', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't1', formData: {}, formStatus: 'submitted', completionPercentage: 100 },
        { travelerId: 't2', formData: {}, formStatus: 'submitted', completionPercentage: 100 },
      ],
    });
    expect(getOverallLegFormStatus(leg)).toBe('submitted');
  });

  it('returns ready when all travelers ready', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't1', formData: {}, formStatus: 'ready', completionPercentage: 100 },
        { travelerId: 't2', formData: {}, formStatus: 'ready', completionPercentage: 100 },
      ],
    });
    expect(getOverallLegFormStatus(leg)).toBe('ready');
  });

  it('returns in_progress when some travelers are in progress', () => {
    const leg = makeLeg({
      travelerFormsData: [
        { travelerId: 't1', formData: {}, formStatus: 'in_progress', completionPercentage: 50 },
        { travelerId: 't2', formData: {}, formStatus: 'not_started', completionPercentage: 0 },
      ],
    });
    expect(getOverallLegFormStatus(leg)).toBe('in_progress');
  });

  it('returns not_started when all travelers are not_started', () => {
    expect(getOverallLegFormStatus(makeLeg())).toBe('not_started');
  });
});
