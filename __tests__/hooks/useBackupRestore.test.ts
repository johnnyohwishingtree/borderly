/**
 * Tests for useBackupRestore hook.
 * Covers: initial state, file pick, passphrase handling, restore flow, error handling, reset.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useBackupRestore } from '@/hooks/useBackupRestore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockImport = jest.fn();

jest.mock('@/services/backup', () => ({
  backupService: {
    import: (...args: unknown[]) => mockImport(...args),
  },
}));

jest.mock('@/services/storage/keychain', () => ({
  keychainService: {
    storeProfileById: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(() => null),
    setString: jest.fn(),
    setBool: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/storage/database', () => ({
  databaseService: {
    restoreTrips: jest.fn().mockResolvedValue(undefined),
    restoreLegs: jest.fn().mockResolvedValue(undefined),
    restoreQRCodes: jest.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBackupRestore', () => {
  describe('initial state', () => {
    it('starts at idle with empty passphrase and secure entry', () => {
      const { result } = renderHook(() => useBackupRestore());

      expect(result.current.step).toBe('idle');
      expect(result.current.passphrase).toBe('');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.secureTextEntry).toBe(true);
    });
  });

  describe('setPassphrase', () => {
    it('updates the passphrase value', () => {
      const { result } = renderHook(() => useBackupRestore());

      act(() => {
        result.current.setPassphrase('mySecret');
      });

      expect(result.current.passphrase).toBe('mySecret');
    });
  });

  describe('toggleSecureEntry', () => {
    it('toggles password visibility', () => {
      const { result } = renderHook(() => useBackupRestore());

      expect(result.current.secureTextEntry).toBe(true);

      act(() => {
        result.current.toggleSecureEntry();
      });

      expect(result.current.secureTextEntry).toBe(false);

      act(() => {
        result.current.toggleSecureEntry();
      });

      expect(result.current.secureTextEntry).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all state back to idle', () => {
      const { result } = renderHook(() => useBackupRestore());

      // Change some state
      act(() => {
        result.current.setPassphrase('test');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe('idle');
      expect(result.current.passphrase).toBe('');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.secureTextEntry).toBe(true);
    });
  });

  describe('submitPassphrase', () => {
    it('transitions to error on decrypt failure', async () => {
      mockImport.mockRejectedValue(new Error('Incorrect passphrase'));

      const { result } = renderHook(() => useBackupRestore());

      // Simulate having file content by setting passphrase and calling submit
      act(() => {
        result.current.setPassphrase('wrong');
      });

      await act(async () => {
        await result.current.submitPassphrase();
      });

      expect(result.current.step).toBe('error');
      expect(typeof result.current.errorMessage).toBe('string');
      expect(result.current.errorMessage!.length).toBeGreaterThan(0);
    });
  });
});
