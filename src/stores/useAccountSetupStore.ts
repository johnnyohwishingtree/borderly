import { create } from 'zustand';
import { mmkvService } from '@/services/storage';
import { AccountSetupStatus, AccountReadinessStatus } from '@/types/submission';

const STORAGE_KEY = 'account_setup_statuses';

/** Map key for a profile × portal combination */
function statusKey(profileId: string, portalCode: string): string {
  return `${profileId}__${portalCode}`;
}

interface AccountSetupStore {
  /** All stored account setup statuses, keyed by `${profileId}__${portalCode}` for O(1) lookup */
  statuses: Record<string, AccountSetupStatus>;

  /** Load statuses from MMKV into state */
  loadStatuses: () => void;

  /**
   * Get the readiness status for a specific profile × portal combination.
   * Returns 'not_started' if no status has been recorded.
   */
  getStatus: (profileId: string, portalCode: string) => AccountReadinessStatus;

  /** Set an explicit status for a profile × portal combination */
  setStatus: (profileId: string, portalCode: string, status: AccountReadinessStatus) => void;

  /** Mark the account as fully ready for a profile × portal combination */
  markReady: (profileId: string, portalCode: string) => void;

  /** Mark account setup as started (in progress) */
  markStarted: (profileId: string, portalCode: string) => void;

  /** Reset account setup status back to not_started */
  resetStatus: (profileId: string, portalCode: string) => void;

  /** Remove all statuses for a given profile (e.g. when profile is deleted) */
  clearProfileStatuses: (profileId: string) => void;

  /** Remove all stored statuses (for testing / app reset) */
  clearAllStatuses: () => void;
}

/** Persist the statuses map to MMKV */
function persistStatuses(statuses: Record<string, AccountSetupStatus>): void {
  try {
    mmkvService.setString(STORAGE_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error('Failed to persist account setup statuses:', error);
  }
}

/** Load statuses from MMKV. Returns empty map if nothing stored. */
function loadFromStorage(): Record<string, AccountSetupStatus> {
  try {
    const raw = mmkvService.getString(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, AccountSetupStatus>;
    }
  } catch (error) {
    console.warn('Failed to load account setup statuses, using empty state:', error);
  }
  return {};
}

export const useAccountSetupStore = create<AccountSetupStore>((set, get) => ({
  statuses: {},

  loadStatuses: () => {
    const statuses = loadFromStorage();
    set({ statuses });
  },

  getStatus: (profileId: string, portalCode: string): AccountReadinessStatus => {
    const key = statusKey(profileId, portalCode);
    return get().statuses[key]?.status ?? 'not_started';
  },

  setStatus: (profileId: string, portalCode: string, status: AccountReadinessStatus) => {
    const key = statusKey(profileId, portalCode);
    const now = new Date().toISOString();
    set(state => {
      const existing = state.statuses[key];
      const updated: Record<string, AccountSetupStatus> = {
        ...state.statuses,
        [key]: { ...existing, profileId, portalCode, status, lastChecked: now },
      };
      persistStatuses(updated);
      return { statuses: updated };
    });
  },

  markReady: (profileId: string, portalCode: string) => {
    get().setStatus(profileId, portalCode, 'ready');
  },

  markStarted: (profileId: string, portalCode: string) => {
    get().setStatus(profileId, portalCode, 'setup_started');
  },

  resetStatus: (profileId: string, portalCode: string) => {
    get().setStatus(profileId, portalCode, 'not_started');
  },

  clearProfileStatuses: (profileId: string) => {
    set(state => {
      const updated = Object.fromEntries(
        Object.entries(state.statuses).filter(([, v]) => v.profileId !== profileId)
      );
      persistStatuses(updated);
      return { statuses: updated };
    });
  },

  clearAllStatuses: () => {
    mmkvService.delete(STORAGE_KEY);
    set({ statuses: {} });
  },
}));
