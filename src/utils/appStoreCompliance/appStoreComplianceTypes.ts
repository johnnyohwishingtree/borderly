/**
 * Type definitions for App Store compliance validation.
 */

export interface AppStoreComplianceCheck {
  id: string;
  name: string;
  category: 'configuration' | 'permissions' | 'privacy' | 'content' | 'metadata';
  platform: 'ios' | 'android' | 'both';
  required: boolean;
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  message: string;
  fixAction?: string;
}

export interface ComplianceReport {
  appVersion: string;
  buildNumber: string;
  platform: string;
  timestamp: string;
  checks: AppStoreComplianceCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    unknown: number;
  };
}
