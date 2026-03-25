import { render, fireEvent } from '@testing-library/react-native';

// Mock stores
const mockUpdateNotificationPreferences = jest.fn();
const mockNotificationPreferences = {
  enabled: true,
  timing: ['48h', '24h', '6h'] as const,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: jest.fn(() => ({
    notificationPreferences: { ...mockNotificationPreferences },
    updateNotificationPreferences: mockUpdateNotificationPreferences,
  })),
  // Re-export types needed by the component
  __esModule: true,
}));

jest.mock('lucide-react-native', () => ({
  Bell: () => null,
  BellOff: () => null,
  Clock: () => null,
  Moon: () => null,
  Check: () => null,
}));

import NotificationPreferences from '@/screens/settings/NotificationPreferences/NotificationPreferences';
import { useAppStore } from '@/stores/useAppStore';

describe('NotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: { ...mockNotificationPreferences },
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });
  });

  it('renders the master toggle', () => {
    const { getByTestId } = render(<NotificationPreferences />);
    expect(getByTestId('notification-master-toggle')).toBeTruthy();
  });

  it('renders timing options when enabled', () => {
    const { getByTestId } = render(<NotificationPreferences />);
    expect(getByTestId('timing-48h')).toBeTruthy();
    expect(getByTestId('timing-24h')).toBeTruthy();
    expect(getByTestId('timing-6h')).toBeTruthy();
  });

  it('hides timing options when disabled', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: { ...mockNotificationPreferences, enabled: false },
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });

    const { queryByTestId } = render(<NotificationPreferences />);
    expect(queryByTestId('timing-48h')).toBeNull();
    expect(queryByTestId('notification-timing-card')).toBeNull();
  });

  it('calls updateNotificationPreferences when master toggle is changed', () => {
    const { getByTestId } = render(<NotificationPreferences />);
    const toggle = getByTestId('notification-master-toggle');

    // The Toggle component fires onValueChange. We need to find the pressable inside.
    fireEvent(toggle, 'press');

    // The Toggle calls onValueChange with the new value
    expect(mockUpdateNotificationPreferences).toHaveBeenCalled();
  });

  it('toggles timing option off', () => {
    const { getByTestId } = render(<NotificationPreferences />);
    fireEvent.press(getByTestId('timing-48h'));
    expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
      timing: ['24h', '6h'],
    });
  });

  it('toggles timing option on', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: { ...mockNotificationPreferences, timing: ['24h'] },
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });

    const { getByTestId } = render(<NotificationPreferences />);
    fireEvent.press(getByTestId('timing-48h'));
    expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
      timing: ['24h', '48h'],
    });
  });

  it('prevents deselecting the last timing option', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: { ...mockNotificationPreferences, timing: ['24h'] },
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });

    const { getByTestId } = render(<NotificationPreferences />);
    fireEvent.press(getByTestId('timing-24h'));
    // Should NOT call update since it would leave timing empty
    expect(mockUpdateNotificationPreferences).not.toHaveBeenCalled();
  });

  it('renders quiet hours toggle', () => {
    const { getByTestId } = render(<NotificationPreferences />);
    expect(getByTestId('quiet-hours-toggle')).toBeTruthy();
  });

  it('shows quiet hours times when enabled', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: { ...mockNotificationPreferences, quietHoursEnabled: true },
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });

    const { getByTestId } = render(<NotificationPreferences />);
    expect(getByTestId('quiet-hours-start')).toBeTruthy();
    expect(getByTestId('quiet-hours-end')).toBeTruthy();
  });

  it('hides quiet hours card when notifications disabled', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: { ...mockNotificationPreferences, enabled: false },
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });

    const { queryByTestId } = render(<NotificationPreferences />);
    expect(queryByTestId('notification-quiet-hours-card')).toBeNull();
  });
});

describe('NotificationPreferences persistence', () => {
  it('reads preferences from store', () => {
    const customPrefs = {
      enabled: false,
      timing: ['6h'] as const,
      quietHoursEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '08:00',
    };

    (useAppStore as unknown as jest.Mock).mockReturnValue({
      notificationPreferences: customPrefs,
      updateNotificationPreferences: mockUpdateNotificationPreferences,
    });

    const { queryByTestId } = render(<NotificationPreferences />);
    // Notifications disabled, so timing card should be hidden
    expect(queryByTestId('notification-timing-card')).toBeNull();
  });
});
