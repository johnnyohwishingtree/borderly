/**
 * Web mock for @notifee/react-native
 * Stubs all APIs used by the app so the E2E webpack build does not crash.
 */

// Minimal enum mirrors for type-safety without importing the native package
export const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};

export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const EventType = {
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  APP_BLOCKED: 4,
  CHANNEL_BLOCKED: 5,
  CHANNEL_GROUP_BLOCKED: 6,
  TRIGGER_NOTIFICATION_CREATED: 7,
  FG_ALREADY_EXECUTED: 8,
  UNKNOWN: -1,
};

const notifee = {
  requestPermission: () =>
    Promise.resolve({ authorizationStatus: AuthorizationStatus.AUTHORIZED }),

  createChannel: (_channel: Record<string, unknown>): Promise<string> =>
    Promise.resolve('default-channel'),

  displayNotification: (_notification: Record<string, unknown>): Promise<string> =>
    Promise.resolve('mock-notification-id'),

  cancelNotification: (_notificationId: string): Promise<void> =>
    Promise.resolve(),

  cancelAllNotifications: (): Promise<void> => Promise.resolve(),

  getInitialNotification: (): Promise<null> => Promise.resolve(null),

  onForegroundEvent: (
    _observer: (event: { type: number; detail: Record<string, unknown> }) => void,
  ) => () => {},

  onBackgroundEvent: (
    _observer: (event: { type: number; detail: Record<string, unknown> }) => void,
  ) => () => {},

  getTriggerNotificationIds: (): Promise<string[]> => Promise.resolve([]),

  cancelTriggerNotification: (_notificationId: string): Promise<void> =>
    Promise.resolve(),

  cancelTriggerNotifications: (_notificationIds: string[]): Promise<void> =>
    Promise.resolve(),
};

export default notifee;
