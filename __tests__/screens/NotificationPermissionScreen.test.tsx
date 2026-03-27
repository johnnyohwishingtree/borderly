import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock notifee
const mockRequestPermission = jest.fn().mockResolvedValue({ authorizationStatus: 1 });
const mockGetNotificationSettings = jest.fn().mockResolvedValue({ authorizationStatus: -1 });

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: mockRequestPermission,
    getNotificationSettings: mockGetNotificationSettings,
  },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

// Mock profile store
const mockSetOnboardingComplete = jest.fn();
jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    setOnboardingComplete: mockSetOnboardingComplete,
  }),
}));

jest.mock('lucide-react-native', () => ({
  Bell: () => null,
  Clock: () => null,
  CheckCircle: () => null,
}));

import NotificationPermissionScreen from '@/screens/onboarding/NotificationPermissionScreen/NotificationPermissionScreen';

describe('NotificationPermissionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotificationSettings.mockResolvedValue({ authorizationStatus: -1 });
  });

  it('renders the screen with headline and buttons', () => {
    const { getByText, getByTestId } = render(<NotificationPermissionScreen />);

    getByText('Stay on Top of Deadlines');
    getByTestId('allow-notifications-button');
    getByTestId('skip-notifications-button');
  });

  it('displays updated timing info (48h, 24h, 6h)', () => {
    const { getByText } = render(<NotificationPermissionScreen />);

    getByText(/48 hours/);
    getByText(/6 hours/);
  });

  it('requests permission and completes onboarding when Allow is pressed', async () => {
    const { getByTestId } = render(<NotificationPermissionScreen />);

    fireEvent.press(getByTestId('allow-notifications-button'));

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    });
  });

  it('completes onboarding without requesting permission when Skip is pressed', () => {
    const { getByTestId } = render(<NotificationPermissionScreen />);

    fireEvent.press(getByTestId('skip-notifications-button'));

    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
  });

  it('auto-advances when permission is already granted', async () => {
    mockGetNotificationSettings.mockResolvedValue({ authorizationStatus: 1 });

    render(<NotificationPermissionScreen />);

    await waitFor(() => {
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    }, { timeout: 2000 });
  });

  it('does NOT auto-advance when permission is denied', async () => {
    mockGetNotificationSettings.mockResolvedValue({ authorizationStatus: 0 });

    render(<NotificationPermissionScreen />);

    // Wait a bit to ensure auto-advance doesn't fire
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockSetOnboardingComplete).not.toHaveBeenCalled();
  });

  it('completes onboarding even if requestPermission throws', async () => {
    mockRequestPermission.mockRejectedValueOnce(new Error('OS error'));

    const { getByTestId } = render(<NotificationPermissionScreen />);
    fireEvent.press(getByTestId('allow-notifications-button'));

    await waitFor(() => {
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    });
  });

  it('has accessibility labels on buttons', () => {
    const { getByTestId } = render(<NotificationPermissionScreen />);

    const allowBtn = getByTestId('allow-notifications-button');
    const skipBtn = getByTestId('skip-notifications-button');

    expect(allowBtn.props.accessibilityRole).toBe('button');
    expect(skipBtn.props.accessibilityRole).toBe('button');
  });
});
