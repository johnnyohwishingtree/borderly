/**
 * Accessibility tests for ExportBackupModal.
 *
 * Verifies that the modal and its interactive elements expose correct
 * accessibility roles and labels to screen readers (VoiceOver / TalkBack).
 *
 * The useBackupExport hook is mocked so tests run without native storage.
 */

import { render, screen } from '@testing-library/react-native';
import ExportBackupModal from '../../../src/screens/settings/ExportBackupModal';

// ---------------------------------------------------------------------------
// Default mock — isLoading=false, no error
// ---------------------------------------------------------------------------

jest.mock('../../../src/hooks/useBackupExport', () => ({
  useBackupExport: jest.fn(() => ({
    passphrase: '',
    confirmPassphrase: '',
    isLoading: false,
    error: null,
    strength: 'weak' as const,
    setPassphrase: jest.fn(),
    setConfirmPassphrase: jest.fn(),
    handleExport: jest.fn(),
    reset: jest.fn(),
  })),
}));

const { useBackupExport } = require('../../../src/hooks/useBackupExport') as {
  useBackupExport: jest.Mock;
};

function defaultMockState() {
  useBackupExport.mockReturnValue({
    passphrase: '',
    confirmPassphrase: '',
    isLoading: false,
    error: null,
    strength: 'weak' as const,
    setPassphrase: jest.fn(),
    setConfirmPassphrase: jest.fn(),
    handleExport: jest.fn(),
    reset: jest.fn(),
  });
}

beforeEach(() => {
  defaultMockState();
});

// ---------------------------------------------------------------------------
// Modal renders
// ---------------------------------------------------------------------------

describe('ExportBackupModal — renders', () => {
  it('renders the modal scroll view when visible', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.getByTestId('export-backup-modal')).toBeTruthy();
  });

  it('has accessibilityViewIsModal on the Modal element', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const modal = screen.UNSAFE_getByType(require('react-native').Modal);
    expect(modal.props.accessibilityViewIsModal).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe('ExportBackupModal — heading', () => {
  it('renders "Create Backup" heading with accessibilityRole="header"', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const heading = screen.getByText('Create Backup');
    expect(heading.props.accessibilityRole).toBe('header');
  });
});

// ---------------------------------------------------------------------------
// Close / Cancel buttons
// ---------------------------------------------------------------------------

describe('ExportBackupModal — close button', () => {
  it('has accessibilityRole="button"', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('export-backup-close-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('has accessibilityLabel="Close backup modal"', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('export-backup-close-button');
    expect(btn.props.accessibilityLabel).toBe('Close backup modal');
  });

  it('bottom Cancel button has accessibilityLabel="Cancel and close backup modal"', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('export-backup-cancel-button');
    expect(btn.props.accessibilityLabel).toBe('Cancel and close backup modal');
  });
});

// ---------------------------------------------------------------------------
// Passphrase inputs
// ---------------------------------------------------------------------------

describe('ExportBackupModal — passphrase inputs', () => {
  it('passphrase input has correct accessibilityLabel', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const input = screen.getByTestId('passphrase-input');
    expect(input.props.accessibilityLabel).toBe(
      'Passphrase, required, minimum 8 characters',
    );
  });

  it('confirm passphrase input has correct accessibilityLabel', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const input = screen.getByTestId('confirm-passphrase-input');
    expect(input.props.accessibilityLabel).toBe('Confirm passphrase, required');
  });
});

// ---------------------------------------------------------------------------
// Export submit button
// ---------------------------------------------------------------------------

describe('ExportBackupModal — export button', () => {
  it('has accessibilityLabel="Export encrypted backup file"', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('export-backup-submit-button');
    expect(btn.props.accessibilityLabel).toBe('Export encrypted backup file');
  });

  it('has accessibilityHint describing the action', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('export-backup-submit-button');
    expect(btn.props.accessibilityHint).toBe(
      'Encrypts your data and opens the share sheet',
    );
  });
});

// ---------------------------------------------------------------------------
// Strength indicator hidden when no passphrase
// ---------------------------------------------------------------------------

describe('ExportBackupModal — strength indicator', () => {
  it('strength indicator is not shown when passphrase is empty', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.queryByTestId('passphrase-strength-indicator')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Strength indicator visible when typing
// ---------------------------------------------------------------------------

describe('ExportBackupModal — strength indicator (passphrase typed)', () => {
  it('strength indicator appears with correct label when passphrase is entered', () => {
    useBackupExport.mockReturnValue({
      passphrase: 'weakpass',
      confirmPassphrase: '',
      isLoading: false,
      error: null,
      strength: 'weak' as const,
      setPassphrase: jest.fn(),
      setConfirmPassphrase: jest.fn(),
      handleExport: jest.fn(),
      reset: jest.fn(),
    });
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const indicator = screen.getByTestId('passphrase-strength-indicator');
    expect(indicator.props.accessibilityRole).toBe('text');
    expect(indicator.props.accessibilityLabel).toBe('Passphrase strength: Weak');
  });
});

// ---------------------------------------------------------------------------
// Error message live region
// ---------------------------------------------------------------------------

describe('ExportBackupModal — error live region', () => {
  it('error message has accessibilityLiveRegion="polite" and accessibilityRole="text"', () => {
    useBackupExport.mockReturnValue({
      passphrase: 'short',
      confirmPassphrase: 'different',
      isLoading: false,
      error: 'Passphrases do not match.',
      strength: 'weak' as const,
      setPassphrase: jest.fn(),
      setConfirmPassphrase: jest.fn(),
      handleExport: jest.fn(),
      reset: jest.fn(),
    });
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    const errorView = screen.getByTestId('export-error-message');
    expect(errorView.props.accessibilityLiveRegion).toBe('polite');
    expect(errorView.props.accessibilityRole).toBe('text');
  });

  it('error is not shown when error is null', () => {
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.queryByTestId('export-error-message')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading state hides submit button
// ---------------------------------------------------------------------------

describe('ExportBackupModal — loading state', () => {
  it('submit button is not shown when isLoading=true', () => {
    useBackupExport.mockReturnValue({
      passphrase: 'StrongPass1!',
      confirmPassphrase: 'StrongPass1!',
      isLoading: true,
      error: null,
      strength: 'strong' as const,
      setPassphrase: jest.fn(),
      setConfirmPassphrase: jest.fn(),
      handleExport: jest.fn(),
      reset: jest.fn(),
    });
    render(<ExportBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.queryByTestId('export-backup-submit-button')).toBeNull();
  });
});
