const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};
const EventType = {
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
const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};
const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
};
const notifee = {
  requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: AuthorizationStatus.AUTHORIZED }),
  createChannel: jest.fn().mockResolvedValue('default-channel'),
  createTriggerNotification: jest.fn().mockResolvedValue('mock-trigger-notification-id'),
  displayNotification: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onForegroundEvent: jest.fn().mockReturnValue(() => {}),
  onBackgroundEvent: jest.fn().mockReturnValue(() => {}),
  getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
  cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AuthorizationStatus,
  EventType,
  AndroidImportance,
  TriggerType,
};
