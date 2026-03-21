/**
 * Unit tests for useBackupExport hook.
 *
 * Tests cover:
 *  - computePassphraseStrength helper
 *  - formatBackupDate helper
 *  - useBackupExport hook: initial state, validation, success path, error path
 */

import { renderHook, act } from '@testing-library/react-native';
import { Share } from 'react-native';
import {
  useBackupExport,
  computePassphraseStrength,
  formatBackupDate,
} from '@/hooks/useBackupExport';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/services/backup', () => ({
  backupService: {
    export: jest.fn(),
  },
}));

// Capture the mock so we can control its return value per test.
const { backupService } = require('@/services/backup') as {
  backupService: { export: jest.Mock };
};

// ---------------------------------------------------------------------------
// computePassphraseStrength
// ---------------------------------------------------------------------------

describe('computePassphraseStrength', () => {
  it('returns "weak" for strings shorter than 8 characters', () => {
    expect(computePassphraseStrength('')).toBe('weak');
    expect(computePassphraseStrength('abc')).toBe('weak');
    expect(computePassphraseStrength('1234567')).toBe('weak');
  });

  it('returns "weak" for 8+ char strings with only one character class', () => {
    expect(computePassphraseStrength('aaaaaaaa')).toBe('weak');
    expect(computePassphraseStrength('12345678')).toBe('weak');
  });

  it('returns "fair" for 8+ char strings with two character classes', () => {
    expect(computePassphraseStrength('aaaaaaaa1')).toBe('fair');
    expect(computePassphraseStrength('AAAAAAAA1')).toBe('fair');
    expect(computePassphraseStrength('aaaaAAAA')).toBe('fair');
  });

  it('returns "strong" for 12+ char strings with three or more character classes', () => {
    expect(computePassphraseStrength('aaaaAAAA1234')).toBe('strong');
    expect(computePassphraseStrength('aaaaAAAA1234!')).toBe('strong');
  });

  it('returns "fair" for exactly 12 chars with only two classes', () => {
    expect(computePassphraseStrength('aaaaaaaaaaaa')).toBe('weak'); // 12 chars, 1 class
    expect(computePassphraseStrength('aaaaaAAAAA12')).toBe('strong'); // 12 chars, 3 classes
    expect(computePassphraseStrength('aaaaaaAAAAA1')).toBe('strong'); // 12 chars, 3 classes
    // 12 chars, exactly 2 classes — still "fair" (< 3 classes)
    expect(computePassphraseStrength('aaaaaaaAAAAA')).toBe('fair');
  });
});

// ---------------------------------------------------------------------------
// formatBackupDate
// ---------------------------------------------------------------------------

describe('formatBackupDate', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(formatBackupDate(new Date(2026, 0, 5))).toBe('20260105');   // Jan 5
    expect(formatBackupDate(new Date(2026, 11, 31))).toBe('20261231'); // Dec 31
    expect(formatBackupDate(new Date(2026, 2, 21))).toBe('20260321');  // Mar 21
  });

  it('zero-pads single-digit month and day', () => {
    expect(formatBackupDate(new Date(2026, 0, 1))).toBe('20260101');
    expect(formatBackupDate(new Date(2026, 8, 9))).toBe('20260909');
  });
});

// ---------------------------------------------------------------------------
// useBackupExport — initial state
// ---------------------------------------------------------------------------

describe('useBackupExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with empty passphrase fields and no error', () => {
    const { result } = renderHook(() => useBackupExport());

    expect(result.current.passphrase).toBe('');
    expect(result.current.confirmPassphrase).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.strength).toBe('weak');
  });

  it('updates passphrase via setPassphrase', () => {
    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('hello123');
    });

    expect(result.current.passphrase).toBe('hello123');
  });

  it('updates confirmPassphrase via setConfirmPassphrase', () => {
    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setConfirmPassphrase('hello123');
    });

    expect(result.current.confirmPassphrase).toBe('hello123');
  });

  it('recomputes strength when passphrase changes', () => {
    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('weakpwd');
    });
    expect(result.current.strength).toBe('weak');

    act(() => {
      result.current.setPassphrase('Stronger1');
    });
    expect(result.current.strength).toBe('fair');

    act(() => {
      result.current.setPassphrase('VeryStrong123!');
    });
    expect(result.current.strength).toBe('strong');
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  it('sets error when passphrase is shorter than 8 chars', async () => {
    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('short');
      result.current.setConfirmPassphrase('short');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    expect(result.current.error).toBe('Passphrase must be at least 8 characters.');
    expect(backupService.export).not.toHaveBeenCalled();
  });

  it('sets error when passphrases do not match', async () => {
    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('SecurePass1!');
      result.current.setConfirmPassphrase('DifferentPass1!');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    expect(result.current.error).toBe('Passphrases do not match.');
    expect(backupService.export).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Success path
  // ---------------------------------------------------------------------------

  it('calls backupService.export and Share.share on valid input', async () => {
    const fakeContent = 'BORDERLY_BACKUP_V1\nABCDEF==';
    backupService.export.mockResolvedValueOnce(fakeContent);
    jest.spyOn(Share, 'share').mockResolvedValueOnce({ action: Share.sharedAction });

    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('GoodPass12!');
      result.current.setConfirmPassphrase('GoodPass12!');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    expect(backupService.export).toHaveBeenCalledWith('GoodPass12!');
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ message: fakeContent }),
      expect.anything(),
    );
    expect(result.current.error).toBeNull();
    // Passphrase fields should be cleared on success
    expect(result.current.passphrase).toBe('');
    expect(result.current.confirmPassphrase).toBe('');
  });

  it('does not clear the form when share is dismissed', async () => {
    const fakeContent = 'BORDERLY_BACKUP_V1\nABCDEF==';
    backupService.export.mockResolvedValueOnce(fakeContent);
    jest.spyOn(Share, 'share').mockResolvedValueOnce({ action: Share.dismissedAction });

    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('GoodPass12!');
      result.current.setConfirmPassphrase('GoodPass12!');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    // Form should remain populated so user can try again
    expect(result.current.passphrase).toBe('GoodPass12!');
    expect(result.current.error).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Error path
  // ---------------------------------------------------------------------------

  it('sets error when backupService.export throws', async () => {
    backupService.export.mockRejectedValueOnce(new Error('Encryption failed'));

    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('GoodPass12!');
      result.current.setConfirmPassphrase('GoodPass12!');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    expect(result.current.error).toBe('Export failed: Encryption failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error when Share.share throws', async () => {
    const fakeContent = 'BORDERLY_BACKUP_V1\nABCDEF==';
    backupService.export.mockResolvedValueOnce(fakeContent);
    jest
      .spyOn(Share, 'share')
      .mockRejectedValueOnce(new Error('Share unavailable'));

    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('GoodPass12!');
      result.current.setConfirmPassphrase('GoodPass12!');
    });

    await act(async () => {
      await result.current.handleExport();
    });

    expect(result.current.error).toBe('Export failed: Share unavailable');
    expect(result.current.isLoading).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // reset()
  // ---------------------------------------------------------------------------

  it('reset clears all state', () => {
    const { result } = renderHook(() => useBackupExport());

    act(() => {
      result.current.setPassphrase('SomePass1!');
      result.current.setConfirmPassphrase('SomePass1!');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.passphrase).toBe('');
    expect(result.current.confirmPassphrase).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
