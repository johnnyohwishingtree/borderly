import { useCallback } from 'react';
import { useAccountSetupStore } from '@/stores/useAccountSetupStore';
import { keychainService } from '@/services/storage/keychain';
import type { AccountReadinessStatus } from '@/types/submission';

/**
 * Hook wrapping useAccountSetupStore for use in components.
 * Components must not import stores or services directly — this hook
 * provides the account setup and credential operations they need.
 */
export function useAccountSetup(profileId: string) {
  const { getStatus, markReady, resetStatus, loadStatuses } = useAccountSetupStore();

  const getPortalStatus = useCallback(
    (portalCode: string): AccountReadinessStatus => getStatus(profileId, portalCode),
    [profileId, getStatus]
  );

  const markPortalReady = useCallback(
    (portalCode: string) => markReady(profileId, portalCode),
    [profileId, markReady]
  );

  const resetPortalStatus = useCallback(
    (portalCode: string) => resetStatus(profileId, portalCode),
    [profileId, resetStatus]
  );

  const getPortalCredential = useCallback(
    (portalCode: string) => keychainService.getPortalCredential(profileId, portalCode),
    [profileId]
  );

  const storePortalCredential = useCallback(
    (portalCode: string, username: string, password: string, email?: string) =>
      keychainService.storePortalCredential(profileId, portalCode, username, password, email),
    [profileId]
  );

  return {
    getPortalStatus,
    markPortalReady,
    resetPortalStatus,
    loadStatuses,
    getPortalCredential,
    storePortalCredential,
  };
}
