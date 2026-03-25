/**
 * pushNotificationProvider.ts
 *
 * Concrete implementation of the `NotificationProvider` interface backed by
 * `@notifee/react-native`. This provider:
 *
 *  - Creates an Android notification channel ("deadline-reminders") with HIGH
 *    importance on the first scheduling call.
 *  - Schedules time-based local notifications using Notifee's
 *    `createTriggerNotification` with a `TimestampTrigger`.
 *  - Cancels previously-scheduled notifications by ID via
 *    `cancelTriggerNotification`.
 *  - Requests OS permission before scheduling; logs a warning (no crash) when
 *    permission is not granted.
 *
 * Register this provider during app initialisation:
 *
 *   ```ts
 *   import { setNotificationProvider } from '../services/deadline';
 *   import { pushNotificationProvider } from '../services/deadline/pushNotificationProvider';
 *   setNotificationProvider(pushNotificationProvider);
 *   ```
 */

import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import { NotificationProvider, ScheduleRequest } from './notificationScheduler';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Android notification channel ID for all deadline reminder notifications. */
const ANDROID_CHANNEL_ID = 'deadline-reminders';
const ANDROID_CHANNEL_NAME = 'Deadline Reminders';
const ANDROID_CHANNEL_DESCRIPTION =
  'Alerts when a travel declaration deadline is approaching.';

// ---------------------------------------------------------------------------
// PushNotificationProvider
// ---------------------------------------------------------------------------

/**
 * Production-ready `NotificationProvider` that wraps `@notifee/react-native`.
 *
 * A single shared instance (`pushNotificationProvider`) is exported for use
 * throughout the app. You can also instantiate the class directly in tests.
 */
export class PushNotificationProvider implements NotificationProvider {
  /** True once the Android channel has been created for this session. */
  private _channelCreated = false;

  // -------------------------------------------------------------------------
  // NotificationProvider interface
  // -------------------------------------------------------------------------

  /**
   * Request OS permission for local notifications.
   * Returns `true` when the user grants (or has previously granted) permission.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      const granted =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      if (!granted) {
        console.warn(
          '[PushNotificationProvider] Permission not granted — notifications will not be shown.',
        );
      }
      return granted;
    } catch (err) {
      console.warn('[PushNotificationProvider] requestPermission failed:', err);
      return false;
    }
  }

  /**
   * Schedule a single local notification to fire at `request.fireDate`.
   *
   * If permission has not been granted the method logs a warning and returns
   * without throwing — the caller's schedule loop will simply continue.
   *
   * On Android the notification channel is lazily created on the first call.
   */
  async schedule(request: ScheduleRequest): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) {
      // Already warned inside requestPermission — just bail silently.
      return;
    }

    // Ensure the Android channel exists before we try to post to it.
    await this._ensureAndroidChannel();

    const trigger = {
      type: TriggerType.TIMESTAMP as const,
      timestamp: request.fireDate.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        id: request.id,
        title: request.title,
        body: request.body,
        android: {
          channelId: ANDROID_CHANNEL_ID,
          smallIcon: 'ic_notification',
          pressAction: { id: 'default' },
        },
        ...(request.data ? { data: request.data } : {}),
      },
      trigger,
    );
  }

  /**
   * Cancel a previously-scheduled trigger notification by its ID.
   * If the notification no longer exists (already fired, already cancelled)
   * Notifee returns silently — no error is thrown.
   */
  async cancel(id: string): Promise<void> {
    await notifee.cancelTriggerNotification(id);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Create the Android notification channel the first time it is needed.
   * On iOS this is a no-op (Notifee's `createChannel` is ignored there).
   */
  private async _ensureAndroidChannel(): Promise<void> {
    if (this._channelCreated) {
      return;
    }
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: ANDROID_CHANNEL_NAME,
      description: ANDROID_CHANNEL_DESCRIPTION,
      importance: AndroidImportance.HIGH,
    });
    this._channelCreated = true;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Shared singleton — register with `setNotificationProvider()` at app start. */
export const pushNotificationProvider = new PushNotificationProvider();
