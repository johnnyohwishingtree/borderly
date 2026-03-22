/**
 * Accessibility tests for RestoreBackupModal.
 *
 * Verifies that the modal and its interactive elements expose correct
 * accessibility roles and labels to screen readers (VoiceOver / TalkBack).
 *
 * The useBackupRestore hook is mocked so tests run without native storage.
 */

import { render, screen } from '@testing-library/react-native';
import RestoreBackupModal from '../../../src/screens/settings/RestoreBackupModal';

// ---------------------------------------------------------------------------
// Default mock — isLoading=false, no error, not yet successful
// ---------------------------------------------------------------------------

jest.mock('../../../src/hooks/useBackupRestore', () => ({
  useBackupRestore: jest.fn(() => ({
    fileContent: '',
    passphrase: '',
    isLoading: false,
    error: null,
    isSuccess: false,
    envelope: null,
    setFileContent: jest.fn(),
    setPassphrase: jest.fn(),
    handleRestore: jest.fn(),
    reset: jest.fn(),
  })),
}));

const { useBackupRestore } = require('../../../src/hooks/useBackupRestore') as {
  useBackupRestore: jest.Mock;
};

function defaultMockState() {
  useBackupRestore.mockReturnValue({
    fileContent: '',
    passphrase: '',
    isLoading: false,
    error: null,
    isSuccess: false,
    envelope: null,
    setFileContent: jest.fn(),
    setPassphrase: jest.fn(),
    handleRestore: jest.fn(),
    reset: jest.fn(),
  });
}

beforeEach(() => {
  defaultMockState();
});

// ---------------------------------------------------------------------------
// Modal renders
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — renders', () => {
  it('renders the modal scroll view when visible', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.getByTestId('restore-backup-modal')).toBeTruthy();
  });

  it('has accessibilityViewIsModal on the Modal element', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const modal = screen.UNSAFE_getByType(require('react-native').Modal);
    expect(modal.props.accessibilityViewIsModal).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — heading', () => {
  it('renders "Restore Backup" heading with accessibilityRole="header"', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const heading = screen.getByTestId('restore-backup-heading');
    expect(heading.props.accessibilityRole).toBe('header');
  });
});

// ---------------------------------------------------------------------------
// Close / Cancel buttons
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — close button', () => {
  it('has accessibilityRole="button"', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('restore-backup-close-button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('has accessibilityLabel="Close restore modal"', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('restore-backup-close-button');
    expect(btn.props.accessibilityLabel).toBe('Close restore modal');
  });

  it('bottom Cancel button has accessibilityLabel="Cancel and close restore modal"', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('restore-backup-cancel-button');
    expect(btn.props.accessibilityLabel).toBe('Cancel and close restore modal');
  });
});

// ---------------------------------------------------------------------------
// File content input
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — file content input', () => {
  it('file content input has correct accessibilityLabel', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const input = screen.getByTestId('restore-file-content-input');
    expect(input.props.accessibilityLabel).toBe(
      'Backup file content, required. Paste your .borderly file contents here',
    );
  });

  it('file content input is accessible', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const input = screen.getByTestId('restore-file-content-input');
    expect(input.props.accessible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Passphrase input
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — passphrase input', () => {
  it('passphrase input has correct accessibilityLabel', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const input = screen.getByTestId('restore-passphrase-input');
    expect(input.props.accessibilityLabel).toBe('Backup passphrase, required');
  });

  it('passphrase input has secureTextEntry', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const input = screen.getByTestId('restore-passphrase-input');
    expect(input.props.secureTextEntry).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Restore submit button
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — restore button', () => {
  it('has accessibilityLabel="Restore backup from file"', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('restore-backup-submit-button');
    expect(btn.props.accessibilityLabel).toBe('Restore backup from file');
  });

  it('has accessibilityHint describing the action', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const btn = screen.getByTestId('restore-backup-submit-button');
    expect(btn.props.accessibilityHint).toBe(
      'Decrypts your backup file and restores all data',
    );
  });
});

// ---------------------------------------------------------------------------
// Error message live region
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — error live region', () => {
  it('error message has accessibilityLiveRegion="polite" and accessibilityRole="text"', () => {
    useBackupRestore.mockReturnValue({
      fileContent: '',
      passphrase: '',
      isLoading: false,
      error: 'Failed to decrypt backup: incorrect passphrase or corrupted data',
      isSuccess: false,
      envelope: null,
      setFileContent: jest.fn(),
      setPassphrase: jest.fn(),
      handleRestore: jest.fn(),
      reset: jest.fn(),
    });
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const errorView = screen.getByTestId('restore-error-message');
    expect(errorView.props.accessibilityLiveRegion).toBe('polite');
    expect(errorView.props.accessibilityRole).toBe('text');
  });

  it('error is not shown when error is null', () => {
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.queryByTestId('restore-error-message')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — success state', () => {
  it('shows success view after successful restore', () => {
    useBackupRestore.mockReturnValue({
      fileContent: '',
      passphrase: '',
      isLoading: false,
      error: null,
      isSuccess: true,
      envelope: { version: 1, createdAt: '2026-01-01T00:00:00Z', payload: {} as any },
      setFileContent: jest.fn(),
      setPassphrase: jest.fn(),
      handleRestore: jest.fn(),
      reset: jest.fn(),
    });
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.getByTestId('restore-success-view')).toBeTruthy();
  });

  it('Done button has correct accessibilityLabel in success state', () => {
    useBackupRestore.mockReturnValue({
      fileContent: '',
      passphrase: '',
      isLoading: false,
      error: null,
      isSuccess: true,
      envelope: { version: 1, createdAt: '2026-01-01T00:00:00Z', payload: {} as any },
      setFileContent: jest.fn(),
      setPassphrase: jest.fn(),
      handleRestore: jest.fn(),
      reset: jest.fn(),
    });
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    const doneBtn = screen.getByTestId('restore-done-button');
    expect(doneBtn.props.accessibilityLabel).toBe('Finish restore and close modal');
  });

  it('hides input form in success state', () => {
    useBackupRestore.mockReturnValue({
      fileContent: '',
      passphrase: '',
      isLoading: false,
      error: null,
      isSuccess: true,
      envelope: { version: 1, createdAt: '2026-01-01T00:00:00Z', payload: {} as any },
      setFileContent: jest.fn(),
      setPassphrase: jest.fn(),
      handleRestore: jest.fn(),
      reset: jest.fn(),
    });
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.queryByTestId('restore-backup-submit-button')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('RestoreBackupModal — loading state', () => {
  it('submit button is not shown when isLoading=true', () => {
    useBackupRestore.mockReturnValue({
      fileContent: 'BORDERLY_BACKUP_V1\nAGFiYw==',
      passphrase: 'passphrase123!',
      isLoading: true,
      error: null,
      isSuccess: false,
      envelope: null,
      setFileContent: jest.fn(),
      setPassphrase: jest.fn(),
      handleRestore: jest.fn(),
      reset: jest.fn(),
    });
    render(<RestoreBackupModal visible={true} onClose={jest.fn()} />);
    expect(screen.queryByTestId('restore-backup-submit-button')).toBeNull();
  });
});
