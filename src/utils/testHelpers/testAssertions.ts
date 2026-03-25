/**
 * Assertion Helpers - Common test assertions
 */

import { FilledForm } from '../../services/forms/formEngine';
import { PortalHealthStatus } from '../../services/testing/portalHealthChecker';
import { ComplianceCheckResult } from '../../services/testing/compliance';

export class TestAssertions {
  /**
   * Asserts that a form is valid for submission
   */
  static assertValidForm(form: FilledForm): void {
    if (form.stats.completionPercentage < 100) {
      throw new Error(`Form incomplete: ${form.stats.completionPercentage}% completed`);
    }

    const hasRequiredFields = form.sections.every(section =>
      section.fields.every(field =>
        !field.required || (field.currentValue && String(field.currentValue).trim() !== '')
      )
    );

    if (!hasRequiredFields) {
      throw new Error('Form missing required fields');
    }
  }

  /**
   * Asserts that portal health is acceptable
   */
  static assertPortalHealthy(health: PortalHealthStatus): void {
    if (health.status === 'offline') {
      throw new Error(`Portal ${health.portalName} is offline`);
    }

    if (health.status === 'error') {
      throw new Error(`Portal ${health.portalName} has errors: ${health.issues.map(i => i.message).join(', ')}`);
    }

    const criticalIssues = health.issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      throw new Error(`Portal ${health.portalName} has critical issues: ${criticalIssues.map(i => i.message).join(', ')}`);
    }
  }

  /**
   * Asserts that compliance check passed
   */
  static assertCompliant(compliance: ComplianceCheckResult): void {
    if (!compliance.isCompliant) {
      const criticalViolations = compliance.violations.filter(v => v.severity === 'critical');
      const highViolations = compliance.violations.filter(v => v.severity === 'high');

      if (criticalViolations.length > 0) {
        throw new Error(`Critical compliance violations: ${criticalViolations.map(v => v.message).join(', ')}`);
      }

      if (highViolations.length > 0) {
        throw new Error(`High-severity compliance violations: ${highViolations.map(v => v.message).join(', ')}`);
      }
    }
  }

  /**
   * Asserts that success rate meets threshold
   */
  static assertSuccessRate(actualRate: number, minimumRate: number): void {
    if (actualRate < minimumRate) {
      throw new Error(`Success rate ${actualRate.toFixed(1)}% is below minimum ${minimumRate}%`);
    }
  }

  /**
   * Asserts that response time is acceptable
   */
  static assertResponseTime(actualTime: number, maxTime: number): void {
    if (actualTime > maxTime) {
      throw new Error(`Response time ${actualTime}ms exceeds maximum ${maxTime}ms`);
    }
  }
}
