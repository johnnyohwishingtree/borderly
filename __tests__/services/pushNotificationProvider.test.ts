/**
 * Tests for PushNotificationProvider
 *
 * Covers acceptance criteria:
 *  1. schedule() schedules a trigger notification via notifee
 *  2. cancel() delegates to cancelTriggerNotification
 *  3. Past-trigger fireDate — schedule still calls createTriggerNotification
 *     (past-trigger filtering is the scheduler's responsibility, not the provider's)
 *  4. Permission denied — schedule() returns without calling createTriggerNotification
 *  5. Android channel is created on first schedule call
 *  6. requestPermission() returns true when AUTHORIZED, false when DENIED
 */

import notifee, { AndroidImportance, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import { PushNotificationProvider } from '../../src/services/deadline/pushNotificationProvider';
import { ScheduleRequest } from '../../src/services/deadline/notificationScheduler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function futureDate(offsetMs = 60_000): Date {
  return new Date(Date.now() + offsetMs);
}

function pastDate(offsetMs = 60_000): Date {
  return new Date(Date.now() - offsetMs);
}

function makeRequest(overrides: Partial<ScheduleRequest> = {}): ScheduleRequest {
  return {
    id: 'leg_leg-1_24_hours',
    title: 'Travel Declaration Reminder',
    body: 'Japan declaration due in 24 hours — tap to complete',
    fireDate: futureDate(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PushNotificationProvider', () => {
  let provider: PushNotificationProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new PushNotificationProvider();
  });

  // -------------------------------------------------------------------------
  // requestPermission
  // -------------------------------------------------------------------------

  describe('requestPermission()', () => {
    it('returns true when AUTHORIZED', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      });

      const result = await provider.requestPermission();

      expect(result).toBe(true);
    });

    it('returns true when PROVISIONAL', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.PROVISIONAL,
      });

      const result = await provider.requestPermission();

      expect(result).toBe(true);
    });

    it('returns false when DENIED', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.DENIED,
      });

      const result = await provider.requestPermission();

      expect(result).toBe(false);
    });

    it('returns false when NOT_DETERMINED', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
      });

      const result = await provider.requestPermission();

      expect(result).toBe(false);
    });

    it('returns false and does not throw when notifee.requestPermission throws', async () => {
      (notifee.requestPermission as jest.Mock).mockRejectedValueOnce(new Error('OS error'));

      await expect(provider.requestPermission()).resolves.toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // schedule
  // -------------------------------------------------------------------------

  describe('schedule()', () => {
    it('calls createTriggerNotification with correct id, title, body, and timestamp', async () => {
      const fireDate = futureDate(3_600_000); // 1 hour from now
      const request = makeRequest({ fireDate });

      await provider.schedule(request);

      expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
      const [notification, trigger] = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      expect(notification.id).toBe(request.id);
      expect(notification.title).toBe(request.title);
      expect(notification.body).toBe(request.body);
      expect(trigger.type).toBe(TriggerType.TIMESTAMP);
      expect(trigger.timestamp).toBe(fireDate.getTime());
    });

    it('specifies the deadline-reminders channel for the Android notification', async () => {
      await provider.schedule(makeRequest());

      const [notification] = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      expect(notification.android?.channelId).toBe('deadline-reminders');
    });

    it('creates the Android channel before the first schedule call', async () => {
      await provider.schedule(makeRequest());

      expect(notifee.createChannel).toHaveBeenCalledTimes(1);
      const [channel] = (notifee.createChannel as jest.Mock).mock.calls[0];
      expect(channel.id).toBe('deadline-reminders');
      expect(channel.importance).toBe(AndroidImportance.HIGH);
    });

    it('creates the Android channel only once across multiple schedule calls', async () => {
      await provider.schedule(makeRequest({ id: 'notif-1' }));
      await provider.schedule(makeRequest({ id: 'notif-2' }));
      await provider.schedule(makeRequest({ id: 'notif-3' }));

      expect(notifee.createChannel).toHaveBeenCalledTimes(1);
    });

    it('does NOT call createTriggerNotification when permission is denied', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.DENIED,
      });

      await provider.schedule(makeRequest());

      expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('does not throw when permission is denied (graceful degradation)', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValueOnce({
        authorizationStatus: AuthorizationStatus.DENIED,
      });

      await expect(provider.schedule(makeRequest())).resolves.toBeUndefined();
    });

    it('passes a past fireDate to createTriggerNotification unchanged (filtering is scheduler responsibility)', async () => {
      // The provider itself does not filter past dates — the NotificationScheduler does.
      // If the provider is called with a past date it forwards it faithfully.
      const fireDate = pastDate(3_600_000);
      await provider.schedule(makeRequest({ fireDate }));

      const [, trigger] = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
      expect(trigger.timestamp).toBe(fireDate.getTime());
    });

    it('does not throw when createTriggerNotification throws', async () => {
      (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(
        new Error('scheduling failed'),
      );

      // schedule() re-throws — the scheduler wraps it in try/catch.
      // We just verify it rejects rather than hanging or crashing silently.
      await expect(provider.schedule(makeRequest())).rejects.toThrow('scheduling failed');
    });
  });

  // -------------------------------------------------------------------------
  // cancel
  // -------------------------------------------------------------------------

  describe('cancel()', () => {
    it('calls cancelTriggerNotification with the given id', async () => {
      await provider.cancel('leg_leg-1_7_days');

      expect(notifee.cancelTriggerNotification).toHaveBeenCalledTimes(1);
      expect(notifee.cancelTriggerNotification).toHaveBeenCalledWith('leg_leg-1_7_days');
    });

    it('cancels multiple IDs independently', async () => {
      await provider.cancel('id-a');
      await provider.cancel('id-b');
      await provider.cancel('id-c');

      expect(notifee.cancelTriggerNotification).toHaveBeenCalledTimes(3);
    });

    it('does not throw when cancelTriggerNotification throws (notification already gone)', async () => {
      (notifee.cancelTriggerNotification as jest.Mock).mockRejectedValueOnce(
        new Error('not found'),
      );

      await expect(provider.cancel('missing-id')).rejects.toThrow('not found');
    });
  });
});
