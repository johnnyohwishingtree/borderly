/**
 * notificationService.ts
 *
 * Re-exports the notifee-backed notification provider and scheduler functions.
 * This module provides a clean import path for notification functionality.
 */

export {
  PushNotificationProvider,
  pushNotificationProvider,
} from '../deadline/pushNotificationProvider';

export {
  scheduleDeadlineNotifications,
  cancelTripNotifications,
  cancelLegNotifications,
  requestNotificationPermission,
  setNotificationProvider,
  getNotificationProvider,
} from '../deadline/notificationScheduler';

export type {
  NotificationProvider,
  ScheduleRequest,
} from '../deadline/notificationScheduler';
