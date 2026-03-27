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
      screen.getByText('Borderly Locked');
    });
  });

  it('renders subtitle text', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByText('Authenticate to access your travel data');
    });
  });

  it('renders biometric unlock button', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByTestId('lock-screen-biometric-button');
    });
  });

  it('renders PIN fallback button', async () => {
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByTestId('lock-screen-pin-button');
      screen.getByText('Use PIN Instead');
    });
  });
});

// ── Biometry type detection ───────────────────────────────────────────────────

describe('LockScreen — biometry type', () => {
  it('shows "Unlock with Touch ID" when device supports TouchID', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('TouchID');
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByText('Unlock with Touch ID');
    });
  });

  it('shows "Unlock with Face ID" when device supports FaceID', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('FaceID');
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByText('Unlock with Face ID');
    });
  });

  it('shows "Unlock with Fingerprint" when device supports Fingerprint', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('Fingerprint');
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByText('Unlock with Fingerprint');
    });
  });

  it('shows "Unlock with Biometrics" when biometry type is unknown', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null);
    render(<LockScreen />);
    await waitFor(() => {
      screen.getByText('Unlock with Biometrics');
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
      screen.getByTestId('lock-screen-biometric-button');
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      expect(mockUnlock).toHaveBeenCalledWith();
    });
  });
});

// ── Biometric unlock failure ──────────────────────────────────────────────────

describe('LockScreen — unlock failure', () => {
  it('shows error when authentication is cancelled', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
    render(<LockScreen />);

    await waitFor(() => {
      screen.getByTestId('lock-screen-biometric-button');
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      screen.getByTestId('lock-screen-error');
      screen.getByText('Authentication was cancelled. Please try again.');
    });
  });

  it('shows error message when authentication throws', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('Biometric sensor error'));
    render(<LockScreen />);

    await waitFor(() => {
      screen.getByTestId('lock-screen-biometric-button');
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      screen.getByTestId('lock-screen-error');
      screen.getByText('Biometric sensor error');
    });
  });

  it('does not call unlock when authentication fails', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
    render(<LockScreen />);

    await waitFor(() => {
      screen.getByTestId('lock-screen-biometric-button');
    });

    fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));

    await waitFor(() => {
      screen.getByTestId('lock-screen-error');
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
      screen.getByTestId('lock-screen-pin-button');
    });

    fireEvent.press(screen.getByTestId('lock-screen-pin-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Enter PIN',
      'PIN unlock is not yet available in this version. Please use biometric authentication.',
      [{ text: 'OK' }],
    );
  });
});
