import { useAccountSetupStore } from '@/stores/useAccountSetupStore';

// Mock the storage services
jest.mock('@/services/storage', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
  },
}));

import { mmkvService } from '@/services/storage';
const mockMmkvService = mmkvService as jest.Mocked<typeof mmkvService>;

const STORAGE_KEY = 'account_setup_statuses';

describe('useAccountSetupStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state
    useAccountSetupStore.setState({ statuses: {} });
    mockMmkvService.getString.mockReturnValue(undefined);
  });

  // ──────────────────────────────────────────────────────────────
  // loadStatuses
  // ──────────────────────────────────────────────────────────────
  describe('loadStatuses', () => {
    it('loads empty map when nothing is stored', () => {
      mockMmkvService.getString.mockReturnValue(undefined);
      useAccountSetupStore.getState().loadStatuses();
      expect(useAccountSetupStore.getState().statuses).toEqual({});
    });

    it('loads statuses from MMKV on call', () => {
      const stored = {
        'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready', lastChecked: '2026-01-01' },
      };
      mockMmkvService.getString.mockReturnValue(JSON.stringify(stored));

      useAccountSetupStore.getState().loadStatuses();

      expect(mockMmkvService.getString).toHaveBeenCalledWith(STORAGE_KEY);
      expect(useAccountSetupStore.getState().statuses).toEqual(stored);
    });

    it('falls back to empty map on corrupted JSON', () => {
      mockMmkvService.getString.mockReturnValue('{ bad json !!');
      useAccountSetupStore.getState().loadStatuses();
      expect(useAccountSetupStore.getState().statuses).toEqual({});
    });
  });

  // ──────────────────────────────────────────────────────────────
  // getStatus
  // ──────────────────────────────────────────────────────────────
  describe('getStatus', () => {
    it('returns not_started when no status recorded', () => {
      const status = useAccountSetupStore.getState().getStatus('p1', 'JPN');
      expect(status).toBe('not_started');
    });

    it('returns the stored status for a profile × portal pair', () => {
      useAccountSetupStore.setState({
        statuses: { 'p1__GBR': { profileId: 'p1', portalCode: 'GBR', status: 'ready' } },
      });
      expect(useAccountSetupStore.getState().getStatus('p1', 'GBR')).toBe('ready');
    });

    it('returns not_started for a different profile on the same portal', () => {
      useAccountSetupStore.setState({
        statuses: { 'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready' } },
      });
      expect(useAccountSetupStore.getState().getStatus('p2', 'JPN')).toBe('not_started');
    });

    it('returns not_started for a different portal on the same profile', () => {
      useAccountSetupStore.setState({
        statuses: { 'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready' } },
      });
      expect(useAccountSetupStore.getState().getStatus('p1', 'GBR')).toBe('not_started');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // setStatus
  // ──────────────────────────────────────────────────────────────
  describe('setStatus', () => {
    it('creates a new status entry when none exists', () => {
      useAccountSetupStore.getState().setStatus('p1', 'JPN', 'setup_started');

      const { statuses } = useAccountSetupStore.getState();
      expect(Object.keys(statuses)).toHaveLength(1);
      expect(statuses['p1__JPN']).toMatchObject({
        profileId: 'p1',
        portalCode: 'JPN',
        status: 'setup_started',
      });
    });

    it('updates an existing status entry', () => {
      useAccountSetupStore.setState({
        statuses: {
          'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'setup_started' },
        },
      });

      useAccountSetupStore.getState().setStatus('p1', 'JPN', 'ready');

      const { statuses } = useAccountSetupStore.getState();
      expect(Object.keys(statuses)).toHaveLength(1);
      expect(statuses['p1__JPN'].status).toBe('ready');
    });

    it('does not affect other entries when updating one', () => {
      useAccountSetupStore.setState({
        statuses: {
          'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'setup_started' },
          'p2__GBR': { profileId: 'p2', portalCode: 'GBR', status: 'not_started' },
        },
      });

      useAccountSetupStore.getState().setStatus('p1', 'JPN', 'ready');

      const { statuses } = useAccountSetupStore.getState();
      expect(Object.keys(statuses)).toHaveLength(2);
      expect(statuses['p2__GBR'].status).toBe('not_started');
    });

    it('persists to MMKV on every update', () => {
      useAccountSetupStore.getState().setStatus('p1', 'JPN', 'ready');
      expect(mockMmkvService.setString).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it('sets lastChecked timestamp when updating status', () => {
      const beforeMs = Date.now();
      useAccountSetupStore.getState().setStatus('p1', 'JPN', 'ready');
      const afterMs = Date.now();

      const status = useAccountSetupStore.getState().statuses['p1__JPN'];

      expect(status?.lastChecked).toBeDefined();
      const checkedMs = new Date(status!.lastChecked!).getTime();
      expect(checkedMs).toBeGreaterThanOrEqual(beforeMs);
      expect(checkedMs).toBeLessThanOrEqual(afterMs);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // markReady
  // ──────────────────────────────────────────────────────────────
  describe('markReady', () => {
    it('sets status to ready', () => {
      useAccountSetupStore.getState().markReady('p1', 'JPN');
      expect(useAccountSetupStore.getState().getStatus('p1', 'JPN')).toBe('ready');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // markStarted
  // ──────────────────────────────────────────────────────────────
  describe('markStarted', () => {
    it('sets status to setup_started', () => {
      useAccountSetupStore.getState().markStarted('p1', 'GBR');
      expect(useAccountSetupStore.getState().getStatus('p1', 'GBR')).toBe('setup_started');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // resetStatus
  // ──────────────────────────────────────────────────────────────
  describe('resetStatus', () => {
    it('resets a ready status back to not_started', () => {
      useAccountSetupStore.setState({
        statuses: { 'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready' } },
      });
      useAccountSetupStore.getState().resetStatus('p1', 'JPN');
      expect(useAccountSetupStore.getState().getStatus('p1', 'JPN')).toBe('not_started');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // clearProfileStatuses
  // ──────────────────────────────────────────────────────────────
  describe('clearProfileStatuses', () => {
    it('removes all statuses for a given profile', () => {
      useAccountSetupStore.setState({
        statuses: {
          'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready' },
          'p1__GBR': { profileId: 'p1', portalCode: 'GBR', status: 'setup_started' },
          'p2__JPN': { profileId: 'p2', portalCode: 'JPN', status: 'ready' },
        },
      });

      useAccountSetupStore.getState().clearProfileStatuses('p1');

      const { statuses } = useAccountSetupStore.getState();
      expect(Object.keys(statuses)).toHaveLength(1);
      expect(statuses['p2__JPN'].profileId).toBe('p2');
    });

    it('persists after removing', () => {
      useAccountSetupStore.setState({
        statuses: { 'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready' } },
      });
      useAccountSetupStore.getState().clearProfileStatuses('p1');
      expect(mockMmkvService.setString).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // clearAllStatuses
  // ──────────────────────────────────────────────────────────────
  describe('clearAllStatuses', () => {
    it('empties the statuses map', () => {
      useAccountSetupStore.setState({
        statuses: {
          'p1__JPN': { profileId: 'p1', portalCode: 'JPN', status: 'ready' },
          'p2__GBR': { profileId: 'p2', portalCode: 'GBR', status: 'ready' },
        },
      });

      useAccountSetupStore.getState().clearAllStatuses();

      expect(useAccountSetupStore.getState().statuses).toEqual({});
    });

    it('deletes the MMKV key on clearAll', () => {
      useAccountSetupStore.getState().clearAllStatuses();
      expect(mockMmkvService.delete).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Persistence round-trip
  // ──────────────────────────────────────────────────────────────
  describe('persistence round-trip', () => {
    it('stores and retrieves multiple statuses correctly', () => {
      // First session: mark some portals
      useAccountSetupStore.getState().markReady('user-1', 'JPN');
      useAccountSetupStore.getState().markStarted('user-1', 'GBR');

      const calls = mockMmkvService.setString.mock.calls;
      const stored = calls[calls.length - 1]![1];

      // Simulate app restart: new session loads from MMKV
      useAccountSetupStore.setState({ statuses: {} });
      mockMmkvService.getString.mockReturnValue(stored);

      useAccountSetupStore.getState().loadStatuses();

      expect(useAccountSetupStore.getState().getStatus('user-1', 'JPN')).toBe('ready');
      expect(useAccountSetupStore.getState().getStatus('user-1', 'GBR')).toBe('setup_started');
    });
  });
});
