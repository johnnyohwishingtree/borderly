/**
 * Alert Rule Evaluator
 *
 * Pure functions for evaluating alert rules against monitoring events.
 */

import type { MonitoringEvent } from './alertingTypes';
import type { AlertRule, AlertCondition } from './alertingTypes';

/**
 * Evaluates a rule against the event buffer within the rule's time window.
 * Returns true if the rule's condition is met.
 */
export function evaluateRule(
  rule: AlertRule,
  _event: MonitoringEvent,
  eventBuffer: MonitoringEvent[]
): boolean {
  const { condition } = rule;

  // Filter events for the time window
  const windowStart = Date.now() - (rule.timeWindow * 60 * 1000);
  const windowEvents = eventBuffer.filter(e => e.timestamp >= windowStart);

  switch (condition.type) {
    case 'event_count':
      return evaluateEventCount(condition, windowEvents, rule.threshold);

    case 'error_rate':
      return evaluateErrorRate(condition, windowEvents, rule.threshold);

    case 'performance_threshold':
      return evaluatePerformanceThreshold(condition, windowEvents, rule.threshold);

    case 'custom':
      // Placeholder for custom condition evaluation
      // This would be implemented based on specific requirements
      return false;

    default:
      return false;
  }
}

/**
 * Evaluates an event_count condition: counts events matching the condition
 * filters and compares against the threshold.
 */
export function evaluateEventCount(
  condition: AlertCondition,
  events: MonitoringEvent[],
  threshold: number
): boolean {
  const matchingEvents = events.filter(event => {
    if (condition.eventType && event.type !== condition.eventType) return false;
    if (condition.eventCategory && event.category !== condition.eventCategory) return false;
    if (condition.eventSeverity && event.severity !== condition.eventSeverity) return false;
    return true;
  });

  return compareValue(matchingEvents.length, condition.operator, threshold);
}

/**
 * Evaluates an error_rate condition: counts error events and compares
 * against the threshold.
 */
export function evaluateErrorRate(
  condition: AlertCondition,
  events: MonitoringEvent[],
  threshold: number
): boolean {
  const errorEvents = events.filter(e => e.type === 'error');
  return compareValue(errorEvents.length, condition.operator, threshold);
}

/**
 * Evaluates a performance_threshold condition: counts performance events
 * whose metric value exceeds the condition's value, then compares the
 * count against the threshold.
 */
export function evaluatePerformanceThreshold(
  condition: AlertCondition,
  events: MonitoringEvent[],
  threshold: number
): boolean {
  const perfEvents = events.filter(e =>
    e.type === 'performance' &&
    (!condition.eventCategory || e.category === condition.eventCategory)
  );

  const exceedingEvents = perfEvents.filter(event => {
    const value = condition.field ?
      getNestedValue(event, condition.field) :
      event.data.value;

    if (typeof value !== 'number') return false;
    return compareValue(value, condition.operator, condition.value as number);
  });

  return exceedingEvents.length >= threshold;
}

/**
 * Compares a numeric value against an expected value using the given operator.
 */
export function compareValue(
  actual: number,
  operator: AlertCondition['operator'],
  expected: number
): boolean {
  switch (operator) {
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
    case 'eq': return actual === expected;
    default: return false;
  }
}

/**
 * Retrieves a nested value from an object using a dot-separated path.
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
