import type { TestMeta } from '@/types/testMeta';

export const PORTAL_LINKS_IDS: Record<string, TestMeta> = {
  // Scroll content
  portalCard: { id: 'portal-card', type: 'container', zone: 'scroll' },
  launchPortalButton: { id: 'launch-portal-button', type: 'button', zone: 'scroll' },
  portalStatus: { id: 'portal-status', type: 'container', zone: 'scroll' },
  instructions: { id: 'portal-instructions', type: 'container', zone: 'scroll' },
};
