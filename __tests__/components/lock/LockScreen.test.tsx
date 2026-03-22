/**
 * Unit tests for LockScreen component.
 *
 * Covers:
 * - Renders correctly (logo, title, buttons)
 * - Biometry label detection (Face ID, Touch ID, Fingerprint, fallback)
 * - Successful biometric unlock → calls useAppStore.unlock()
 * - Cancelled authentication → shows error, no unlock
 * - Failed authentication → shows error, no unlock
 * - PIN fallback button triggers Alert
 * - Error message accessibility (role="alert", liveRegion="polite")
 * - Interactive element accessibility props
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// useAppStore — mock only the slices we need
const mockUnlock = jest.fn();
jest.mock('@/stores/useAppStore', () => ({
  useAppStore: (selector: (s: { unlock: () => void }) => unknown) =>
    selector({ unlock: mockUnlock }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import LockScreen from '../../../src/screens/lock/LockScreen/LockScreen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGetSupportedBiometryType = Keychain.getSupportedBiometryType as jest.Mock;
const mockGetGenericPassword = Keychain.getGenericPassword as jest.Mock;

function renderLockScreen() {
  return render(<LockScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LockScreen — rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('TouchID');
    mockGetGenericPassword.mockResolvedValue({ username: 'user', password: 'key' });
  });

  it('renders the screen container', () => {
    renderLockScreen();
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
  });

  it('renders the title "Borderly Locked"', () => {
    renderLockScreen();
    expect(screen.getByText('Borderly Locked')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    renderLockScreen();
    expect(screen.getByText('Authenticate to access your travel data')).toBeTruthy();
  });

  it('renders the biometric unlock button', async () => {
    renderLockScreen();
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });
  });

  it('renders the PIN fallback button', () => {
    renderLockScreen();
    expect(screen.getByTestId('lock-screen-pin-button')).toBeTruthy();
  });

  it('does NOT render the error message initially', () => {
    renderLockScreen();
    expect(screen.queryByTestId('lock-screen-error')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Biometry type label detection
// ---------------------------------------------------------------------------

describe('LockScreen — biometry label', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Unlock with Face ID" when biometryType is FaceID', async () => {
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
    renderLockScreen();
    const button = await screen.findByRole('button', { name: 'Unlock with Face ID' });
    expect(button).toBeTruthy();
  });

  it('shows "Unlock with Touch ID" when biometryType is TouchID', async () => {
    mockGetSupportedBiometryType.mockResolvedValue('TouchID');
    renderLockScreen();
    const button = await screen.findByRole('button', { name: 'Unlock with Touch ID' });
    expect(button).toBeTruthy();
  });

  it('shows "Unlock with Fingerprint" when biometryType is Fingerprint', async () => {
    mockGetSupportedBiometryType.mockResolvedValue('Fingerprint');
    renderLockScreen();
    const button = await screen.findByRole('button', { name: 'Unlock with Fingerprint' });
    expect(button).toBeTruthy();
  });

  it('shows "Unlock with Biometrics" when biometryType is null (no biometrics)', async () => {
    mockGetSupportedBiometryType.mockResolvedValue(null);
    renderLockScreen();
    const button = await screen.findByRole('button', { name: 'Unlock with Biometrics' });
    expect(button).toBeTruthy();
  });

  it('shows "Unlock with Biometrics" when getSupportedBiometryType rejects', async () => {
    mockGetSupportedBiometryType.mockRejectedValue(new Error('unavailable'));
    renderLockScreen();
    const button = await screen.findByRole('button', { name: 'Unlock with Biometrics' });
    expect(button).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Biometric unlock — success
// ---------------------------------------------------------------------------

describe('LockScreen — successful biometric unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
    mockGetGenericPassword.mockResolvedValue({ username: 'user', password: 'encrypted-key' });
  });

  it('calls unlock() on successful authentication', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(mockUnlock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show an error message after success', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('lock-screen-error')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Biometric unlock — cancelled (returns false)
// ---------------------------------------------------------------------------

describe('LockScreen — cancelled biometric authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('TouchID');
    mockGetGenericPassword.mockResolvedValue(false);
  });

  it('does NOT call unlock() when authentication is cancelled', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(mockUnlock).not.toHaveBeenCalled();
    });
  });

  it('shows an error message when authentication is cancelled', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error')).toBeTruthy();
    });
  });

  it('error message mentions cancellation', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error').props.accessibilityLabel).toContain(
        'cancelled',
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Biometric unlock — error thrown
// ---------------------------------------------------------------------------

describe('LockScreen — biometric authentication error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('TouchID');
    mockGetGenericPassword.mockRejectedValue(new Error('Biometry not available'));
  });

  it('does NOT call unlock() when authentication throws', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(mockUnlock).not.toHaveBeenCalled();
    });
  });

  it('shows error message after failed authentication', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error')).toBeTruthy();
    });
  });

  it('error message contains the error text', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error').props.accessibilityLabel).toContain(
        'Biometry not available',
      );
    });
  });

  it('allows retry after error (button is still present and enabled)', async () => {
    renderLockScreen();
    const button = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      // Button should still be accessible and pressable
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// PIN fallback
// ---------------------------------------------------------------------------

describe('LockScreen — PIN fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('TouchID');
    jest.spyOn(Alert, 'alert');
  });

  it('calls Alert.alert when PIN button is pressed', async () => {
    renderLockScreen();
    const pinButton = screen.getByTestId('lock-screen-pin-button');
    await act(async () => {
      fireEvent.press(pinButton);
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Enter PIN',
      expect.any(String),
      expect.any(Array),
    );
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('LockScreen — accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
    mockGetGenericPassword.mockResolvedValue(false);
  });

  it('biometric button has accessibilityRole="button"', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('biometric button has accessibilityHint', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    expect(btn.props.accessibilityHint).toBeTruthy();
  });

  it('PIN button has accessibilityRole="button"', () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-pin-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('PIN button has accessibilityLabel', () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-pin-button');
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });

  it('error container has accessibilityRole="alert"', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(btn);
    });
    await waitFor(() => {
      const errorEl = screen.getByTestId('lock-screen-error');
      expect(errorEl.props.accessibilityRole).toBe('alert');
    });
  });

  it('error container has accessibilityLiveRegion="polite"', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    await act(async () => {
      fireEvent.press(btn);
    });
    await waitFor(() => {
      const errorEl = screen.getByTestId('lock-screen-error');
      expect(errorEl.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  it('title has accessibilityRole="header"', () => {
    renderLockScreen();
    const title = screen.getByText('Borderly Locked');
    expect(title.props.accessibilityRole).toBe('header');
  });
});

// ---------------------------------------------------------------------------
// useAppStore integration — lock/unlock actions
// ---------------------------------------------------------------------------

describe('useAppStore — lock and unlock actions', () => {
  it('lock() and unlock() are functions on the store', () => {
    // Import the real store for this assertion
    const { useAppStore } = jest.requireActual('@/stores/useAppStore') as {
      useAppStore: {
        getState: () => { lock: unknown; unlock: unknown; setAppLocked: unknown };
      };
    };
    const state = useAppStore.getState();
    expect(typeof state.lock).toBe('function');
    expect(typeof state.unlock).toBe('function');
    expect(typeof state.setAppLocked).toBe('function');
  });
});
