/**
 * Risk assessment and recommendation generation for data leak detection.
 */

import type { DataLeak, DataLeakRecommendation } from './dataLeakDetectorTypes';

export function calculateRiskLevel(leaks: DataLeak[]): 'critical' | 'high' | 'medium' | 'low' {
  const criticalLeaks = leaks.filter(l => l.severity === 'critical').length;
  const highLeaks = leaks.filter(l => l.severity === 'high').length;
  const mediumLeaks = leaks.filter(l => l.severity === 'medium').length;

  if (criticalLeaks > 0) return 'critical';
  if (highLeaks > 2) return 'critical';
  if (highLeaks > 0) return 'high';
  if (mediumLeaks > 3) return 'high';
  if (mediumLeaks > 0) return 'medium';

  return 'low';
}

export function generateRecommendations(leaks: DataLeak[]): DataLeakRecommendation[] {
  const recommendations: DataLeakRecommendation[] = [];

  const passportLeaks = leaks.filter(l => l.type === 'passport');
  if (passportLeaks.length > 0) {
    recommendations.push({
      priority: 'immediate',
      title: 'Passport Data Security Violation',
      description: 'Passport information found outside secure keychain storage',
      actions: [
        'Move all passport data to keychain with biometric protection',
        'Clear passport data from insecure storage locations',
        'Audit app code to prevent future passport data leaks',
      ],
      impact: 'App Store rejection risk, severe privacy violation',
    });
  }

  const financialLeaks = leaks.filter(l => l.type === 'financial');
  if (financialLeaks.length > 0) {
    recommendations.push({
      priority: 'immediate',
      title: 'Financial Data Detected',
      description: 'Credit card or financial information found in app storage',
      actions: [
        'Remove all financial data from app storage',
        'Implement PCI DSS compliance if handling financial data',
        'Use secure payment processing services instead of storing card data',
      ],
      impact: 'Legal compliance risk, potential fraud liability',
    });
  }

  if (leaks.length > 0) {
    recommendations.push({
      priority: 'urgent',
      title: 'Data Minimization Implementation',
      description: 'Reduce PII collection and storage to only what is necessary',
      actions: [
        'Audit all data collection points',
        'Implement data retention policies',
        'Use data masking for non-essential PII display',
      ],
      impact: 'Improved privacy compliance, reduced attack surface',
    });

    recommendations.push({
      priority: 'standard',
      title: 'Regular Security Audits',
      description: 'Implement automated data leak detection in CI/CD pipeline',
      actions: [
        'Add data leak scanning to automated tests',
        'Schedule monthly security audits',
        'Implement monitoring for new PII patterns',
      ],
      impact: 'Proactive security posture, early leak detection',
    });
  }

  const asyncStorageLeaks = leaks.filter(l => l.location.startsWith('asyncstorage:'));
  if (asyncStorageLeaks.length > 0) {
    recommendations.push({
      priority: 'urgent',
      title: 'AsyncStorage Security Risk',
      description: 'Sensitive data found in unencrypted AsyncStorage',
      actions: [
        'Migrate sensitive data to keychain or encrypted database',
        'Clear AsyncStorage of all PII',
        'Implement AsyncStorage usage guidelines for team',
      ],
      impact: 'Prevents data exposure through device backups and forensics',
    });
  }

  return recommendations;
}
