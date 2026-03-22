/**
 * Tests for passportExpiryNotifications
 *
 * Covers all acceptance criteria:
 *  1. schedulePassportExpiryNotifications schedules up to 4 notifications per
 *     profile (6mo, 3mo, 1mo, 1wk before passport expiry).
 *  2. Triggers already in the past are silently skipped.
 *  3. Notification IDs are persisted in MMKV keyed by profile ID.
 *  4. Old notifications are cancelled before rescheduling (idempotent).
 *  5. cancelPassportExpiryNotifications removes all notifications for a profile.
 *  6. scheduleAllProfilePassportExpiry processes multiple profiles.
 */

import {
  schedulePassportExpiryNotifications,
  cancelPassportExpiryNotifications,
  scheduleAllProfilePassportExpiry,
  buildPassportNotificationId,
  profilePassportKey,
  PASSPORT_TRIGGERS,
  computeFireDate,
} from '../../src/services/deadline/passportExpiryNotifications';
import {
  setNotificationProvider,
  NotificationProvider,
  ScheduleRequest,
} from '../../src/services/deadline/notificationScheduler';
import { TravelerProfile } from '../../src/types/profile';

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function makeFutureProfile(daysUntilExpiry: number, id = 'profile-1'): TravelerProfile {
  const expiry = new Date(Date.now() + daysUntilExpiry * MS_PER_DAY);
  return {
    id,
    passportNumber: 'AB123456',
    surname: 'Traveller',
    givenNames: 'Test',
    nationality: 'AUS',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    passportExpiry: expiry.toISOString().split('T')[0],
    issuingCountry: 'AUS',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makePastProfile(id = 'profile-expired'): TravelerProfile {
  // Passport expired yesterday
  const expiry = new Date(Date.now() - MS_PER_DAY);
  return {
    ...makeFutureProfile(0, id),
    passportExpiry: expiry.toISOString().split('T')[0],
  };
}

// ---------------------------------------------------------------------------
// Provider factory
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
// Tests
// ---------------------------------------------------------------------------

describe('buildPassportNotificationId', () => {
  it('produces a stable ID from profileId and label', () => {
    expect(buildPassportNotificationId('profile-1', '6 months')).toBe(
      'passport_expiry_profile-1_6_months',
    );
    expect(buildPassportNotificationId('profile-1', '3 months')).toBe(
      'passport_expiry_profile-1_3_months',
    );
    expect(buildPassportNotificationId('profile-1', '1 month')).toBe(
      'passport_expiry_profile-1_1_month',
    );
    expect(buildPassportNotificationId('profile-1', '1 week')).toBe(
      'passport_expiry_profile-1_1_week',
    );
  });
});

describe('PASSPORT_TRIGGERS', () => {
  it('has exactly 4 triggers', () => {
    expect(PASSPORT_TRIGGERS).toHaveLength(4);
  });

  it('has offsets for 6 months, 3 months, 1 month, and 1 week', () => {
    const labels = PASSPORT_TRIGGERS.map(t => t.label);
    expect(labels).toContain('6 months');
    expect(labels).toContain('3 months');
    expect(labels).toContain('1 month');
    expect(labels).toContain('1 week');
  });

  it('fire dates are in ascending order for a given expiry (furthest-out trigger fires first)', () => {
    // Use a fixed reference expiry 2 years from now
    const refExpiry = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000);
    const fireDates = PASSPORT_TRIGGERS.map(t =>
      computeFireDate(refExpiry, t.amount, t.unit).getTime(),
    );
    for (let i = 1; i < fireDates.length; i++) {
      // Each successive trigger fires later (closer to expiry)
      expect(fireDates[i]).toBeGreaterThan(fireDates[i - 1]);
    }
  });
});

describe('profilePassportKey', () => {
  it('prefixes the profile ID correctly', () => {
    expect(profilePassportKey('abc-123')).toBe('notif_passport_expiry_abc-123');
  });
});

describe('schedulePassportExpiryNotifications', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    jest.clearAllMocks();
  });

  it('schedules 4 notifications when passport expires in 2 years (all triggers future)', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makeFutureProfile(365 * 2); // 2 years out

    await schedulePassportExpiryNotifications(profile);

    expect(scheduled).toHaveLength(4);
    expect(provider.schedule).toHaveBeenCalledTimes(4);
  });

  it('schedules only future triggers when passport expires in ~2 months', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    // 60 days out: 6mo and 3mo calendar triggers are in the past
    // Only 1mo and 1wk triggers are in the future
    const profile = makeFutureProfile(60);

    await schedulePassportExpiryNotifications(profile);

    expect(scheduled).toHaveLength(2);
    const ids = scheduled.map(r => r.id);
    expect(ids).toContain(buildPassportNotificationId(profile.id, '1 month'));
    expect(ids).toContain(buildPassportNotificationId(profile.id, '1 week'));
  });

  it('schedules only the 1-week trigger when passport expires in 3 weeks', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    // 21 days out: 6mo, 3mo, 1mo are past; only 1wk (7d) is future
    const profile = makeFutureProfile(21);

    await schedulePassportExpiryNotifications(profile);

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].id).toBe(buildPassportNotificationId(profile.id, '1 week'));
  });

  it('schedules zero notifications when all triggers are in the past', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    // Only 3 days left — 1 week trigger is also in the past
    const profile = makeFutureProfile(3);

    await schedulePassportExpiryNotifications(profile);

    expect(scheduled).toHaveLength(0);
    expect(provider.schedule).not.toHaveBeenCalled();
  });

  it('schedules zero notifications when passport is already expired', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makePastProfile();

    await schedulePassportExpiryNotifications(profile);

    expect(scheduled).toHaveLength(0);
    expect(provider.schedule).not.toHaveBeenCalled();
  });

  it('persists scheduled IDs in MMKV keyed by profile ID', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makeFutureProfile(365 * 2);

    await schedulePassportExpiryNotifications(profile);

    const raw = mockStore[profilePassportKey(profile.id)];
    expect(raw).toBeDefined();
    const ids: string[] = JSON.parse(raw);
    expect(ids).toHaveLength(4);
  });

  it('cancels existing notifications before rescheduling (idempotent)', async () => {
    const { provider, cancelled } = makeMockProvider();
    setNotificationProvider(provider);

    // Seed MMKV with previously-scheduled IDs
    const existingIds = ['old-id-1', 'old-id-2'];
    mockStore[profilePassportKey('profile-1')] = JSON.stringify(existingIds);

    const profile = makeFutureProfile(365 * 2, 'profile-1');

    await schedulePassportExpiryNotifications(profile);

    // Old IDs should have been cancelled
    expect(cancelled).toEqual(expect.arrayContaining(existingIds));
    expect(provider.cancel).toHaveBeenCalledTimes(2);
  });

  it('re-scheduling replaces MMKV entries (idempotent — no duplicates)', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makeFutureProfile(365 * 2);

    await schedulePassportExpiryNotifications(profile);
    await schedulePassportExpiryNotifications(profile);

    const raw = mockStore[profilePassportKey(profile.id)];
    const ids: string[] = JSON.parse(raw);
    // Each call cancels-then-reschedules, so only 4 IDs (not 8)
    expect(ids).toHaveLength(4);
  });

  it('notification title is "Passport Expiry Reminder"', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makeFutureProfile(365 * 2);

    await schedulePassportExpiryNotifications(profile);

    expect(scheduled[0].title).toBe('Passport Expiry Reminder');
  });

  it('notification body includes profile name and expiry label', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makeFutureProfile(365 * 2);

    await schedulePassportExpiryNotifications(profile);

    const bodies = scheduled.map(r => r.body);
    // Should mention the traveller's name
    expect(bodies.some(b => b.includes('Test'))).toBe(true);
    // Should mention the time labels
    expect(bodies.some(b => b.includes('6 months'))).toBe(true);
    expect(bodies.some(b => b.includes('3 months'))).toBe(true);
    expect(bodies.some(b => b.includes('1 month'))).toBe(true);
    expect(bodies.some(b => b.includes('1 week'))).toBe(true);
  });

  it('does not persist IDs when all triggers are skipped (past expiry)', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const profile = makePastProfile();

    await schedulePassportExpiryNotifications(profile);

    // Nothing should have been written
    expect(mockStore[profilePassportKey(profile.id)]).toBeUndefined();
  });

  it('continues gracefully when provider.schedule throws', async () => {
    const provider: NotificationProvider = {
      schedule: jest.fn().mockRejectedValue(new Error('OS error')),
      cancel: jest.fn().mockResolvedValue(undefined),
      requestPermission: jest.fn().mockResolvedValue(false),
    };
    setNotificationProvider(provider);

    const profile = makeFutureProfile(365 * 2);

    await expect(
      schedulePassportExpiryNotifications(profile),
    ).resolves.toBeUndefined();
  });
});

describe('cancelPassportExpiryNotifications', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    jest.clearAllMocks();
  });

  it('cancels all stored IDs for a profile', async () => {
    const { provider, cancelled } = makeMockProvider();
    setNotificationProvider(provider);

    const ids = ['id-a', 'id-b', 'id-c', 'id-d'];
    mockStore[profilePassportKey('profile-1')] = JSON.stringify(ids);

    await cancelPassportExpiryNotifications('profile-1');

    expect(cancelled).toEqual(ids);
    expect(provider.cancel).toHaveBeenCalledTimes(4);
  });

  it('removes the MMKV key after cancelling', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    mockStore[profilePassportKey('profile-1')] = JSON.stringify(['id-x']);

    await cancelPassportExpiryNotifications('profile-1');

    expect(mockStore[profilePassportKey('profile-1')]).toBeUndefined();
  });

  it('is a no-op when no IDs are stored', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    await cancelPassportExpiryNotifications('profile-none');

    expect(provider.cancel).not.toHaveBeenCalled();
  });

  it('continues gracefully when provider.cancel throws', async () => {
    const provider: NotificationProvider = {
      schedule: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockRejectedValue(new Error('OS error')),
      requestPermission: jest.fn().mockResolvedValue(false),
    };
    setNotificationProvider(provider);

    mockStore[profilePassportKey('profile-err')] = JSON.stringify(['id-fail']);

    await expect(
      cancelPassportExpiryNotifications('profile-err'),
    ).resolves.toBeUndefined();
  });
});

describe('scheduleAllProfilePassportExpiry', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    jest.clearAllMocks();
  });

  it('schedules notifications for each profile', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const profiles = [
      makeFutureProfile(365 * 2, 'profile-A'),
      makeFutureProfile(365 * 2, 'profile-B'),
    ];

    await scheduleAllProfilePassportExpiry(profiles);

    // 4 notifications per profile × 2 profiles = 8
    expect(scheduled).toHaveLength(8);
  });

  it('handles an empty array without error', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    await expect(
      scheduleAllProfilePassportExpiry([]),
    ).resolves.toBeUndefined();

    expect(provider.schedule).not.toHaveBeenCalled();
  });

  it('continues scheduling remaining profiles when one fails', async () => {
    let callCount = 0;
    const provider: NotificationProvider = {
      schedule: jest.fn(async () => {
        callCount++;
        // Fail for profile-A notifications (first 4 calls), succeed for profile-B
        if (callCount <= 4) {
          throw new Error('OS error');
        }
      }),
      cancel: jest.fn().mockResolvedValue(undefined),
      requestPermission: jest.fn().mockResolvedValue(true),
    };
    setNotificationProvider(provider);

    const profiles = [
      makeFutureProfile(365 * 2, 'profile-A'),
      makeFutureProfile(365 * 2, 'profile-B'),
    ];

    // Should not throw
    await expect(
      scheduleAllProfilePassportExpiry(profiles),
    ).resolves.toBeUndefined();
  });

  it('persists IDs for each profile separately in MMKV', async () => {
    const { provider } = makeMockProvider();
    setNotificationProvider(provider);

    const profiles = [
      makeFutureProfile(365 * 2, 'profile-X'),
      makeFutureProfile(365 * 2, 'profile-Y'),
    ];

    await scheduleAllProfilePassportExpiry(profiles);

    const rawX = mockStore[profilePassportKey('profile-X')];
    const rawY = mockStore[profilePassportKey('profile-Y')];
    expect(rawX).toBeDefined();
    expect(rawY).toBeDefined();
    expect(JSON.parse(rawX)).toHaveLength(4);
    expect(JSON.parse(rawY)).toHaveLength(4);
  });

  it('skips expired profiles without affecting valid ones', async () => {
    const { provider, scheduled } = makeMockProvider();
    setNotificationProvider(provider);

    const profiles = [
      makePastProfile('profile-expired'),
      makeFutureProfile(365 * 2, 'profile-valid'),
    ];

    await scheduleAllProfilePassportExpiry(profiles);

    // Only the valid profile gets 4 notifications
    expect(scheduled).toHaveLength(4);
    const ids = scheduled.map(r => r.id);
    expect(ids.every(id => id.includes('profile-valid'))).toBe(true);
  });
});
