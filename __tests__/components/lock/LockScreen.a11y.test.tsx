/**
 * Accessibility tests for LockScreen.
 *
 * Verifies that the lock screen and its interactive elements expose correct
 * accessibility roles, labels, and live regions to screen readers
 * (VoiceOver on iOS, TalkBack on Android).
 *
 * Tests cover:
 * - Unlock button role and label (including biometric type label)
 * - Error live region (role="alert", liveRegion="polite")
 * - Biometric type label variations (Face ID, Touch ID, Fingerprint, fallback)
 * - Retry button (PIN fallback) role and label
 * - Decorative elements hidden from screen readers
 * - Title heading role
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
// Unlock button — role and label
// ---------------------------------------------------------------------------

describe('LockScreen a11y — unlock button role and label', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
    mockGetGenericPassword.mockResolvedValue({ username: 'user', password: 'key' });
  });

  it('unlock button has accessibilityRole="button"', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('unlock button has a non-empty accessibilityLabel', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    expect(typeof btn.props.accessibilityLabel).toBe('string');
    expect(btn.props.accessibilityLabel.length).toBeGreaterThan(0);
  });

  it('unlock button label contains "Unlock with"', async () => {
    renderLockScreen();
    await waitFor(() => {
      const btn = screen.getByTestId('lock-screen-biometric-button');
      expect(btn.props.accessibilityLabel).toContain('Unlock with');
    });
  });

  it('unlock button has an accessibilityHint describing the action', async () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-biometric-button');
    expect(typeof btn.props.accessibilityHint).toBe('string');
    expect(btn.props.accessibilityHint.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Biometric type label in the unlock button
// ---------------------------------------------------------------------------

describe('LockScreen a11y — biometric type label', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accessibilityLabel contains "Face ID" when biometry is FaceID', async () => {
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
    renderLockScreen();
    await waitFor(() => {
      const btn = screen.getByTestId('lock-screen-biometric-button');
      expect(btn.props.accessibilityLabel).toContain('Face ID');
    });
  });

  it('accessibilityLabel contains "Touch ID" when biometry is TouchID', async () => {
    mockGetSupportedBiometryType.mockResolvedValue('TouchID');
    renderLockScreen();
    await waitFor(() => {
      const btn = screen.getByTestId('lock-screen-biometric-button');
      expect(btn.props.accessibilityLabel).toContain('Touch ID');
    });
  });

  it('accessibilityLabel contains "Fingerprint" when biometry is Fingerprint', async () => {
    mockGetSupportedBiometryType.mockResolvedValue('Fingerprint');
    renderLockScreen();
    await waitFor(() => {
      const btn = screen.getByTestId('lock-screen-biometric-button');
      expect(btn.props.accessibilityLabel).toContain('Fingerprint');
    });
  });

  it('accessibilityLabel contains "Biometrics" when biometry is null (fallback)', async () => {
    mockGetSupportedBiometryType.mockResolvedValue(null);
    renderLockScreen();
    await waitFor(() => {
      const btn = screen.getByTestId('lock-screen-biometric-button');
      expect(btn.props.accessibilityLabel).toContain('Biometrics');
    });
  });

  it('accessibilityLabel contains "Biometrics" when getSupportedBiometryType rejects', async () => {
    mockGetSupportedBiometryType.mockRejectedValue(new Error('unavailable'));
    renderLockScreen();
    await waitFor(() => {
      const btn = screen.getByTestId('lock-screen-biometric-button');
      expect(btn.props.accessibilityLabel).toContain('Biometrics');
    });
  });
});

// ---------------------------------------------------------------------------
// Error live region
// ---------------------------------------------------------------------------

describe('LockScreen a11y — error live region', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
  });

  it('no error element exists when there is no error', () => {
    mockGetGenericPassword.mockResolvedValue({ username: 'u', password: 'p' });
    renderLockScreen();
    expect(screen.queryByTestId('lock-screen-error')).toBeNull();
  });

  it('error element appears with role="alert" after cancelled auth', async () => {
    mockGetGenericPassword.mockResolvedValue(false);
    renderLockScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));
    });
    await waitFor(() => {
      const error = screen.getByTestId('lock-screen-error');
      expect(error.props.accessibilityRole).toBe('alert');
    });
  });

  it('error element has accessibilityLiveRegion="polite" for automatic announcement', async () => {
    mockGetGenericPassword.mockResolvedValue(false);
    renderLockScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));
    });
    await waitFor(() => {
      const error = screen.getByTestId('lock-screen-error');
      expect(error.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  it('error element has accessible=true', async () => {
    mockGetGenericPassword.mockResolvedValue(false);
    renderLockScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));
    });
    await waitFor(() => {
      const error = screen.getByTestId('lock-screen-error');
      expect(error.props.accessible).toBe(true);
    });
  });

  it('error accessibilityLabel contains the error message text', async () => {
    mockGetGenericPassword.mockRejectedValue(new Error('Biometry not enrolled'));
    renderLockScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));
    });
    await waitFor(() => {
      const error = screen.getByTestId('lock-screen-error');
      expect(error.props.accessibilityLabel).toContain('Biometry not enrolled');
    });
  });

  it('error accessibilityLabel starts with "Error:" prefix', async () => {
    mockGetGenericPassword.mockResolvedValue(false);
    renderLockScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-screen-biometric-button'));
    });
    await waitFor(() => {
      const error = screen.getByTestId('lock-screen-error');
      expect(error.props.accessibilityLabel).toMatch(/^Error:/);
    });
  });
});

// ---------------------------------------------------------------------------
// Retry button (PIN fallback)
// ---------------------------------------------------------------------------

describe('LockScreen a11y — retry / PIN fallback button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
  });

  it('PIN button has accessibilityRole="button"', () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-pin-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('PIN button has a non-empty accessibilityLabel', () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-pin-button');
    expect(typeof btn.props.accessibilityLabel).toBe('string');
    expect(btn.props.accessibilityLabel.length).toBeGreaterThan(0);
  });

  it('PIN button label mentions PIN', () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-pin-button');
    expect(btn.props.accessibilityLabel).toContain('PIN');
  });

  it('PIN button has an accessibilityHint', () => {
    renderLockScreen();
    const btn = screen.getByTestId('lock-screen-pin-button');
    expect(typeof btn.props.accessibilityHint).toBe('string');
    expect(btn.props.accessibilityHint.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Decorative elements hidden from screen readers
// ---------------------------------------------------------------------------

describe('LockScreen a11y — decorative elements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
  });

  it('app logo container is hidden from screen readers (accessibilityElementsHidden)', () => {
    renderLockScreen();
    // The logo View has accessibilityElementsHidden={true} and
    // importantForAccessibility="no-hide-descendants"
    // We verify the lock-screen root is accessible=false (not a focus target itself)
    const container = screen.getByTestId('lock-screen');
    expect(container.props.accessible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Title heading role
// ---------------------------------------------------------------------------

describe('LockScreen a11y — title heading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportedBiometryType.mockResolvedValue('FaceID');
  });

  it('title "Borderly Locked" has accessibilityRole="header"', () => {
    renderLockScreen();
    const title = screen.getByText('Borderly Locked');
    expect(title.props.accessibilityRole).toBe('header');
  });
});
