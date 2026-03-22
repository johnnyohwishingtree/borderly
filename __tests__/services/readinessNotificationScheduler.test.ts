/**
 * Tests for readinessNotificationScheduler
 *
 * Covers all acceptance criteria:
 *  1. Notification scheduled 48 h before departure when overallStatus is
 *     critical or missing.
 *  2. Notification not scheduled when overallStatus is ok or warning.
 *  3. Notification cancelled when overallStatus improves to ok.
 *  4. Trigger skipped silently when 48-h window is already in the past.
 *  5. Notification ID persisted in MMKV and cleaned up on cancel.
 */

import {
  scheduleReadinessCheck,
  cancelReadinessNotification,
  readinessKey,
  buildReadinessNotificationId,
} from '../../src/services/readiness/readinessNotificationScheduler';
import {
  setNotificationProvider,
  NotificationProvider,
  ScheduleRequest,
} from '../../src/services/deadline/notificationScheduler';
import { Trip } from '../../src/types/trip';
import { TripReadiness, ReadinessItemStatus } from '../../src/services/readiness/readinessTypes';

// ---------------------------------------------------------------------------
// Mock mmkvService
// ---------------------------------------------------------------------------

const mockStore: Record<string, string> = {};

jest.mock('../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn((key: string) => mockStore[key]),
    setString: jest.fn((key: string, value: string) => {
      mockStore[key] = value;
    }),
    delete: jest.fn((key: string) => {
      delete mockStore[key];
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrip(id = 'trip-1'): Trip {
  return {
    id,
    name: 'Asia Trip',
    status: 'upcoming',
    legs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeReadiness(
  tripId: string,
  overallStatus: ReadinessItemStatus,
  departureOffsetMs: number,
): TripReadiness {
  return {
    tripId,
    overallStatus,
    items: [],
    readyCount: 0,
    totalCount: 1,
    departureDate: new Date(Date.now() + departureOffsetMs),
  };
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// ---------------------------------------------------------------------------
// Mock provider factory
// ---------------------------------------------------------------------------

function makeMockProvider() {
  const scheduled: ScheduleRequest[] = [];
  const cancelled: string[] = [];

  const provider: NotificationProvider = {
    schedule: jest.fn(async (req: ScheduleRequest) => {
      scheduled.push(req);
    }),
    cancel: jest.fn(async (id: string) => {
      cancelled.push(id);
    }),
    requestPermission: jest.fn(async () => true),
  };

  return { provider, scheduled, cancelled };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let mockProvider: ReturnType<typeof makeMockProvider>;

beforeEach(() => {
  // Clear the in-memory MMKV store
  Object.keys(mockStore).forEach(k => delete mockStore[k]);

  // Register a fresh mock provider before each test
  mockProvider = makeMockProvider();
  setNotificationProvider(mockProvider.provider);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scheduleReadinessCheck', () => {
  describe('when overallStatus is critical', () => {
    it('schedules a notification 48 h before departure', async () => {
      const trip = makeTrip();
      // Departure in 7 days — 48-h trigger is well in the future
      const readiness = makeReadiness(trip.id, 'critical', 7 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.scheduled).toHaveLength(1);
      const req = mockProvider.scheduled[0];
      expect(req.id).toBe(buildReadinessNotificationId(trip.id));
      expect(req.title).toBe('Action required before your trip');

      // Fire date should be 48 h before departure (within a 1-second tolerance)
      const expectedFireTime =
        readiness.departureDate.getTime() - 48 * MS_PER_HOUR;
      expect(Math.abs(req.fireDate.getTime() - expectedFireTime)).toBeLessThan(1000);
    });

    it('persists the notification ID in MMKV', async () => {
      const trip = makeTrip();
      const readiness = makeReadiness(trip.id, 'critical', 7 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockStore[readinessKey(trip.id)]).toBe(
        buildReadinessNotificationId(trip.id),
      );
    });
  });

  describe('when overallStatus is missing', () => {
    it('schedules a notification', async () => {
      const trip = makeTrip('trip-2');
      const readiness = makeReadiness(trip.id, 'missing', 5 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.scheduled).toHaveLength(1);
      expect(mockProvider.scheduled[0].title).toBe(
        'Action required before your trip',
      );
    });
  });

  describe('when overallStatus is ok', () => {
    it('does not schedule a notification', async () => {
      const trip = makeTrip();
      const readiness = makeReadiness(trip.id, 'ok', 7 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.scheduled).toHaveLength(0);
    });

    it('cancels a previously scheduled notification', async () => {
      const trip = makeTrip();
      const notifId = buildReadinessNotificationId(trip.id);

      // Simulate a pre-existing scheduled notification
      mockStore[readinessKey(trip.id)] = notifId;

      const readiness = makeReadiness(trip.id, 'ok', 7 * MS_PER_DAY);
      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.cancelled).toContain(notifId);
      expect(mockStore[readinessKey(trip.id)]).toBeUndefined();
    });

    it('does not call cancel when no notification was previously scheduled', async () => {
      const trip = makeTrip();
      const readiness = makeReadiness(trip.id, 'ok', 7 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.cancelled).toHaveLength(0);
    });
  });

  describe('when overallStatus is warning', () => {
    it('does not schedule a notification', async () => {
      const trip = makeTrip();
      const readiness = makeReadiness(trip.id, 'warning', 7 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.scheduled).toHaveLength(0);
    });

    it('cancels a previously scheduled notification', async () => {
      const trip = makeTrip();
      const notifId = buildReadinessNotificationId(trip.id);
      mockStore[readinessKey(trip.id)] = notifId;

      const readiness = makeReadiness(trip.id, 'warning', 7 * MS_PER_DAY);
      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.cancelled).toContain(notifId);
      expect(mockStore[readinessKey(trip.id)]).toBeUndefined();
    });
  });

  describe('when 48-h trigger window is in the past', () => {
    it('skips scheduling silently when departure is less than 48 h away', async () => {
      const trip = makeTrip();
      // Departure in 10 h — 48-h window is already past
      const readiness = makeReadiness(trip.id, 'critical', 10 * MS_PER_HOUR);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.scheduled).toHaveLength(0);
      expect(mockStore[readinessKey(trip.id)]).toBeUndefined();
    });

    it('skips scheduling silently when departure is exactly 48 h away (boundary)', async () => {
      const trip = makeTrip();
      // Departure exactly 48 h from now → trigger time = now → in the past (<=)
      const readiness = makeReadiness(trip.id, 'critical', 48 * MS_PER_HOUR);

      await scheduleReadinessCheck(trip, readiness);

      // The trigger time equals now, which is not strictly in the future, so skip
      expect(mockProvider.scheduled).toHaveLength(0);
    });

    it('skips scheduling when departure has already passed', async () => {
      const trip = makeTrip();
      // Departure was 2 days ago
      const readiness = makeReadiness(trip.id, 'critical', -2 * MS_PER_DAY);

      await scheduleReadinessCheck(trip, readiness);

      expect(mockProvider.scheduled).toHaveLength(0);
    });
  });
});

describe('cancelReadinessNotification', () => {
  it('cancels the notification and removes the MMKV key', async () => {
    const tripId = 'trip-99';
    const notifId = buildReadinessNotificationId(tripId);
    mockStore[readinessKey(tripId)] = notifId;

    await cancelReadinessNotification(tripId);

    expect(mockProvider.cancelled).toContain(notifId);
    expect(mockStore[readinessKey(tripId)]).toBeUndefined();
  });

  it('is a no-op when no notification was scheduled', async () => {
    await cancelReadinessNotification('trip-no-notif');

    expect(mockProvider.cancelled).toHaveLength(0);
  });
});

describe('readinessKey helper', () => {
  it('generates the correct MMKV key', () => {
    expect(readinessKey('trip-abc')).toBe('departure-readiness-trip-abc');
  });
});

describe('buildReadinessNotificationId helper', () => {
  it('generates a deterministic notification ID', () => {
    expect(buildReadinessNotificationId('trip-xyz')).toBe('readiness_trip-xyz');
  });
});
