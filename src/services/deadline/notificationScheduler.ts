/**
 * notificationScheduler.ts
 *
 * Schedules and cancels local push notifications for trip leg submission deadlines.
 *
 * Because no notification library is bundled in the project yet, this module
 * defines a `NotificationProvider` interface that can be backed by any library
 * (e.g. @notifee/react-native) without changing the calling code. The default
 * implementation used at runtime is a platform stub that logs warnings — drop
 * in a real provider via `setNotificationProvider()` once a library is added.
 *
 * Scheduled notification IDs are persisted in MMKV so they can be cancelled
 * across app restarts.
 */

import { Trip } from '../../types/trip';
import { LegDeadline } from './deadlineService';
import { mmkvService } from '../storage/mmkv';

// ---------------------------------------------------------------------------
// Notification provider interface
// ---------------------------------------------------------------------------

/** A single scheduled notification request. */
export interface ScheduleRequest {
  /** Unique identifier — used to cancel individual notifications. */
  id: string;
  title: string;
  body: string;
  /** When to fire the notification (local device time). */
  fireDate: Date;
}

/**
 * Pluggable interface for the underlying local notification library.
 * Implement this interface against your chosen library and register it
 * with `setNotificationProvider()`.
 */
export interface NotificationProvider {
  /** Schedule a single local notification. Returns a promise so the caller
   *  can await confirmation (or swallow errors gracefully). */
  schedule(request: ScheduleRequest): Promise<void>;
  /** Cancel a previously-scheduled notification by ID. */
  cancel(id: string): Promise<void>;
  /** Request OS permission for local notifications. Returns true when granted. */
  requestPermission(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Default stub — used until a real library is registered
// ---------------------------------------------------------------------------

class StubNotificationProvider implements NotificationProvider {
  async schedule(request: ScheduleRequest): Promise<void> {
    if (__DEV__) {
      console.log(
        `[notificationScheduler] Stub: schedule "${request.id}" at ${request.fireDate.toISOString()}`,
      );
    }
  }

  async cancel(id: string): Promise<void> {
    if (__DEV__) {
      console.log(`[notificationScheduler] Stub: cancel "${id}"`);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (__DEV__) {
      console.log('[notificationScheduler] Stub: requestPermission → false');
    }
    return false;
  }
}

let _provider: NotificationProvider = new StubNotificationProvider();

/** Replace the active notification provider. Call this during app initialisation
 *  once a real library (e.g. @notifee/react-native) is added. */
export function setNotificationProvider(provider: NotificationProvider): void {
  _provider = provider;
}

/** Retrieve the currently registered provider (useful for testing). */
export function getNotificationProvider(): NotificationProvider {
  return _provider;
}

// ---------------------------------------------------------------------------
// MMKV key helpers for persisting scheduled IDs
// ---------------------------------------------------------------------------

const MMKV_PREFIX = 'notif_ids_';

function legKey(legId: string): string {
  return `${MMKV_PREFIX}leg_${legId}`;
}

function tripKey(tripId: string): string {
  return `${MMKV_PREFIX}trip_${tripId}`;
}

function readIds(key: string): string[] {
  const raw = mmkvService.getString(key);
  if (!raw) {return [];}
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {return parsed as string[];}
  } catch {
    // ignore corrupt entries
  }
  return [];
}

function writeIds(key: string, ids: string[]): void {
  mmkvService.setString(key, JSON.stringify(ids));
}

function deleteKey(key: string): void {
  mmkvService.delete(key);
}

// ---------------------------------------------------------------------------
// Trigger offsets (milliseconds before submissionDeadline)
// ---------------------------------------------------------------------------

const MS_PER_HOUR = 60 * 60 * 1000;

const TRIGGERS_MS: ReadonlyArray<{ label: string; offsetMs: number }> = [
  { label: '7 days',  offsetMs: 7 * 24 * MS_PER_HOUR },
  { label: '48 hours', offsetMs: 48 * MS_PER_HOUR },
  { label: '24 hours', offsetMs: 24 * MS_PER_HOUR },
];

function buildNotificationId(legId: string, label: string): string {
  // Replace spaces/slashes to keep IDs file-system-safe
  const sanitised = label.replace(/\s+/g, '_');
  return `leg_${legId}_${sanitised}`;
}

function buildCountryLabel(countryCode: string): string {
  const MAP: Record<string, string> = {
    JPN: 'Japan',
    MYS: 'Malaysia',
    SGP: 'Singapore',
  };
  return MAP[countryCode] ?? countryCode;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule up to 3 notifications per leg in `deadlines` (7 days, 48 h, 24 h
 * before `submissionDeadline`). Triggers already in the past are silently
 * skipped. Notifications are scheduled via the active `NotificationProvider`.
 *
 * Scheduled IDs are persisted in MMKV so they can be cancelled later.
 */
export async function scheduleDeadlineNotifications(
  trip: Trip,
  deadlines: LegDeadline[],
): Promise<void> {
  const now = Date.now();

  for (const deadline of deadlines) {
    if (!deadline.submissionDeadline) {continue;}

    const deadlineMs = deadline.submissionDeadline.getTime();
    const country = buildCountryLabel(deadline.countryCode);
    const scheduledIds: string[] = [];

    for (const { label, offsetMs } of TRIGGERS_MS) {
      const fireDate = new Date(deadlineMs - offsetMs);

      // Skip triggers already in the past
      if (fireDate.getTime() <= now) {continue;}

      const id = buildNotificationId(deadline.legId, label);

      const request: ScheduleRequest = {
        id,
        title: 'Travel Declaration Reminder',
        body: `${country} declaration due in ${label} — tap to complete`,
        fireDate,
      };

      try {
        await _provider.schedule(request);
        scheduledIds.push(id);
      } catch (err) {
        if (__DEV__) {
          console.warn(`[notificationScheduler] Failed to schedule ${id}:`, err);
        }
      }
    }

    if (scheduledIds.length > 0) {
      // Merge with any existing IDs for this leg (idempotent re-scheduling)
      const existing = readIds(legKey(deadline.legId));
      const merged = Array.from(new Set([...existing, ...scheduledIds]));
      writeIds(legKey(deadline.legId), merged);

      // Also record against the trip for bulk cancellation
      const tripIds = readIds(tripKey(trip.id));
      const mergedTrip = Array.from(new Set([...tripIds, ...scheduledIds]));
      writeIds(tripKey(trip.id), mergedTrip);
    }
  }
}

/**
 * Cancel all scheduled notifications for a specific trip leg and remove
 * the persisted IDs from MMKV. If `tripId` is provided, the cancelled IDs
 * are also pruned from the trip-level key to prevent stale entries.
 */
export async function cancelLegNotifications(legId: string, tripId?: string): Promise<void> {
  const ids = readIds(legKey(legId));
  for (const id of ids) {
    try {
      await _provider.cancel(id);
    } catch (err) {
      if (__DEV__) {
        console.warn(`[notificationScheduler] Failed to cancel ${id}:`, err);
      }
    }
  }
  deleteKey(legKey(legId));

  // Prune cancelled IDs from the trip-level key to prevent stale entries
  if (tripId && ids.length > 0) {
    const tripIds = readIds(tripKey(tripId));
    const remaining = tripIds.filter(id => !ids.includes(id));
    if (remaining.length === 0) {
      deleteKey(tripKey(tripId));
    } else {
      writeIds(tripKey(tripId), remaining);
    }
  }
}

/**
 * Cancel all scheduled notifications for every leg in a trip and remove the
 * persisted IDs from MMKV.
 */
export async function cancelTripNotifications(tripId: string): Promise<void> {
  const ids = readIds(tripKey(tripId));
  for (const id of ids) {
    try {
      await _provider.cancel(id);
    } catch (err) {
      if (__DEV__) {
        console.warn(`[notificationScheduler] Failed to cancel ${id}:`, err);
      }
    }
  }
  deleteKey(tripKey(tripId));
}

/**
 * Request OS permission for local notifications via the active provider.
 * Returns `true` when the user grants permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  return _provider.requestPermission();
}

// ---------------------------------------------------------------------------
// Internal helpers (exported for unit tests)
// ---------------------------------------------------------------------------

export { buildNotificationId, buildCountryLabel, TRIGGERS_MS, legKey, tripKey };
