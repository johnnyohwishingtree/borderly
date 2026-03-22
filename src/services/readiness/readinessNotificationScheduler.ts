/**
 * readinessNotificationScheduler.ts
 *
 * Schedules a single departure-readiness push notification 48 hours before
 * the earliest departure in a trip when the trip has open critical/missing
 * checklist items.
 *
 * Uses the same pluggable NotificationProvider registered via
 * `setNotificationProvider()` in notificationScheduler, so the provider
 * only needs to be wired once during app initialisation.
 *
 * The scheduled notification ID is persisted in MMKV under
 * `departure-readiness-<tripId>` so it can be cancelled across app restarts.
 */

import {
  getNotificationProvider,
  ScheduleRequest,
} from '../deadline/notificationScheduler';
import { mmkvService } from '../storage/mmkv';
import { Trip } from '../../types/trip';
import { TripReadiness } from './readinessTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MMKV_KEY_PREFIX = 'departure-readiness-';
const HOURS_BEFORE_DEPARTURE = 48;
const MS_PER_HOUR = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// MMKV key helpers
// ---------------------------------------------------------------------------

/** Returns the MMKV key used to persist the notification ID for a trip. */
export function readinessKey(tripId: string): string {
  return `${MMKV_KEY_PREFIX}${tripId}`;
}

/** Returns the notification ID used when scheduling the readiness notification. */
export function buildReadinessNotificationId(tripId: string): string {
  return `readiness_${tripId}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule a departure-readiness notification 48 hours before the trip's
 * earliest departure date, but only when the trip has at least one item with
 * status `critical` or `missing`.
 *
 * Behaviour:
 *  - If `readiness.overallStatus` is `ok` or `warning`, any previously
 *    scheduled notification is cancelled and no new one is created.
 *  - If the 48-hour window has already passed, the notification is silently
 *    skipped (no scheduling, no error).
 *  - On successful scheduling the notification ID is persisted in MMKV.
 */
export async function scheduleReadinessCheck(
  trip: Trip,
  readiness: TripReadiness,
): Promise<void> {
  const provider = getNotificationProvider();
  const key = readinessKey(trip.id);
  const notifId = buildReadinessNotificationId(trip.id);

  // When overallStatus is ok or warning: cancel any existing notification.
  if (readiness.overallStatus === 'ok' || readiness.overallStatus === 'warning') {
    const existingId = mmkvService.getString(key);
    if (existingId) {
      try {
        await provider.cancel(existingId);
        mmkvService.delete(key);
      } catch (err) {
        if (__DEV__) {
          console.warn(
            '[readinessNotificationScheduler] Failed to cancel existing notification:',
            err,
          );
        }
      }
    }
    return;
  }

  // Status is critical or missing — compute 48-hour-before-departure trigger.
  const triggerTime =
    readiness.departureDate.getTime() - HOURS_BEFORE_DEPARTURE * MS_PER_HOUR;
  const now = Date.now();

  // Silently skip if the trigger window is already in the past.
  if (triggerTime <= now) {
    return;
  }

  const fireDate = new Date(triggerTime);

  const request: ScheduleRequest = {
    id: notifId,
    title: 'Action required before your trip',
    body: 'Your trip has open items that need attention before departure.',
    fireDate,
  };

  try {
    await provider.schedule(request);
    mmkvService.setString(key, notifId);
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[readinessNotificationScheduler] Failed to schedule readiness notification:',
        err,
      );
    }
  }
}

/**
 * Cancel a previously scheduled departure-readiness notification for the
 * given trip and remove the persisted ID from MMKV.
 *
 * Safe to call even when no notification was scheduled (no-op).
 */
export async function cancelReadinessNotification(tripId: string): Promise<void> {
  const provider = getNotificationProvider();
  const key = readinessKey(tripId);
  const existingId = mmkvService.getString(key);

  if (!existingId) {
    return;
  }

  try {
    await provider.cancel(existingId);
    mmkvService.delete(key);
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[readinessNotificationScheduler] Failed to cancel readiness notification:',
        err,
      );
    }
  }
}
