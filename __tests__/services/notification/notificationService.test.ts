/**
 * Tests for the notifee-backed NotificationProvider and the
 * notification scheduler logic (schedule, skip overdue, skip submitted, cancel).
 */

import { PushNotificationProvider } from '@/services/notification/notificationService';
import {
  scheduleDeadlineNotifications,
  cancelTripNotifications,
  cancelLegNotifications,
  setNotificationProvider,
  getNotificationProvider,
  buildNotificationId,
  buildCountryLabel,
  TRIGGERS_MS,
  type NotificationProvider,
  type ScheduleRequest,
} from '@/services/deadline/notificationScheduler';
import type { Trip } from '@/types/trip';
import type { LegDeadline } from '@/services/deadline/deadlineService';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/storage/mmkv', () => {
  const store = new Map<string, string>();
  return {
    mmkvService: {
      getString: (key: string) => store.get(key) ?? null,
      setString: (key: string, value: string) => store.set(key, value),
      delete: (key: string) => store.delete(key),
      __clear: () => store.clear(),
    },
  };
});

jest.mock('@/constants/countries', () => ({
  getCountryName: (code: string) => {
    const names: Record<string, string> = { JPN: 'Japan', SGP: 'Singapore', MYS: 'Malaysia', THA: 'Thailand' };
    return names[code] || '';
  },
}));

const getMmkvMock = () =>
  jest.requireMock('@/services/storage/mmkv') as {
    mmkvService: { __clear: () => void };
  };

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 60 * 60 * 1000;

function futureDate(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * MS_PER_HOUR);
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip_1',
    name: 'Asia Trip',
    status: 'upcoming',
    legs: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeDeadline(overrides: Partial<LegDeadline> = {}): LegDeadline {
  return {
    legId: 'leg_1',
    countryCode: 'JPN',
    submissionDeadline: futureDate(72),
    hoursRemaining: 72,
    status: 'not-started',
    windowNote: 'Submit 72h before',
    ...overrides,
  };
}

// ── Mock provider ────────────────────────────────────────────────────────────

function createMockProvider(): NotificationProvider & {
  scheduledRequests: ScheduleRequest[];
  cancelledIds: string[];
} {
  const scheduledRequests: ScheduleRequest[] = [];
  const cancelledIds: string[] = [];
  return {
    scheduledRequests,
    cancelledIds,
    schedule: jest.fn(async (req: ScheduleRequest) => {
      scheduledRequests.push(req);
    }),
    cancel: jest.fn(async (id: string) => {
      cancelledIds.push(id);
    }),
    requestPermission: jest.fn(async () => true),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PushNotificationProvider', () => {
  it('implements NotificationProvider interface', () => {
    const provider = new PushNotificationProvider();
    expect(typeof provider.schedule).toBe('function');
    expect(typeof provider.cancel).toBe('function');
    expect(typeof provider.requestPermission).toBe('function');
  });
});

describe('notificationScheduler', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;
  let originalProvider: NotificationProvider;

  beforeEach(() => {
    getMmkvMock().mmkvService.__clear();
    originalProvider = getNotificationProvider();
    mockProvider = createMockProvider();
    setNotificationProvider(mockProvider);
  });

  afterEach(() => {
    setNotificationProvider(originalProvider);
  });

  describe('buildNotificationId', () => {
    it('creates an ID from legId and label', () => {
      expect(buildNotificationId('leg_1', '48 hours')).toBe('leg_leg_1_48_hours');
    });
  });

  describe('buildCountryLabel', () => {
    it('returns country name for known codes', () => {
      expect(buildCountryLabel('JPN')).toBe('Japan');
      expect(buildCountryLabel('SGP')).toBe('Singapore');
    });

    it('falls back to code for unknown countries', () => {
      expect(buildCountryLabel('XYZ')).toBe('XYZ');
    });
  });

  describe('TRIGGERS_MS', () => {
    it('has 3 trigger offsets at 48h, 24h, and 6h', () => {
      expect(TRIGGERS_MS).toHaveLength(3);
      expect(TRIGGERS_MS[0].label).toBe('48 hours');
      expect(TRIGGERS_MS[1].label).toBe('24 hours');
      expect(TRIGGERS_MS[2].label).toBe('6 hours');
      expect(TRIGGERS_MS[0].offsetMs).toBe(48 * MS_PER_HOUR);
      expect(TRIGGERS_MS[1].offsetMs).toBe(24 * MS_PER_HOUR);
      expect(TRIGGERS_MS[2].offsetMs).toBe(6 * MS_PER_HOUR);
    });
  });

  describe('scheduleDeadlineNotifications', () => {
    it('schedules notifications for a future deadline', async () => {
      const trip = makeTrip();
      const deadline = makeDeadline({ submissionDeadline: futureDate(72) });

      await scheduleDeadlineNotifications(trip, [deadline]);

      // All 3 triggers should fire (72h - 48h = 24h from now, etc.)
      expect(mockProvider.schedule).toHaveBeenCalledTimes(3);
      expect(mockProvider.scheduledRequests[0].title).toContain('Japan');
      expect(mockProvider.scheduledRequests[0].title).toContain('Asia Trip');
      expect(mockProvider.scheduledRequests[0].data).toEqual({
        tripId: 'trip_1',
        legId: 'leg_1',
        screen: 'LegForm',
      });
    });

    it('includes trip name and country in notification title', async () => {
      const trip = makeTrip({ name: 'My Holiday' });
      const deadline = makeDeadline({ countryCode: 'SGP', submissionDeadline: futureDate(72) });

      await scheduleDeadlineNotifications(trip, [deadline]);

      expect(mockProvider.scheduledRequests[0].title).toBe('My Holiday — Singapore form due in 48 hours');
    });

    it('skips triggers already in the past', async () => {
      const trip = makeTrip();
      // Deadline is 5 hours from now — only the 6h trigger fires (but 6h offset > 5h, so it's in the past)
      // Actually: fireDate = deadline - offset. If deadline is 5h from now:
      // 48h trigger: 5h - 48h = -43h (past) → skip
      // 24h trigger: 5h - 24h = -19h (past) → skip
      // 6h trigger: 5h - 6h = -1h (past) → skip
      const deadline = makeDeadline({ submissionDeadline: futureDate(5) });

      await scheduleDeadlineNotifications(trip, [deadline]);

      expect(mockProvider.schedule).not.toHaveBeenCalled();
    });

    it('skips only past triggers, schedules future ones', async () => {
      const trip = makeTrip();
      // Deadline is 30h from now:
      // 48h trigger: 30h - 48h = -18h (past) → skip
      // 24h trigger: 30h - 24h = 6h (future) → schedule
      // 6h trigger: 30h - 6h = 24h (future) → schedule
      const deadline = makeDeadline({ submissionDeadline: futureDate(30) });

      await scheduleDeadlineNotifications(trip, [deadline]);

      expect(mockProvider.schedule).toHaveBeenCalledTimes(2);
    });

    it('skips deadlines with no submissionDeadline', async () => {
      const trip = makeTrip();
      const { submissionDeadline: _, ...rest } = makeDeadline();
      const deadline: LegDeadline = {
        ...rest,
        status: 'no-deadline',
      };

      await scheduleDeadlineNotifications(trip, [deadline]);

      expect(mockProvider.schedule).not.toHaveBeenCalled();
    });

    it('skips legs with ready status', async () => {
      const trip = makeTrip();
      const deadline = makeDeadline({
        status: 'ready',
        submissionDeadline: futureDate(72),
      });

      await scheduleDeadlineNotifications(trip, [deadline]);

      expect(mockProvider.schedule).not.toHaveBeenCalled();
    });

    it('skips legs with overdue status', async () => {
      const trip = makeTrip();
      const deadline = makeDeadline({
        status: 'overdue',
        submissionDeadline: futureDate(72),
      });

      await scheduleDeadlineNotifications(trip, [deadline]);

      expect(mockProvider.schedule).not.toHaveBeenCalled();
    });

    it('schedules for multiple deadlines', async () => {
      const trip = makeTrip();
      const deadlines = [
        makeDeadline({ legId: 'leg_1', countryCode: 'JPN', submissionDeadline: futureDate(72) }),
        makeDeadline({ legId: 'leg_2', countryCode: 'SGP', submissionDeadline: futureDate(72) }),
      ];

      await scheduleDeadlineNotifications(trip, deadlines);

      // 3 triggers × 2 legs = 6
      expect(mockProvider.schedule).toHaveBeenCalledTimes(6);
    });
  });

  describe('cancelTripNotifications', () => {
    it('cancels all notifications for a trip', async () => {
      const trip = makeTrip();
      const deadline = makeDeadline({ submissionDeadline: futureDate(72) });

      await scheduleDeadlineNotifications(trip, [deadline]);
      expect(mockProvider.scheduledRequests.length).toBeGreaterThan(0);

      await cancelTripNotifications('trip_1');

      expect(mockProvider.cancel).toHaveBeenCalledTimes(3);
    });

    it('is a no-op when no notifications exist', async () => {
      await cancelTripNotifications('nonexistent');

      expect(mockProvider.cancel).not.toHaveBeenCalled();
    });
  });

  describe('cancelLegNotifications', () => {
    it('cancels notifications for a specific leg', async () => {
      const trip = makeTrip();
      const deadlines = [
        makeDeadline({ legId: 'leg_1', submissionDeadline: futureDate(72) }),
        makeDeadline({ legId: 'leg_2', submissionDeadline: futureDate(72) }),
      ];

      await scheduleDeadlineNotifications(trip, deadlines);

      await cancelLegNotifications('leg_1', 'trip_1');

      // Only leg_1's 3 notifications cancelled
      expect(mockProvider.cancel).toHaveBeenCalledTimes(3);
      expect(mockProvider.cancelledIds.every(id => id.includes('leg_1'))).toBe(true);
    });
  });
});
