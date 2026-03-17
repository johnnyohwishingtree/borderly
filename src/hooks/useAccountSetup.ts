import { useCallback } from 'react';
import { useAccountSetupStore } from '@/stores/useAccountSetupStore';
import type { AccountReadinessStatus } from '@/types/submission';

/**
 * Hook wrapping useAccountSetupStore for use in components.
 * Components must not import stores directly — this hook provides
 * the account setup operations they need.
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

  return {
    getPortalStatus,
    markPortalReady,
    resetPortalStatus,
    loadStatuses,
  };
}
