/**
 * Unit tests for LockScreen.
 *
 * Covers rendering of biometric unlock button, PIN fallback,
 * error state, biometry type detection, and unlock on success.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';
import LockScreen from '@/screens/lock/LockScreen/LockScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockUnlock = jest.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/stores/useAppStore', () => ({
  useAppStore: (selector: (s: { unlock: jest.Mock }) => jest.Mock) =>
    selector({ unlock: mockUnlock }),
}));

jest.mock('../../../src/utils/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#000', textSecondary: '#666', success: '#22c55e', accent: '#3b82f6' },
    isDark: false,
  }),
}));

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID, loading }: { title: string; onPress?: () => void; testID?: string; loading?: boolean }) =>
      React.createElement('TouchableOpacity', { onPress, testID, disabled: loading },
        React.createElement('Text', null, title)),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('TouchID');
  (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('LockScreen — rendering', () => {
  it('renders lock screen with title', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByText('Borderly Locked')).toBeTruthy();
    });
  });

  it('renders subtitle text', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByText('Authenticate to access your travel data')).toBeTruthy();
    });
  });

  it('renders biometric unlock button', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });
  });

  it('renders PIN fallback button', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-pin-button')).toBeTruthy();
      expect(screen.getByText('Use PIN Instead')).toBeTruthy();
    });
  });
});

// ── Biometry type detection ───────────────────────────────────────────────────

describe('LockScreen — biometry type', () => {
  it('shows "Unlock with Touch ID" when device supports TouchID', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('TouchID');
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByText('Unlock with Touch ID')).toBeTruthy();
    });
  });

  it('shows "Unlock with Face ID" when device supports FaceID', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('FaceID');
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByText('Unlock with Face ID')).toBeTruthy();
    });
  });

  it('shows "Unlock with Fingerprint" when device supports Fingerprint', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('Fingerprint');
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByText('Unlock with Fingerprint')).toBeTruthy();
    });
  });

  it('shows "Unlock with Biometrics" when biometry type is unknown', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null);
    render(<LockScreen />);
    await waitFor(() => {
      expect(screen.getByText('Unlock with Biometrics')).toBeTruthy();
    });
  });
});

// ── Biometric unlock success ──────────────────────────────────────────────────

describe('LockScreen — unlock success', () => {
  it('calls unlock when biometric authentication succeeds', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'borderly',
      password: 'test',
    });
    render(<LockScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      expect(mockUnlock).toHaveBeenCalled();
    });
  });
});

// ── Biometric unlock failure ──────────────────────────────────────────────────

describe('LockScreen — unlock failure', () => {
  it('shows error when authentication is cancelled', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
    render(<LockScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error')).toBeTruthy();
      expect(screen.getByText('Authentication was cancelled. Please try again.')).toBeTruthy();
    });
  });

  it('shows error message when authentication throws', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('Biometric sensor error'));
    render(<LockScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error')).toBeTruthy();
      expect(screen.getByText('Biometric sensor error')).toBeTruthy();
    });
  });

  it('does not call unlock when authentication fails', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
    render(<LockScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-biometric-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-error')).toBeTruthy();
    });

    expect(mockUnlock).not.toHaveBeenCalled();
  });
});

// ── PIN fallback ──────────────────────────────────────────────────────────────

describe('LockScreen — PIN fallback', () => {
  it('shows Alert when PIN button is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LockScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('lock-screen-pin-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('lock-screen-pin-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Enter PIN',
      'PIN unlock is not yet available in this version. Please use biometric authentication.',
      [{ text: 'OK' }],
    );
  });
});
