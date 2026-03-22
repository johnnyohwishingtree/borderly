/**
 * passportExpiryNotifications.ts
 *
 * Schedules and cancels local push notifications for passport expiry dates.
 *
 * For each profile, up to 4 notifications are scheduled:
 *  - 6 months before passport expiry
 *  - 3 months before passport expiry
 *  - 1 month before passport expiry
 *  - 1 week before passport expiry
 *
 * Triggers already in the past are silently skipped (same pattern as
 * notificationScheduler.ts). Notification IDs are persisted in MMKV
 * keyed by profile ID so they can be cancelled across app restarts.
 */

import { TravelerProfile } from '../../types/profile';
import { mmkvService } from '../storage/mmkv';
import { getNotificationProvider } from './notificationScheduler';
import type { ScheduleRequest } from './notificationScheduler';

// ---------------------------------------------------------------------------
// MMKV key helpers
// ---------------------------------------------------------------------------

const PASSPORT_NOTIF_PREFIX = 'notif_passport_expiry_';

/** MMKV key for storing scheduled notification IDs for a profile. */
export function profilePassportKey(profileId: string): string {
  return `${PASSPORT_NOTIF_PREFIX}${profileId}`;
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
// Trigger offsets (milliseconds before passport expiry)
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The 4 reminder triggers fired before passport expiry. */
export const PASSPORT_TRIGGERS: ReadonlyArray<{ label: string; offsetMs: number }> = [
  { label: '6 months', offsetMs: 180 * MS_PER_DAY },
  { label: '3 months', offsetMs: 90 * MS_PER_DAY },
  { label: '1 month',  offsetMs: 30 * MS_PER_DAY },
  { label: '1 week',   offsetMs: 7 * MS_PER_DAY },
];

/** Build a stable, unique notification ID for a given profile + trigger label. */
export function buildPassportNotificationId(profileId: string, label: string): string {
  const sanitised = label.replace(/\s+/g, '_');
  return `passport_expiry_${profileId}_${sanitised}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule up to 4 passport-expiry reminder notifications for a profile
 * (6 months, 3 months, 1 month, 1 week before `passportExpiry`). Triggers
 * already in the past are silently skipped.
 *
 * This function first cancels any previously-scheduled notifications for
 * the profile (idempotent rescheduling), then schedules fresh ones. The
 * new notification IDs are persisted in MMKV.
 */
export async function schedulePassportExpiryNotifications(
  profile: TravelerProfile,
): Promise<void> {
  // Cancel any existing notifications for this profile first (idempotent)
  await cancelPassportExpiryNotifications(profile.id);

  const expiryDate = new Date(profile.passportExpiry);
  const expiryMs = expiryDate.getTime();
  const now = Date.now();

  // Passport is already expired — nothing to schedule
  if (expiryMs <= now) {
    return;
  }

  const provider = getNotificationProvider();
  const scheduledIds: string[] = [];
  const displayName = [profile.givenNames, profile.surname].filter(Boolean).join(' ') || 'Your passport';

  for (const { label, offsetMs } of PASSPORT_TRIGGERS) {
    const fireDate = new Date(expiryMs - offsetMs);

    // Skip triggers already in the past
    if (fireDate.getTime() <= now) {continue;}

    const id = buildPassportNotificationId(profile.id, label);

    const request: ScheduleRequest = {
      id,
      title: 'Passport Expiry Reminder',
      body: `${displayName} expires in ${label} — renew before your next trip`,
      fireDate,
    };

    try {
      await provider.schedule(request);
      scheduledIds.push(id);
    } catch (err) {
      if (__DEV__) {
        console.warn(`[passportExpiryNotifications] Failed to schedule ${id}:`, err);
      }
    }
  }

  if (scheduledIds.length > 0) {
    writeIds(profilePassportKey(profile.id), scheduledIds);
  }
}

/**
 * Cancel all scheduled passport-expiry reminder notifications for a profile
 * and remove the persisted IDs from MMKV.
 */
export async function cancelPassportExpiryNotifications(profileId: string): Promise<void> {
  const ids = readIds(profilePassportKey(profileId));
  const provider = getNotificationProvider();

  for (const id of ids) {
    try {
      await provider.cancel(id);
    } catch (err) {
      if (__DEV__) {
        console.warn(`[passportExpiryNotifications] Failed to cancel ${id}:`, err);
      }
    }
  }

  deleteKey(profilePassportKey(profileId));
}

/**
 * Schedule passport-expiry reminders for every profile in the collection.
 * Calls `schedulePassportExpiryNotifications` per profile.
 */
export async function scheduleAllProfilePassportExpiry(
  profiles: TravelerProfile[],
): Promise<void> {
  for (const profile of profiles) {
    try {
      await schedulePassportExpiryNotifications(profile);
    } catch (err) {
      if (__DEV__) {
        console.warn(
          `[passportExpiryNotifications] Failed to schedule for profile ${profile.id}:`,
          err,
        );
      }
    }
  }
}
