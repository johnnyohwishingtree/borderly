/**
 * Tests for AppLockScreen component.
 * Covers: rendering, unlock button, auth failure, loading state.
 */
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AppLockScreen from '../../../src/components/ui/AppLockScreen';

// Mock accessibility utilities (used by Button)
jest.mock('../../../src/utils/accessibility', () => ({
  AccessibilityStateHelpers: {
    createButtonState: (disabled = false, loading = false, selected = false) => ({
      disabled,
      busy: loading,
      selected,
    }),
  },
  TouchTargetUtils: {
    ensureMinimumTouchTarget: () => ({ minWidth: 44, minHeight: 44 }),
    getHitSlop: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  },
  ACCESSIBILITY_CONSTANTS: { MIN_TOUCH_TARGET: 44 },
}));

// Mock HapticFeedback (used by Button)
jest.mock('../../../src/components/ui/HapticFeedback', () => ({
  HapticFeedback: {
    button: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('AppLockScreen', () => {
  it('renders lock screen UI', () => {
    const { getByText, getByTestId } = render(
      <AppLockScreen onUnlock={jest.fn().mockResolvedValue(true)} />,
    );
    getByTestId('app-lock-screen');
    getByText('Borderly Locked');
    getByText('Unlock with Biometrics');
  });

  it('calls onUnlock when unlock button pressed', async () => {
    const onUnlock = jest.fn().mockResolvedValue(true);
    const { getByText } = render(<AppLockScreen onUnlock={onUnlock} />);
    fireEvent.press(getByText('Unlock with Biometrics'));
    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when authentication fails', async () => {
    const onUnlock = jest.fn().mockResolvedValue(false);
    const { getByText } = render(<AppLockScreen onUnlock={onUnlock} />);
    fireEvent.press(getByText('Unlock with Biometrics'));
    await waitFor(() => {
      getByText('Authentication failed. Please try again.');
    });
  });

  it('shows inactivity message', () => {
    const { getByText } = render(
      <AppLockScreen onUnlock={jest.fn().mockResolvedValue(true)} />,
    );
    getByText(/locked after 5 minutes/);
  });
});
