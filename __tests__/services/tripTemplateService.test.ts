/**
 * Unit tests for TripTemplateService
 *
 * Tests cover:
 *  - saveFromTrip: creates template with correct legs, name, id, createdAt
 *  - saveFromTrip: infers typicalDurationDays from arrival/departure dates
 *  - saveFromTrip: uses custom name when provided
 *  - saveFromTrip: defaults typicalDurationDays to 1 when no departure date
 *  - listTemplates: returns newest first
 *  - getTemplateById: returns correct template or null
 *  - renameTemplate: updates name, rejects empty name, returns null for unknown id
 *  - deleteTemplate: removes template, returns false for unknown id
 */

import {
  saveTemplateFromTrip,
  listTemplates,
  getTemplateById,
  renameTemplate,
  deleteTemplate,
} from '../../src/services/trips/tripTemplateService';
import { Trip } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Mock MMKV
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

jest.mock('../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn((key: string) => store[key]),
    setString: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
  },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Asia Trip',
    status: 'upcoming',
    legs: [
      {
        id: 'leg-1',
        tripId: 'trip-1',
        destinationCountry: 'JPN',
        arrivalDate: '2025-06-01',
        departureDate: '2025-06-05',
        accommodation: {
          name: 'Hotel Tokyo',
          address: { line1: '1 Main St', city: 'Tokyo', postalCode: '100-0001', country: 'Japan' },
        },
        formStatus: 'not_started',
        submissionStatus: 'not_started',
        order: 0,
      },
      {
        id: 'leg-2',
        tripId: 'trip-1',
        destinationCountry: 'SGP',
        arrivalDate: '2025-06-05',
        departureDate: '2025-06-08',
        accommodation: {
          name: 'Marina Bay Hotel',
          address: { line1: '2 Bay Rd', city: 'Singapore', postalCode: '018956', country: 'Singapore' },
        },
        formStatus: 'not_started',
        submissionStatus: 'not_started',
        order: 1,
      },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clear the in-memory store before each test
  Object.keys(store).forEach(k => delete store[k]);
});

// ---------------------------------------------------------------------------
// saveTemplateFromTrip
// ---------------------------------------------------------------------------

describe('saveTemplateFromTrip', () => {
  it('creates a template with correct country codes and order', () => {
    const trip = makeTrip();
    const template = saveTemplateFromTrip(trip);

    expect(template.legs).toHaveLength(2);
    expect(template.legs[0].countryCode).toBe('JPN');
    expect(template.legs[0].order).toBe(0);
    expect(template.legs[1].countryCode).toBe('SGP');
    expect(template.legs[1].order).toBe(1);
  });

  it('uses the trip name when no custom name is provided', () => {
    const trip = makeTrip({ name: 'Japan & Singapore' });
    const template = saveTemplateFromTrip(trip);
    expect(template.name).toBe('Japan & Singapore');
  });

  it('uses the provided custom name', () => {
    const trip = makeTrip();
    const template = saveTemplateFromTrip(trip, 'My Custom Template');
    expect(template.name).toBe('My Custom Template');
  });

  it('infers typicalDurationDays from arrival/departure dates', () => {
    const trip = makeTrip();
    const template = saveTemplateFromTrip(trip);

    // JPN: 2025-06-01 → 2025-06-05 = 4 days
    expect(template.legs[0].typicalDurationDays).toBe(4);
    // SGP: 2025-06-05 → 2025-06-08 = 3 days
    expect(template.legs[1].typicalDurationDays).toBe(3);
  });

  it('defaults typicalDurationDays to 1 when departure date is missing', () => {
    const trip = makeTrip();
    // Remove departure date from first leg (omit the key entirely for exactOptionalPropertyTypes)
    const { departureDate: _removed, ...legWithoutDeparture } = trip.legs[0];
    void _removed;
    trip.legs[0] = legWithoutDeparture;
    const template = saveTemplateFromTrip(trip);
    expect(template.legs[0].typicalDurationDays).toBe(1);
  });

  it('assigns a unique id and ISO createdAt timestamp', () => {
    const trip = makeTrip();
    const before = new Date().toISOString();
    const template = saveTemplateFromTrip(trip);
    const after = new Date().toISOString();

    expect(typeof template.id).toBe('string');
    expect(template.id.length).toBeGreaterThan(0);
    expect(template.createdAt >= before).toBe(true);
    expect(template.createdAt <= after).toBe(true);
  });

  it('generates unique ids for multiple saves', () => {
    const trip = makeTrip();
    const t1 = saveTemplateFromTrip(trip, 'First');
    const t2 = saveTemplateFromTrip(trip, 'Second');
    expect(t1.id).not.toBe(t2.id);
  });

  it('persists the template so listTemplates returns it', () => {
    const trip = makeTrip();
    saveTemplateFromTrip(trip, 'Persisted');
    const all = listTemplates();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Persisted');
  });

  it('handles a trip with no legs gracefully', () => {
    const trip = makeTrip({ legs: [] });
    const template = saveTemplateFromTrip(trip, 'Empty Legs');
    expect(template.legs).toHaveLength(0);
    expect(template.name).toBe('Empty Legs');
  });
});

// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------

describe('listTemplates', () => {
  it('returns an empty array when nothing is saved', () => {
    expect(listTemplates()).toEqual([]);
  });

  it('returns templates sorted newest-first', async () => {
    const trip = makeTrip();

    // Save first template, then wait a tick so timestamps differ
    saveTemplateFromTrip(trip, 'First');
    await new Promise(r => setTimeout(r, 5));
    saveTemplateFromTrip(trip, 'Second');

    const all = listTemplates();
    expect(all[0].name).toBe('Second');
    expect(all[1].name).toBe('First');
  });
});

// ---------------------------------------------------------------------------
// getTemplateById
// ---------------------------------------------------------------------------

describe('getTemplateById', () => {
  it('returns the template with the matching id', () => {
    const trip = makeTrip();
    const saved = saveTemplateFromTrip(trip, 'Find Me');
    const found = getTemplateById(saved.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Find Me');
  });

  it('returns null for an unknown id', () => {
    expect(getTemplateById('does-not-exist')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// renameTemplate
// ---------------------------------------------------------------------------

describe('renameTemplate', () => {
  it('renames a template and returns the updated template', () => {
    const trip = makeTrip();
    const saved = saveTemplateFromTrip(trip, 'Old Name');
    const updated = renameTemplate(saved.id, 'New Name');

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('New Name');

    // Confirm the updated name is persisted
    expect(getTemplateById(saved.id)!.name).toBe('New Name');
  });

  it('trims whitespace from the new name', () => {
    const trip = makeTrip();
    const saved = saveTemplateFromTrip(trip, 'Trim Me');
    const updated = renameTemplate(saved.id, '  Trimmed  ');
    expect(updated!.name).toBe('Trimmed');
  });

  it('returns null and does not update when new name is empty', () => {
    const trip = makeTrip();
    const saved = saveTemplateFromTrip(trip, 'Stay Same');
    const result = renameTemplate(saved.id, '   ');
    expect(result).toBeNull();
    expect(getTemplateById(saved.id)!.name).toBe('Stay Same');
  });

  it('returns null for an unknown id', () => {
    expect(renameTemplate('ghost-id', 'Ghost')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteTemplate
// ---------------------------------------------------------------------------

describe('deleteTemplate', () => {
  it('deletes an existing template and returns true', () => {
    const trip = makeTrip();
    const saved = saveTemplateFromTrip(trip, 'To Delete');
    const result = deleteTemplate(saved.id);

    expect(result).toBe(true);
    expect(getTemplateById(saved.id)).toBeNull();
    expect(listTemplates()).toHaveLength(0);
  });

  it('returns false for an unknown id', () => {
    expect(deleteTemplate('unknown-id')).toBe(false);
  });

  it('only removes the targeted template', () => {
    const trip = makeTrip();
    const t1 = saveTemplateFromTrip(trip, 'Keep');
    const t2 = saveTemplateFromTrip(trip, 'Remove');

    deleteTemplate(t2.id);

    const remaining = listTemplates();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(t1.id);
  });
});
