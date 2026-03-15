import { create } from 'zustand';
import { mmkvService } from '@/services/storage';
import { AccountSetupStatus, AccountReadinessStatus } from '@/types/submission';

const STORAGE_KEY = 'account_setup_statuses';

interface AccountSetupStore {
  /** All stored account setup statuses */
  statuses: AccountSetupStatus[];

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

/** Persist the full statuses array to MMKV */
function persistStatuses(statuses: AccountSetupStatus[]): void {
  try {
    mmkvService.setString(STORAGE_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error('Failed to persist account setup statuses:', error);
  }
}

/** Load statuses from MMKV. Returns empty array if nothing stored. */
function loadFromStorage(): AccountSetupStatus[] {
  try {
    const raw = mmkvService.getString(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AccountSetupStatus[];
    }
  } catch (error) {
    console.warn('Failed to load account setup statuses, using empty state:', error);
  }
  return [];
}

export const useAccountSetupStore = create<AccountSetupStore>((set, get) => ({
  statuses: [],

  loadStatuses: () => {
    const statuses = loadFromStorage();
    set({ statuses });
  },

  getStatus: (profileId: string, portalCode: string): AccountReadinessStatus => {
    const found = get().statuses.find(
      s => s.profileId === profileId && s.portalCode === portalCode
    );
    return found?.status ?? 'not_started';
  },

  setStatus: (profileId: string, portalCode: string, status: AccountReadinessStatus) => {
    const now = new Date().toISOString();
    set(state => {
      const existing = state.statuses.findIndex(
        s => s.profileId === profileId && s.portalCode === portalCode
      );
      let updated: AccountSetupStatus[];
      if (existing >= 0) {
        updated = state.statuses.map((s, i) =>
          i === existing ? { ...s, status, lastChecked: now } : s
        );
      } else {
        updated = [
          ...state.statuses,
          { profileId, portalCode, status, lastChecked: now },
        ];
      }
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
      const updated = state.statuses.filter(s => s.profileId !== profileId);
      persistStatuses(updated);
      return { statuses: updated };
    });
  },

  clearAllStatuses: () => {
    mmkvService.delete(STORAGE_KEY);
    set({ statuses: [] });
  },
}));
