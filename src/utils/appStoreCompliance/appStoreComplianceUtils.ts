/**
 * Metadata validation and CI summary generation utilities.
 */

import { Platform } from 'react-native';
import type { AppStoreComplianceCheck, ComplianceReport } from './appStoreComplianceTypes';

/**
 * Validate app store metadata requirements.
 */
export function validateMetadata(metadata: {
  appName?: string;
  description?: string;
  keywords?: string[];
  category?: string;
}): AppStoreComplianceCheck[] {
  const checks: AppStoreComplianceCheck[] = [];

  if (!metadata.appName || metadata.appName.trim().length === 0) {
    checks.push({
      id: 'app_name_missing',
      name: 'App Name Missing',
      category: 'metadata',
      platform: 'both',
      required: true,
      status: 'fail',
      message: 'App name is required',
      fixAction: 'Provide app name in store listing',
    });
  }

  if (!metadata.description || metadata.description.trim().length < 50) {
    checks.push({
      id: 'description_too_short',
      name: 'Description Too Short',
      category: 'metadata',
      platform: 'both',
      required: true,
      status: 'fail',
      message: 'App description must be at least 50 characters',
      fixAction: 'Write detailed app description',
    });
  }

  if (Platform.OS === 'ios' && (!metadata.keywords || metadata.keywords.length === 0)) {
    checks.push({
      id: 'no_keywords_ios',
      name: 'No Keywords (iOS)',
      category: 'metadata',
      platform: 'ios',
      required: false,
      status: 'warning',
      message: 'Keywords help with App Store discoverability',
      fixAction: 'Add relevant keywords for App Store',
    });
  }

  return checks;
}

/**
 * Generate compliance summary for CI/CD.
 */
export function generateCISummary(report: ComplianceReport): string {
  const { summary } = report;
  const criticalFailures = report.checks.filter(c => c.required && c.status === 'fail');

  let output = `## App Store Compliance Report\n\n`;
  output += `**Platform:** ${report.platform}\n`;
  output += `**Version:** ${report.appVersion} (${report.buildNumber})\n`;
  output += `**Timestamp:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

  output += `### Summary\n`;
  output += `- ✅ **Passed:** ${summary.passed}/${summary.total}\n`;
  output += `- ❌ **Failed:** ${summary.failed}/${summary.total}\n`;
  output += `- ⚠️ **Warnings:** ${summary.warnings}/${summary.total}\n`;
  output += `- ❓ **Unknown:** ${summary.unknown}/${summary.total}\n\n`;

  if (criticalFailures.length > 0) {
    output += `### ❌ Critical Failures (Blocking)\n`;
    for (const failure of criticalFailures) {
      output += `- **${failure.name}:** ${failure.message}\n`;
      if (failure.fixAction) {
        output += `  - *Fix:* ${failure.fixAction}\n`;
      }
    }
    output += '\n';
  }

  const warnings = report.checks.filter(c => c.status === 'warning');
  if (warnings.length > 0) {
    output += `### ⚠️ Warnings (Recommended Fixes)\n`;
    for (const warning of warnings) {
      output += `- **${warning.name}:** ${warning.message}\n`;
      if (warning.fixAction) {
        output += `  - *Suggestion:* ${warning.fixAction}\n`;
      }
    }
  }

  return output;
}
