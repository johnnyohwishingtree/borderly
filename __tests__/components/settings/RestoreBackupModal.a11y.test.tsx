/**
 * Accessibility tests for RestoreBackupModal (now a full-screen component).
 *
 * Verifies that the screen and its interactive elements expose correct
 * accessibility roles and labels to screen readers (VoiceOver / TalkBack).
 *
 * The useBackupRestore hook is mocked so tests run without native storage.
 */

import { render, screen } from '@testing-library/react-native';
import RestoreBackupModal from '../../../src/screens/settings/RestoreBackupModal/RestoreBackupModal';

// ---------------------------------------------------------------------------
// Navigation + store mocks
// ---------------------------------------------------------------------------

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    loadFamilyProfiles: jest.fn(),
    setOnboardingComplete: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Default mock — step='idle', no error
// ---------------------------------------------------------------------------

jest.mock('../../../src/hooks/useBackupRestore', () => ({
  useBackupRestore: jest.fn(() => ({
    step: 'idle',
    passphrase: '',
    errorMessage: null,
    secureTextEntry: true,
    pickFile: jest.fn(),
    setPassphrase: jest.fn(),
    toggleSecureEntry: jest.fn(),
    submitPassphrase: jest.fn(),
    confirmReplace: jest.fn(),
    reset: jest.fn(),
  })),
}));

const { useBackupRestore } = require('../../../src/hooks/useBackupRestore') as {
  useBackupRestore: jest.Mock;
};

function mockStep(step: string, overrides: Record<string, unknown> = {}) {
  useBackupRestore.mockReturnValue({
    step,
    passphrase: '',
    errorMessage: null,
    secureTextEntry: true,
    pickFile: jest.fn(),
    setPassphrase: jest.fn(),
    toggleSecureEntry: jest.fn(),
    submitPassphrase: jest.fn(),
    confirmReplace: jest.fn(),
    reset: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  mockStep('idle');
});

// ---------------------------------------------------------------------------
// Screen renders
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — renders', () => {
  it('renders the screen scroll view', () => {
    render(<RestoreBackupModal />);
    screen.getByTestId('restore-backup-screen');
  });

  it('renders the subtitle text', () => {
    render(<RestoreBackupModal />);
    screen.getByText(/Restore your profiles, trips, and QR codes/);
  });
});

// ---------------------------------------------------------------------------
// Idle step — pick file button
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — idle step', () => {
  it('shows pick-file-button in idle step', () => {
    render(<RestoreBackupModal />);
    screen.getByTestId('pick-file-button');
  });

  it('pick-file-button has accessibilityRole="button"', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('pick-file-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('pick-file-button has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('pick-file-button');
    expect(btn.props.accessibilityLabel).toBe('Pick a backup file from your device');
  });
});

// ---------------------------------------------------------------------------
// Passphrase step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — passphrase step', () => {
  beforeEach(() => {
    mockStep('passphrase', { passphrase: '' });
  });

  it('passphrase input has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const input = screen.getByTestId('passphrase-field');
    expect(input.props.accessibilityLabel).toBe('Backup passphrase, required');
  });

  it('passphrase input has secureTextEntry by default', () => {
    render(<RestoreBackupModal />);
    const input = screen.getByTestId('passphrase-field');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('submit button has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('submit-passphrase-button');
    expect(btn.props.accessibilityLabel).toBe('Decrypt and restore backup');
  });

  it('submit button has accessibilityRole="button"', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('submit-passphrase-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('cancel button has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('cancel-passphrase-button');
    expect(btn.props.accessibilityLabel).toBe('Cancel and go back to file selection');
  });
});

// ---------------------------------------------------------------------------
// Error step — live region
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — error step', () => {
  it('error step shows error-message with live region', () => {
    mockStep('error', {
      errorMessage: 'Failed to decrypt backup: incorrect passphrase or corrupted data',
    });
    render(<RestoreBackupModal />);
    const errorView = screen.getByTestId('error-message');
    expect(errorView.props.accessibilityLiveRegion).toBe('polite');
    expect(errorView.props.accessibilityRole).toBe('text');
  });

  it('error-message is not shown in idle step', () => {
    render(<RestoreBackupModal />);
    expect(screen.queryByTestId('error-message')).toBeNull();
  });

  it('try-again-button has correct accessibilityLabel', () => {
    mockStep('error', { errorMessage: 'Something went wrong' });
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('try-again-button');
    expect(btn.props.accessibilityLabel).toBe('Try restoring from backup again');
  });
});

// ---------------------------------------------------------------------------
// Success step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — success step', () => {
  beforeEach(() => {
    mockStep('success');
  });

  it('shows restore-step-success after successful restore', () => {
    render(<RestoreBackupModal />);
    screen.getByTestId('restore-step-success');
  });

  it('go-to-home-button has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('go-to-home-button');
    expect(btn.props.accessibilityLabel).toBe('Go to home screen');
  });

  it('go-to-home-button has accessibilityRole="button"', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('go-to-home-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('hides passphrase step in success state', () => {
    render(<RestoreBackupModal />);
    expect(screen.queryByTestId('restore-step-passphrase')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — loading step', () => {
  it('shows restore-step-loading and hides passphrase step', () => {
    mockStep('loading');
    render(<RestoreBackupModal />);
    screen.getByTestId('restore-step-loading');
    expect(screen.queryByTestId('restore-step-passphrase')).toBeNull();
  });

  it('loading view has correct accessibilityLiveRegion', () => {
    mockStep('loading');
    render(<RestoreBackupModal />);
    const loadingView = screen.getByTestId('restore-step-loading');
    expect(loadingView.props.accessibilityLiveRegion).toBe('polite');
  });
});

// ---------------------------------------------------------------------------
// Conflict / confirming-replace step
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — confirming-replace step', () => {
  beforeEach(() => {
    mockStep('confirming-replace');
  });

  it('shows restore-step-conflict', () => {
    render(<RestoreBackupModal />);
    screen.getByTestId('restore-step-conflict');
  });

  it('confirm-replace-button has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('confirm-replace-button');
    expect(btn.props.accessibilityLabel).toBe('Replace all existing data with backup');
  });

  it('cancel-replace-button has correct accessibilityLabel', () => {
    render(<RestoreBackupModal />);
    const btn = screen.getByTestId('cancel-replace-button');
    expect(btn.props.accessibilityLabel).toBe('Cancel and keep existing data');
  });
});
