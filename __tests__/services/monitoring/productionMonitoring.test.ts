jest.mock('../../../src/utils/piiSanitizer', () => ({
  sanitizeObject: jest.fn((data: any) => data),
  sanitizeError: jest.fn((error: Error) => ({ message: error.message, stack: error.stack })),
}));

import type { ProductionMonitoringService as ProductionMonitoringServiceType } from '../../../src/services/monitoring/productionMonitoring';

// Helper to get a fresh module with new singleton
async function loadFreshModule() {
  jest.resetModules();
  const mod = await import('../../../src/services/monitoring/productionMonitoring');
  return {
    ProductionMonitoringService: mod.ProductionMonitoringService,
    productionMonitoring: mod.productionMonitoring,
  };
}

describe('ProductionMonitoringService', () => {
  let service: ProductionMonitoringServiceType;
  let ProductionMonitoringService: typeof ProductionMonitoringServiceType;

  beforeEach(async () => {
    const mod = await loadFreshModule();
    ProductionMonitoringService = mod.ProductionMonitoringService;
    service = new ProductionMonitoringService();
  });

  describe('recordEvent', () => {
    it('records an event and increases event count', () => {
      service.recordEvent('user_action', 'navigation', { action: 'tap' }, 'low');
      const status = service.getStatus();
      expect(status.eventCount).toBe(1);
      expect(status.lastEvent!.type).toBe('user_action');
      expect(status.lastEvent!.category).toBe('navigation');
    });

    it('does not record events when disabled', () => {
      service.setEnabled(false);
      service.recordEvent('user_action', 'navigation', { action: 'tap' }, 'low');
      const status = service.getStatus();
      // setEnabled(false) does not record anything because it returns early
      // The only event would be from setEnabled(true) if called — but we set false
      expect(status.eventCount).toBe(0);
    });

    it('attaches sessionId and platform to events', () => {
      service.recordEvent('system', 'test', { foo: 'bar' });
      const status = service.getStatus();
      expect(status.lastEvent!.sessionId).toBe(status.sessionId);
      expect(status.lastEvent!.platform).toBe('ios');
    });
  });

  describe('recordPerformance', () => {
    it('records a performance event with correct data', () => {
      service.recordPerformance({
        name: 'form_load',
        value: 250,
        unit: 'ms',
        category: 'form_generation',
      });
      const status = service.getStatus();
      expect(status.eventCount).toBe(1);
      expect(status.lastEvent!.type).toBe('performance');
      expect(status.lastEvent!.category).toBe('form_generation');
      expect(status.lastEvent!.data.name).toBe('form_load');
      expect(status.lastEvent!.data.value).toBe(250);
      expect(status.lastEvent!.data.unit).toBe('ms');
    });
  });

  describe('recordError', () => {
    it('records error with sanitization', () => {
      const error = new Error('Something went wrong');
      service.recordError(error, 'form_generation', { field: 'name' }, 'high');
      const status = service.getStatus();
      expect(status.eventCount).toBe(1);
      expect(status.lastEvent!.type).toBe('error');
      expect(status.lastEvent!.severity).toBe('high');
      expect(status.lastEvent!.data.message).toBe('Something went wrong');
      expect(status.lastEvent!.data.errorType).toBe('Error');
    });
  });

  describe('recordUserAction', () => {
    it('records user action with screen and action data', () => {
      service.recordUserAction('tap_submit', 'FormScreen', { formId: '123' });
      const status = service.getStatus();
      expect(status.eventCount).toBe(1);
      expect(status.lastEvent!.type).toBe('user_action');
      expect(status.lastEvent!.data.action).toBe('tap_submit');
      expect(status.lastEvent!.data.screen).toBe('FormScreen');
    });
  });

  describe('startTiming', () => {
    it('returns a stop function that records duration', () => {
      const stop = service.startTiming('form_generate');
      // Simulate some work
      stop();
      const status = service.getStatus();
      expect(status.eventCount).toBe(1);
      expect(status.lastEvent!.type).toBe('performance');
      expect(status.lastEvent!.data.value).toBeGreaterThanOrEqual(0);
      expect(status.lastEvent!.data.unit).toBe('ms');
      expect(status.lastEvent!.data.name).toBe('form_generate');
    });
  });

  describe('getStatus', () => {
    it('returns correct status fields', () => {
      const status = service.getStatus();
      expect(status.isEnabled).toBe(true);
      expect(typeof status.sessionId).toBe('string');
      expect(status.sessionId.length).toBeGreaterThan(0);
      expect(status.eventCount).toBe(0);
      expect(status.criticalEvents).toBe(0);
      expect(status.lastEvent).toBeUndefined();
    });

    it('tracks critical events count', () => {
      service.recordEvent('error', 'app_crash', { reason: 'oom' }, 'critical');
      const status = service.getStatus();
      // At least 1 critical event (alert triggers may add more)
      expect(status.criticalEvents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('exportData', () => {
    it('exports all recorded events', () => {
      service.recordEvent('system', 'test', { a: 1 });
      service.recordEvent('error', 'test', { b: 2 }, 'high');
      const exported = service.exportData();
      expect(exported).toHaveLength(2);
      expect(exported[0].type).toBe('system');
      expect(exported[1].type).toBe('error');
    });

    it('supports time range filtering', () => {
      const now = Date.now();
      service.recordEvent('system', 'early', { seq: 1 });
      service.recordEvent('system', 'late', { seq: 2 });

      // Export with a range that includes everything from now onward
      const exported = service.exportData({ start: now - 1000, end: now + 10000 });
      expect(exported.length).toBeGreaterThanOrEqual(2);

      // Export with a range in the far future should return nothing
      const empty = service.exportData({ start: now + 100000, end: now + 200000 });
      expect(empty).toHaveLength(0);
    });
  });

  describe('setEnabled', () => {
    it('disables monitoring so no events are recorded', () => {
      service.setEnabled(false);
      service.recordEvent('system', 'test', { a: 1 });
      expect(service.getStatus().eventCount).toBe(0);
      expect(service.getStatus().isEnabled).toBe(false);
    });

    it('re-enables monitoring and records an enabled event', () => {
      service.setEnabled(false);
      service.setEnabled(true);
      const status = service.getStatus();
      expect(status.isEnabled).toBe(true);
      // setEnabled(true) records a system event
      expect(status.eventCount).toBe(1);
      expect(status.lastEvent!.category).toBe('monitoring');
      expect(status.lastEvent!.data.action).toBe('enabled');
    });
  });
});

describe('productionMonitoring singleton', () => {
  it('is an instance of ProductionMonitoringService', async () => {
    const mod = await loadFreshModule();
    expect(mod.productionMonitoring).toBeInstanceOf(mod.ProductionMonitoringService);
  });

  it('returns fresh instance per module reset', async () => {
    const mod1 = await loadFreshModule();
    mod1.productionMonitoring.recordEvent('system', 'test', { x: 1 });

    const mod2 = await loadFreshModule();
    const status = mod2.productionMonitoring.getStatus();
    expect(status.eventCount).toBe(0);
  });
});
