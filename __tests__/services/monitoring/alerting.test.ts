import { AlertingService } from '@/services/monitoring/alerting';
import type { MonitoringEvent } from '@/services/monitoring/alertingTypes';
import type { AlertRule } from '@/services/monitoring/alertingTypes';

jest.mock('@/utils/piiSanitizer', () => ({
  sanitizeObject: jest.fn((obj: Record<string, unknown>) => obj),
}));

jest.mock('@/services/monitoring/alertRuleEvaluator', () => ({
  evaluateRule: jest.fn(() => false),
}));

import { evaluateRule } from '@/services/monitoring/alertRuleEvaluator';

const mockedEvaluateRule = evaluateRule as jest.MockedFunction<typeof evaluateRule>;

function createEvent(overrides: Partial<MonitoringEvent> = {}): MonitoringEvent {
  return {
    type: 'error',
    timestamp: Date.now(),
    category: 'test',
    data: {},
    severity: 'high',
    sessionId: 'session_1',
    appVersion: '1.0.0',
    platform: 'ios',
    ...overrides,
  };
}

function createRuleInput(
  overrides: Partial<Omit<AlertRule, 'id'>> = {}
): Omit<AlertRule, 'id'> {
  return {
    name: 'Test Rule',
    description: 'A test rule',
    category: 'test',
    condition: {
      type: 'event_count',
      eventType: 'error',
      operator: 'gte',
      value: 1,
    },
    threshold: 1,
    timeWindow: 5,
    severity: 'high',
    enabled: true,
    cooldown: 1,
    actions: [{ type: 'console', config: {}, enabled: true }],
    tags: { test: 'true' },
    ...overrides,
  };
}

describe('AlertingService', () => {
  let service: AlertingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertingService({ enableConsoleOutput: false });
  });

  describe('processEvent', () => {
    it('creates an alert when a rule matches the event', () => {
      mockedEvaluateRule.mockReturnValue(true);

      const event = createEvent();
      service.processEvent(event);

      const active = service.getActiveAlerts();
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active[0].status).toBe('active');
    });

    it('does not create an alert when no rules match', () => {
      mockedEvaluateRule.mockReturnValue(false);

      service.processEvent(createEvent());

      // Only default rules exist, none triggered
      const alerts = service.getActiveAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('does nothing when alerting is disabled', () => {
      service.updateConfig({ enabled: false });
      mockedEvaluateRule.mockReturnValue(true);

      service.processEvent(createEvent());

      expect(service.getActiveAlerts()).toHaveLength(0);
    });

    it('respects cooldown period after triggering a rule', () => {
      mockedEvaluateRule.mockReturnValue(true);

      service.processEvent(createEvent());
      const afterFirst = service.getActiveAlerts().length;

      // Second event should be blocked by cooldown
      service.processEvent(createEvent());
      const afterSecond = service.getActiveAlerts().length;

      expect(afterSecond).toBe(afterFirst);
    });
  });

  describe('addRule / removeRule', () => {
    it('adds a rule and returns a generated id', () => {
      const rulesBefore = service.getRules().length;
      const id = service.addRule(createRuleInput({ name: 'Custom Rule' }));

      expect(typeof id).toBe('string');
      expect(id).toContain('rule_');
      expect(service.getRules().length).toBe(rulesBefore + 1);

      const added = service.getRules().find(r => r.id === id);
      expect(added?.name).toBe('Custom Rule');
    });

    it('removes an existing rule and returns true', () => {
      const id = service.addRule(createRuleInput());
      const result = service.removeRule(id);

      expect(result).toBe(true);
      expect(service.getRules().find(r => r.id === id)).toBeUndefined();
    });

    it('returns false when removing a non-existent rule', () => {
      expect(service.removeRule('non_existent_id')).toBe(false);
    });
  });

  describe('acknowledgeAlert / resolveAlert', () => {
    beforeEach(() => {
      mockedEvaluateRule.mockReturnValue(true);
      service.processEvent(createEvent());
    });

    it('acknowledges an active alert', () => {
      const alert = service.getActiveAlerts()[0];
      const result = service.acknowledgeAlert(alert.id, 'tester');

      expect(result).toBe(true);

      const all = service.getAlerts();
      const acknowledged = all.find(a => a.id === alert.id);
      expect(acknowledged?.status).toBe('acknowledged');
      expect(acknowledged?.acknowledgedBy).toBe('tester');
      expect(typeof acknowledged?.acknowledgedAt).toBe('number');
    });

    it('returns false when acknowledging a non-existent alert', () => {
      expect(service.acknowledgeAlert('fake_id')).toBe(false);
    });

    it('resolves an active alert', () => {
      const alert = service.getActiveAlerts()[0];
      const result = service.resolveAlert(alert.id);

      expect(result).toBe(true);

      const all = service.getAlerts();
      const resolved = all.find(a => a.id === alert.id);
      expect(resolved?.status).toBe('resolved');
      expect(typeof resolved?.resolvedAt).toBe('number');
    });

    it('resolves an acknowledged alert', () => {
      const alert = service.getActiveAlerts()[0];
      service.acknowledgeAlert(alert.id);
      const result = service.resolveAlert(alert.id);

      expect(result).toBe(true);
    });

    it('returns false when resolving an already resolved alert', () => {
      const alert = service.getActiveAlerts()[0];
      service.resolveAlert(alert.id);

      expect(service.resolveAlert(alert.id)).toBe(false);
    });
  });

  describe('getActiveAlerts', () => {
    it('returns only alerts with active status', () => {
      mockedEvaluateRule.mockReturnValue(true);
      service.processEvent(createEvent());

      const active = service.getActiveAlerts();
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.every(a => a.status === 'active')).toBe(true);

      // Resolve one alert and verify it disappears
      service.resolveAlert(active[0].id);
      const afterResolve = service.getActiveAlerts();
      expect(afterResolve.length).toBe(active.length - 1);
    });

    it('returns empty array when no alerts exist', () => {
      expect(service.getActiveAlerts()).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('returns zeroed stats when no alerts have been created', () => {
      const stats = service.getStatistics();

      expect(stats.totalAlerts).toBe(0);
      expect(stats.activeAlerts).toBe(0);
      expect(stats.alertsByCategory).toEqual({});
      expect(stats.alertsBySeverity).toEqual({});
      expect(typeof stats.ruleStats).toBe('object');
    });

    it('aggregates alerts by category and severity', () => {
      mockedEvaluateRule.mockReturnValue(true);
      service.processEvent(createEvent());

      const stats = service.getStatistics();

      expect(stats.totalAlerts).toBeGreaterThanOrEqual(1);
      expect(stats.activeAlerts).toBeGreaterThanOrEqual(1);

      // At least one category and severity should be populated
      const categories = Object.keys(stats.alertsByCategory);
      const severities = Object.keys(stats.alertsBySeverity);
      expect(categories.length).toBeGreaterThan(0);
      expect(severities.length).toBeGreaterThan(0);
    });

    it('tracks rule trigger counts', () => {
      mockedEvaluateRule.mockReturnValue(true);
      service.processEvent(createEvent());

      const stats = service.getStatistics();
      const ruleIds = Object.keys(stats.ruleStats);
      expect(ruleIds.length).toBeGreaterThan(0);

      // At least one rule should have triggered > 0
      const anyTriggered = Object.values(stats.ruleStats).some(
        s => s.triggered > 0
      );
      expect(anyTriggered).toBe(true);
    });
  });

  describe('updateRule', () => {
    it('updates an existing rule and returns true', () => {
      const id = service.addRule(createRuleInput({ name: 'Original' }));
      const result = service.updateRule(id, { name: 'Updated' });

      expect(result).toBe(true);
      expect(service.getRules().find(r => r.id === id)?.name).toBe('Updated');
    });

    it('returns false for a non-existent rule', () => {
      expect(service.updateRule('nope', { name: 'X' })).toBe(false);
    });
  });
});
