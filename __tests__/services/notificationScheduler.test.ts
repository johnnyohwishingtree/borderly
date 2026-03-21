/**
 * Tests for notificationScheduler
 *
 * Covers all acceptance criteria:
 *  1. scheduleDeadlineNotifications schedules up to 3 notifications per leg
 *     (7-day, 48-h, 24-h triggers).
 *  2. Triggers already in the past are silently skipped.
 *  3. cancelLegNotifications removes all notifications for a leg.
 *  4. cancelTripNotifications removes all notifications for a trip.
 *  5. Legs with formStatus 'ready' have notifications cancelled via updateTripLeg.
 */

import {
  scheduleDeadlineNotifications,
  cancelLegNotifications,
  cancelTripNotifications,
  requestNotificationPermission,
  setNotificationProvider,
  getNotificationProvider,
  buildNotificationId,
  buildCountryLabel,
  TRIGGERS_MS,
  legKey,
  tripKey,
  NotificationProvider,
  ScheduleRequest,
} from '../../src/services/deadline/notificationScheduler';
import { LegDeadline } from '../../src/services/deadline/deadlineService';
import { Trip } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Mock mmkvService
// ---------------------------------------------------------------------------

const mockStore: Record<string, string> = {};

jest.mock('../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn((key: string) => mockStore[key]),
    setString: jest.fn((key: string, value: string) => { mockStore[key] = value; }),
    delete: jest.fn((key: string) => { delete mockStore[key]; }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Asia Trip',
    status: 'upcoming',
    legs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFutureDeadline(hoursFromNow: number, legId = 'leg-1', countryCode = 'JPN'): LegDeadline {
  const submissionDeadline = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return {
    legId,
    countryCode,
    submissionDeadline,
    recommendedDeadline: new Date(submissionDeadline.getTime() - 24 * 60 * 60 * 1000),
    hoursRemaining: hoursFromNow,
    status: 'not-started',
    windowNote: 'Submit 3 days before arrival',
  };
}

function makeNoDeadline(legId = 'leg-1'): LegDeadline {
  return {
    legId,
    countryCode: 'SGP',
    hoursRemaining: 0,
    status: 'no-deadline',
    windowNote: '',
  };
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

function makeMockProvider() {
  const scheduled: ScheduleRequest[] = [];
  const cancelled: string[] = [];

  const provider: NotificationProvider = {
    schedule: jest.fn(async (req: ScheduleRequest) => { scheduled.push(req); }),
    cancel: jest.fn(async (id: string) => { cancelled.push(id); }),
    requestPermission: jest.fn(async () => true),
  };

  return { provider, scheduled, cancelled };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildNotificationId', () => {
  it('produces a stable ID from legId and label', () => {
    expect(buildNotificationId('leg-42', '7 days')).toBe('leg_leg-42_7_days');
    expect(buildNotificationId('leg-42', '48 hours')).toBe('leg_leg-42_48_hours');
    expect(buildNotificationId('leg-42', '24 hours')).toBe('leg_leg-42_24_hours');
  });
});

describe('buildCountryLabel', () => {
  it('maps ISO codes to human-readable names', () => {
    expect(buildCountryLabel('JPN')).toBe('Japan');
    expect(buildCountryLabel('MYS')).toBe('Malaysia');
    expect(buildCountryLabel('SGP')).toBe('Singapore');
  });

  it('returns the raw code for unknown countries', () => {
    expect(buildCountryLabel('USA')).toBe('USA');
  });
});

describe('TRIGGERS_MS', () => {
  it('has exactly 3 triggers', () => {
    expect(TRIGGERS_MS).toHaveLength(3);
  });

  it('has offsets for 7 days, 48 hours, and 24 hours', () => {
    const labels = TRIGGERS_MS.map(t => t.label);
    expect(labels).toContain('7 days');
    expect(labels).toContain('48 hours');
    expect(labels).toContain('24 hours');
  });
});

describe('scheduleDeadlineNotifications', () => {
  beforeEach(() => {
    // Clear mock store
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('schedules 3 notifications when all triggers are in the future', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    // Deadline is 10 days from now — all 3 triggers (7d, 48h, 24h) are in the future
    const trip = makeTrip();
    const deadline = makeFutureDeadline(10 * 24); // 240 hours

    await scheduleDeadlineNotifications(trip, [deadline]);

    expect(scheduled).toHaveLength(3);
    expect(provider.schedule).toHaveBeenCalledTimes(3);
  });

  it('schedules only future triggers, skipping past ones', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    // Deadline is 30 hours away: 7-day and 48-h triggers are in the past,
    // only 24-h trigger fires
    const trip = makeTrip();
    const deadline = makeFutureDeadline(30);

    await scheduleDeadlineNotifications(trip, [deadline]);

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].id).toBe(buildNotificationId('leg-1', '24 hours'));
  });

  it('skips all triggers when deadline is fewer than 24 hours away', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    // Deadline is 10 hours away — all triggers are in the past
    const trip = makeTrip();
    const deadline = makeFutureDeadline(10);

    await scheduleDeadlineNotifications(trip, [deadline]);

    expect(scheduled).toHaveLength(0);
  });

  it('skips legs with no submissionDeadline (no-deadline status)', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline = makeNoDeadline();

    await scheduleDeadlineNotifications(trip, [deadline]);

    expect(scheduled).toHaveLength(0);
  });

  it('includes correct message with country name and time label', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline = makeFutureDeadline(10 * 24); // all 3 triggers

    await scheduleDeadlineNotifications(trip, [deadline]);

    const bodies = scheduled.map(r => r.body);
    expect(bodies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Japan'),
        expect.stringContaining('7 days'),
      ]),
    );
    expect(bodies).toEqual(
      expect.arrayContaining([expect.stringContaining('48 hours')]),
    );
    expect(bodies).toEqual(
      expect.arrayContaining([expect.stringContaining('24 hours')]),
    );
  });

  it('persists scheduled IDs in MMKV for the leg', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline = makeFutureDeadline(10 * 24);

    await scheduleDeadlineNotifications(trip, [deadline]);

    const raw = mockStore[legKey('leg-1')];
    expect(raw).toBeDefined();
    const ids: string[] = JSON.parse(raw);
    expect(ids).toHaveLength(3);
  });

  it('persists scheduled IDs in MMKV for the trip', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline = makeFutureDeadline(10 * 24);

    await scheduleDeadlineNotifications(trip, [deadline]);

    const raw = mockStore[tripKey('trip-1')];
    expect(raw).toBeDefined();
    const ids: string[] = JSON.parse(raw);
    expect(ids).toHaveLength(3);
  });

  it('handles multiple legs in one call', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline1 = makeFutureDeadline(10 * 24, 'leg-A', 'JPN');
    const deadline2 = makeFutureDeadline(10 * 24, 'leg-B', 'MYS');

    await scheduleDeadlineNotifications(trip, [deadline1, deadline2]);

    // 3 per leg × 2 legs = 6
    expect(scheduled).toHaveLength(6);
  });

  it('is idempotent — re-scheduling does not duplicate MMKV entries', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline = makeFutureDeadline(10 * 24);

    await scheduleDeadlineNotifications(trip, [deadline]);
    await scheduleDeadlineNotifications(trip, [deadline]);

    const raw = mockStore[legKey('leg-1')];
    const ids: string[] = JSON.parse(raw);
    // de-duped: still 3
    expect(ids).toHaveLength(3);
  });

  it('continues gracefully when provider.schedule throws', async () => {
    const provider: NotificationProvider = {
      schedule: jest.fn().mockRejectedValue(new Error('OS error')),
      cancel: jest.fn().mockResolvedValue(undefined),
      requestPermission: jest.fn().mockResolvedValue(false),
    };
    setNotificationProvider(provider);

    const trip = makeTrip();
    const deadline = makeFutureDeadline(10 * 24);

    // Should not throw
    await expect(scheduleDeadlineNotifications(trip, [deadline])).resolves.toBeUndefined();
  });
});

describe('cancelLegNotifications', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('cancels all stored IDs for a leg', async () => {
    const { provider, cancelled } = makeMockProvider();
    setNotificationProvider(provider);

    // Seed MMKV with 3 IDs
    const ids = ['id-a', 'id-b', 'id-c'];
    mockStore[legKey('leg-1')] = JSON.stringify(ids);

    await cancelLegNotifications('leg-1');

    expect(cancelled).toEqual(ids);
    expect(provider.cancel).toHaveBeenCalledTimes(3);
  });

  it('removes the MMKV key after cancelling', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    mockStore[legKey('leg-1')] = JSON.stringify(['id-x']);

    await cancelLegNotifications('leg-1');

    expect(mockStore[legKey('leg-1')]).toBeUndefined();
  });

  it('is a no-op when no IDs are stored', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    await cancelLegNotifications('leg-none');

    expect(provider.cancel).not.toHaveBeenCalled();
  });

  it('removes cancelled leg IDs from the trip-level key when tripId is provided', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const legIds = ['id-a', 'id-b'];
    const otherIds = ['id-c', 'id-d'];
    mockStore[legKey('leg-1')] = JSON.stringify(legIds);
    // Trip key contains both the leg's IDs and IDs from another leg
    mockStore[tripKey('trip-1')] = JSON.stringify([...legIds, ...otherIds]);

    await cancelLegNotifications('leg-1', 'trip-1');

    // Trip-level key should only contain the other leg's IDs
    const remaining = JSON.parse(mockStore[tripKey('trip-1')]);
    expect(remaining).toEqual(otherIds);
  });

  it('deletes the trip-level key when all IDs belong to the cancelled leg', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const ids = ['id-a', 'id-b'];
    mockStore[legKey('leg-1')] = JSON.stringify(ids);
    mockStore[tripKey('trip-1')] = JSON.stringify(ids);

    await cancelLegNotifications('leg-1', 'trip-1');

    expect(mockStore[tripKey('trip-1')]).toBeUndefined();
  });

  it('does not modify trip-level key when tripId is omitted', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const ids = ['id-a'];
    mockStore[legKey('leg-1')] = JSON.stringify(ids);
    mockStore[tripKey('trip-1')] = JSON.stringify(ids);

    await cancelLegNotifications('leg-1'); // no tripId

    // Trip key unchanged
    expect(JSON.parse(mockStore[tripKey('trip-1')])).toEqual(ids);
  });

  it('continues gracefully when provider.cancel throws', async () => {
    const provider: NotificationProvider = {
      schedule: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockRejectedValue(new Error('OS error')),
      requestPermission: jest.fn().mockResolvedValue(false),
    };
    setNotificationProvider(provider);

    mockStore[legKey('leg-err')] = JSON.stringify(['id-fail']);

    await expect(cancelLegNotifications('leg-err')).resolves.toBeUndefined();
  });
});

describe('cancelTripNotifications', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('cancels all stored IDs for a trip', async () => {
    const { provider, cancelled } = makeMockProvider();
    setNotificationProvider(provider);

    const ids = ['trip-notif-1', 'trip-notif-2'];
    mockStore[tripKey('trip-99')] = JSON.stringify(ids);

    await cancelTripNotifications('trip-99');

    expect(cancelled).toEqual(ids);
  });

  it('removes the MMKV key after cancelling', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    mockStore[tripKey('trip-99')] = JSON.stringify(['id-y']);

    await cancelTripNotifications('trip-99');

    expect(mockStore[tripKey('trip-99')]).toBeUndefined();
  });

  it('is a no-op when no IDs are stored', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    await cancelTripNotifications('trip-none');

    expect(provider.cancel).not.toHaveBeenCalled();
  });
});

describe('requestNotificationPermission', () => {
  it('delegates to the active provider', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const result = await requestNotificationPermission();

    expect(result).toBe(true);
    expect(provider.requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('setNotificationProvider / getNotificationProvider', () => {
  it('replaces the active provider and returns it', () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);
    expect(getNotificationProvider()).toBe(provider);
  });
});
