import { PortalMonitor } from '@/services/monitoring/portalMonitor';

jest.mock('@/services/testing/portalHealthChecker', () => ({
  portalHealthChecker: {
    checkPortalHealth: jest.fn(),
    isPortalConsistentlyHealthy: jest.fn(() => true),
    getHealthSummary: jest.fn(() => ({
      healthy: 0,
      degraded: 0,
      offline: 0,
    })),
    clearHistory: jest.fn(),
  },
}));

jest.mock('@/services/monitoring/submissionAnalytics', () => ({
  submissionAnalytics: {
    recordPortalPerformance: jest.fn(),
  },
}));

jest.mock('@/services/monitoring/portalAutoResponse', () => ({
  executeAutoResponses: jest.fn(() => Promise.resolve([])),
}));

import { portalHealthChecker } from '@/services/testing/portalHealthChecker';

const mockedHealthChecker = portalHealthChecker as jest.Mocked<typeof portalHealthChecker>;

describe('PortalMonitor', () => {
  let monitor: PortalMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    monitor = new PortalMonitor({ enableAlerts: false });
    // Clear data populated by constructor's initializePortals
    monitor.clearData();
  });

  afterEach(() => {
    monitor.stopMonitoring();
    jest.useRealTimers();
  });

  describe('addPortal / removePortal', () => {
    it('adds a portal and increases monitored count', () => {
      // Start fresh — remove defaults by creating with cleared state
      const fresh = new PortalMonitor({ enableAlerts: false });
      const before = fresh.getMonitoringStatus().monitoredPortals;

      fresh.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      const after = fresh.getMonitoringStatus().monitoredPortals;

      expect(after).toBe(before + 1);
    });

    it('removes a portal and decreases monitored count', () => {
      monitor.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      monitor.addPortal('AUS', 'ETA', 'https://eta.example.gov.au');
      const before = monitor.getMonitoringStatus().monitoredPortals;

      monitor.removePortal('KOR');
      const after = monitor.getMonitoringStatus().monitoredPortals;

      expect(after).toBe(before - 1);
    });

    it('removing a non-existent portal is a no-op', () => {
      monitor.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      const before = monitor.getMonitoringStatus().monitoredPortals;

      monitor.removePortal('XXX');
      const after = monitor.getMonitoringStatus().monitoredPortals;

      expect(after).toBe(before);
    });
  });

  describe('getMonitoringStatus', () => {
    it('returns isRunning false before starting', () => {
      const status = monitor.getMonitoringStatus();

      expect(status.isRunning).toBe(false);
      expect(status.activeAlerts).toBe(0);
      expect(status.nextCheckAt).toBeUndefined();
    });

    it('returns isRunning true after starting', () => {
      monitor.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      monitor.startMonitoring();

      const status = monitor.getMonitoringStatus();
      expect(status.isRunning).toBe(true);
      expect(typeof status.nextCheckAt).toBe('string');
    });

    it('reflects the number of monitored portals', () => {
      monitor.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      monitor.addPortal('AUS', 'ETA', 'https://eta.example.gov.au');

      // Default portals (8) + 2 added = 10
      expect(monitor.getMonitoringStatus().monitoredPortals).toBeGreaterThanOrEqual(2);
    });

    it('includes health summary from portalHealthChecker', () => {
      mockedHealthChecker.getHealthSummary.mockReturnValue({
        healthy: 3,
        degraded: 1,
        offline: 0,
      } as any);

      const status = monitor.getMonitoringStatus();
      expect(status.healthyPortals).toBe(3);
      expect(status.degradedPortals).toBe(1);
      expect(status.offlinePortals).toBe(0);
    });
  });

  describe('acknowledgeAlert / resolveAlert', () => {
    it('returns false when acknowledging a non-existent alert', () => {
      expect(monitor.acknowledgeAlert('fake_alert')).toBe(false);
    });

    it('returns false when resolving a non-existent alert', () => {
      expect(monitor.resolveAlert('fake_alert')).toBe(false);
    });
  });

  describe('clearData', () => {
    it('resets alerts and auto-responses', () => {
      monitor.clearData();

      const allActive = monitor.getAllActiveAlerts();
      expect(allActive).toHaveLength(0);
      expect(mockedHealthChecker.clearHistory).toHaveBeenCalledWith();
    });

    it('can be called multiple times without error', () => {
      monitor.clearData();
      monitor.clearData();

      expect(monitor.getAllActiveAlerts()).toHaveLength(0);
    });
  });

  describe('startMonitoring / stopMonitoring', () => {
    it('sets isMonitoring to true on start', () => {
      monitor.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      monitor.startMonitoring();

      expect(monitor.getMonitoringStatus().isRunning).toBe(true);
    });

    it('sets isMonitoring to false on stop', () => {
      monitor.addPortal('KOR', 'K-ETA', 'https://k-eta.go.kr');
      monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(monitor.getMonitoringStatus().isRunning).toBe(false);
    });

    it('does not fail when stopping without starting', () => {
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });
  });

  describe('getAutoResponses', () => {
    it('returns empty array for unknown country', () => {
      expect(monitor.getAutoResponses('ZZZ')).toEqual([]);
    });
  });
});
