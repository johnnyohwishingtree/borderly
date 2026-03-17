import { renderHook, act } from '@testing-library/react-native';
import { useAccountSetup } from '@/hooks/useAccountSetup';
import { useAccountSetupStore } from '@/stores/useAccountSetupStore';
import { keychainService } from '@/services/storage/keychain';

jest.mock('@/services/storage/keychain', () => ({
  keychainService: {
    getPortalCredential: jest.fn(),
    storePortalCredential: jest.fn(),
  },
}));

const mockKeychainService = jest.mocked(keychainService);

describe('useAccountSetup', () => {
  const profileId = 'profile_123';

  beforeEach(() => {
    jest.clearAllMocks();
    useAccountSetupStore.getState().clearAllStatuses();
  });

  it('returns not_started for an unknown portal', () => {
    const { result } = renderHook(() => useAccountSetup(profileId));
    expect(result.current.getPortalStatus('JPN')).toBe('not_started');
  });

  it('markPortalReady sets status to ready', () => {
    const { result } = renderHook(() => useAccountSetup(profileId));

    act(() => {
      result.current.markPortalReady('JPN');
    });

    expect(result.current.getPortalStatus('JPN')).toBe('ready');
  });

  it('resetPortalStatus reverts to not_started', () => {
    const { result } = renderHook(() => useAccountSetup(profileId));

    act(() => {
      result.current.markPortalReady('JPN');
    });

    expect(result.current.getPortalStatus('JPN')).toBe('ready');

    act(() => {
      result.current.resetPortalStatus('JPN');
    });

    expect(result.current.getPortalStatus('JPN')).toBe('not_started');
  });

  it('getPortalCredential delegates to keychainService', async () => {
    mockKeychainService.getPortalCredential.mockResolvedValue({
      username: 'user@test.com',
      password: 'pass123',
    });

    const { result } = renderHook(() => useAccountSetup(profileId));

    const cred = await result.current.getPortalCredential('JPN');

    expect(mockKeychainService.getPortalCredential).toHaveBeenCalledWith(profileId, 'JPN');
    expect(cred).toEqual({ username: 'user@test.com', password: 'pass123' });
  });

  it('storePortalCredential delegates to keychainService', async () => {
    mockKeychainService.storePortalCredential.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccountSetup(profileId));

    await result.current.storePortalCredential('JPN', 'user@test.com', 'pass123', 'user@test.com');

    expect(mockKeychainService.storePortalCredential).toHaveBeenCalledWith(
      profileId,
      'JPN',
      'user@test.com',
      'pass123',
      'user@test.com'
    );
  });

  it('isolates statuses between different profile IDs', () => {
    const { result: hook1 } = renderHook(() => useAccountSetup('profile_A'));
    const { result: hook2 } = renderHook(() => useAccountSetup('profile_B'));

    act(() => {
      hook1.current.markPortalReady('JPN');
    });

    expect(hook1.current.getPortalStatus('JPN')).toBe('ready');
    expect(hook2.current.getPortalStatus('JPN')).toBe('not_started');
  });
});
