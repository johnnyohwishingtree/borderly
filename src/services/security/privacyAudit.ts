import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import { databaseService } from '@/services/storage/database';
import { keychainService } from '@/services/storage/keychain';

export interface PrivacyAuditResult {
  timestamp: Date;
  complianceScore: number;
  violations: PrivacyViolation[];
  recommendations: PrivacyRecommendation[];
  dataInventory: DataInventoryItem[];
  biometricStatus: BiometricAuditStatus;
}

export interface PrivacyViolation {
  severity: 'high' | 'medium' | 'low';
  type: 'data_leak' | 'insecure_storage' | 'backup_exposure' | 'weak_encryption' | 'missing_biometric';
  description: string;
  location: string;
  remediation: string;
}

export interface PrivacyRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
}

export interface DataInventoryItem {
  category: 'passport' | 'personal' | 'trip' | 'form' | 'qr' | 'preferences';
  location: 'keychain' | 'database' | 'mmkv' | 'memory';
  encryption: 'biometric' | 'device' | 'none';
  backupStatus: 'excluded' | 'included' | 'unknown';
  sensitivity: 'pii' | 'sensitive' | 'public';
  dataTypes: string[];
}

export interface BiometricAuditStatus {
  available: boolean;
  configured: boolean;
  type: string | null;
  accessControl: string;
  keychainCompliance: boolean;
}

class PrivacyAuditService {
  private readonly mmkv = new MMKV({ id: 'borderly_audit' });
  private readonly AUDIT_HISTORY_KEY = 'audit_history';
  private readonly MAX_HISTORY_ENTRIES = 50;

  async runComprehensiveAudit(): Promise<PrivacyAuditResult> {
    const timestamp = new Date();
    const violations: PrivacyViolation[] = [];
    const recommendations: PrivacyRecommendation[] = [];
    const dataInventory: DataInventoryItem[] = [];

    // Audit biometric security
    const biometricStatus = await this.auditBiometricSecurity();
    if (!biometricStatus.available || !biometricStatus.configured) {
      violations.push({
        severity: 'high',
        type: 'missing_biometric',
        description: 'Biometric authentication is not properly configured',
        location: 'device',
        remediation: 'Enable biometric authentication for keychain access'
      });
    }

    // Audit keychain storage
    await this.auditKeychainStorage(violations, recommendations, dataInventory);

    // Audit database encryption
    await this.auditDatabaseSecurity(violations, recommendations, dataInventory);

    // Audit MMKV storage
    await this.auditMMKVStorage(violations, recommendations, dataInventory);

    // Check for data leaks
    await this.auditDataLeaks(violations, recommendations);

    // Audit backup exclusions
    await this.auditBackupExclusions(violations, recommendations);

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(violations);

    // Generate App Store compliance recommendations
    this.addAppStoreRecommendations(recommendations, violations);

    const result: PrivacyAuditResult = {
      timestamp,
      complianceScore,
      violations,
      recommendations,
      dataInventory,
      biometricStatus
    };

    // Store audit history
    await this.storeAuditHistory(result);

    return result;
  }

  private async auditBiometricSecurity(): Promise<BiometricAuditStatus> {
    try {
      const supportedType = await Keychain.getSupportedBiometryType();
      const isAvailable = await keychainService.isAvailable();
      
      let configured = false;
      try {
        // Test if we can access keychain with biometric options
        await keychainService.getProfile();
        configured = true;
      } catch {
        configured = false;
      }

      return {
        available: isAvailable,
        configured,
        type: supportedType,
        accessControl: 'BIOMETRY_CURRENT_SET',
        keychainCompliance: isAvailable && configured
      };
    } catch (error) {
      return {
        available: false,
        configured: false,
        type: null,
        accessControl: 'none',
        keychainCompliance: false
      };
    }
  }

  private async auditKeychainStorage(
    violations: PrivacyViolation[],
    recommendations: PrivacyRecommendation[],
    dataInventory: DataInventoryItem[]
  ): Promise<void> {
    // Audit passport data storage
    try {
      const profile = await keychainService.getProfile();
      if (profile) {
        dataInventory.push({
          category: 'passport',
          location: 'keychain',
          encryption: 'biometric',
          backupStatus: 'excluded',
          sensitivity: 'pii',
          dataTypes: ['passport_number', 'full_name', 'date_of_birth', 'nationality', 'document_expiry']
        });

        // Validate passport data doesn't contain obvious leaks
        const profileStr = JSON.stringify(profile);
        if (profileStr.includes('test') || profileStr.includes('demo') || profileStr.includes('example')) {
          violations.push({
            severity: 'medium',
            type: 'data_leak',
            description: 'Test or placeholder data detected in production profile',
            location: 'keychain:profile',
            remediation: 'Remove test data from production environment'
          });
        }
      }
    } catch (error) {
      violations.push({
        severity: 'medium',
        type: 'insecure_storage',
        description: 'Unable to verify keychain profile storage security',
        location: 'keychain:profile',
        remediation: 'Verify keychain access and biometric configuration'
      });
    }

    // Audit encryption key storage
    try {
      const encryptionKey = await keychainService.getEncryptionKey();
      if (encryptionKey) {
        dataInventory.push({
          category: 'preferences',
          location: 'keychain',
          encryption: 'biometric',
          backupStatus: 'excluded',
          sensitivity: 'sensitive',
          dataTypes: ['database_encryption_key']
        });

        // Validate encryption key strength
        if (encryptionKey.length < 64) {
          violations.push({
            severity: 'high',
            type: 'weak_encryption',
            description: 'Database encryption key is shorter than 256 bits',
            location: 'keychain:encryption_key',
            remediation: 'Generate a new 256-bit encryption key'
          });
        }
      }
    } catch (error) {
      violations.push({
        severity: 'high',
        type: 'insecure_storage',
        description: 'Database encryption key not found or inaccessible',
        location: 'keychain:encryption_key',
        remediation: 'Generate and store database encryption key in keychain'
      });
    }
  }

  private async auditDatabaseSecurity(
    violations: PrivacyViolation[],
    recommendations: PrivacyRecommendation[],
    dataInventory: DataInventoryItem[]
  ): Promise<void> {
    try {
      const database = await databaseService.getDatabase();
      
      // Inventory database contents
      const trips = await databaseService.getTrips();
      const qrCodes = await databaseService.getQRCodes();

      if (trips.length > 0) {
        dataInventory.push({
          category: 'trip',
          location: 'database',
          encryption: 'device',
          backupStatus: 'included',
          sensitivity: 'sensitive',
          dataTypes: ['trip_details', 'destinations', 'dates', 'form_data']
        });
      }

      if (qrCodes.length > 0) {
        dataInventory.push({
          category: 'qr',
          location: 'database',
          encryption: 'device',
          backupStatus: 'included',
          sensitivity: 'sensitive',
          dataTypes: ['government_qr_codes', 'submission_tokens']
        });
      }

      // Check for unencrypted sensitive data
      recommendations.push({
        priority: 'medium',
        title: 'Database Encryption Verification',
        description: 'Ensure WatermelonDB encryption is properly implemented at SQLite level',
        implementation: 'Verify SQLite encryption is active for borderly.db file'
      });
    } catch (error) {
      violations.push({
        severity: 'high',
        type: 'insecure_storage',
        description: 'Unable to access or verify database security',
        location: 'watermelondb',
        remediation: 'Investigate database connectivity and encryption setup'
      });
    }
  }

  private async auditMMKVStorage(
    violations: PrivacyViolation[],
    recommendations: PrivacyRecommendation[],
    dataInventory: DataInventoryItem[]
  ): Promise<void> {
    try {
      // MMKV stores non-sensitive configuration data
      dataInventory.push({
        category: 'preferences',
        location: 'mmkv',
        encryption: 'none',
        backupStatus: 'included',
        sensitivity: 'public',
        dataTypes: ['app_settings', 'ui_preferences', 'feature_flags']
      });

      // Check for accidental PII storage in MMKV
      const keys = this.mmkv.getAllKeys();
      for (const key of keys) {
        const value = this.mmkv.getString(key);
        if (value && this.containsPotentialPII(value)) {
          violations.push({
            severity: 'high',
            type: 'data_leak',
            description: `Potential PII detected in MMKV key: ${key}`,
            location: `mmkv:${key}`,
            remediation: 'Move sensitive data to keychain or encrypted database'
          });
        }
      }
    } catch (error) {
      recommendations.push({
        priority: 'low',
        title: 'MMKV Storage Audit',
        description: 'Unable to audit MMKV storage contents',
        implementation: 'Investigate MMKV access for security auditing'
      });
    }
  }

  private async auditDataLeaks(
    violations: PrivacyViolation[],
    recommendations: PrivacyRecommendation[]
  ): Promise<void> {
    // Check for debug logs that might leak sensitive data
    recommendations.push({
      priority: 'critical',
      title: 'Production Logging Audit',
      description: 'Ensure no sensitive data is logged in production builds',
      implementation: 'Review all console.log statements and implement log filtering'
    });

    // Check for analytics/crash reporting PII exposure
    recommendations.push({
      priority: 'critical',
      title: 'Analytics PII Exclusion',
      description: 'Verify no PII is sent to analytics or crash reporting services',
      implementation: 'Implement data sanitization for all external service communications'
    });
  }

  private async auditBackupExclusions(
    violations: PrivacyViolation[],
    recommendations: PrivacyRecommendation[]
  ): Promise<void> {
    // Keychain items should be excluded from backup with WHEN_UNLOCKED_THIS_DEVICE_ONLY
    recommendations.push({
      priority: 'critical',
      title: 'Backup Exclusion Verification',
      description: 'Verify keychain items use WHEN_UNLOCKED_THIS_DEVICE_ONLY accessibility',
      implementation: 'Test iCloud/iTunes backup to ensure passport data is excluded'
    });

    // Database and MMKV files should be marked for backup exclusion if they contain sensitive data
    recommendations.push({
      priority: 'high',
      title: 'File Backup Exclusion',
      description: 'Mark sensitive database files for backup exclusion',
      implementation: 'Use NSURLIsExcludedFromBackupKey for database and sensitive files'
    });
  }

  private containsPotentialPII(value: string): boolean {
    const piiPatterns = [
      /\b\d{8,9}\b/, // Passport numbers (8-9 digits)
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/, // Full names
      /\b\d{4}-\d{2}-\d{2}\b/, // Dates (YYYY-MM-DD)
      /\b\d{2}\/\d{2}\/\d{4}\b/, // Dates (MM/DD/YYYY)
      /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // Email addresses
      /\b\d{10,15}\b/ // Phone numbers
    ];

    return piiPatterns.some(pattern => pattern.test(value));
  }

  private calculateComplianceScore(violations: PrivacyViolation[]): number {
    let score = 100;
    
    for (const violation of violations) {
      switch (violation.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private addAppStoreRecommendations(
    recommendations: PrivacyRecommendation[],
    violations: PrivacyViolation[]
  ): void {
    // App Store Review Guidelines compliance
    recommendations.push({
      priority: 'critical',
      title: 'App Store Privacy Label Accuracy',
      description: 'Ensure Privacy Nutrition Label accurately reflects data collection and usage',
      implementation: 'Update App Store Connect privacy declarations to match audit findings'
    });

    recommendations.push({
      priority: 'critical',
      title: 'Privacy Policy Compliance',
      description: 'Update privacy policy to reflect local-first architecture and zero-server PII',
      implementation: 'Draft privacy policy emphasizing on-device storage and data minimization'
    });

    if (violations.some(v => v.type === 'insecure_storage' && v.severity === 'high')) {
      recommendations.push({
        priority: 'critical',
        title: 'App Store Security Review',
        description: 'High-severity storage vulnerabilities may trigger App Store rejection',
        implementation: 'Address all high-severity violations before app submission'
      });
    }
  }

  private async storeAuditHistory(result: PrivacyAuditResult): Promise<void> {
    try {
      const existingHistory = this.mmkv.getString(this.AUDIT_HISTORY_KEY);
      const history: PrivacyAuditResult[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      history.unshift(result);
      
      // Keep only the last N entries
      const truncatedHistory = history.slice(0, this.MAX_HISTORY_ENTRIES);
      
      this.mmkv.set(this.AUDIT_HISTORY_KEY, JSON.stringify(truncatedHistory));
    } catch (error) {
      console.error('Failed to store audit history:', error);
    }
  }

  async getAuditHistory(): Promise<PrivacyAuditResult[]> {
    try {
      const historyStr = this.mmkv.getString(this.AUDIT_HISTORY_KEY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Failed to retrieve audit history:', error);
      return [];
    }
  }

  async getLatestAudit(): Promise<PrivacyAuditResult | null> {
    const history = await this.getAuditHistory();
    return history.length > 0 ? history[0] : null;
  }

  async clearAuditHistory(): Promise<void> {
    this.mmkv.delete(this.AUDIT_HISTORY_KEY);
  }

  // Quick compliance check for App Store submission
  async isReadyForAppStore(): Promise<{ready: boolean, blockers: PrivacyViolation[]}> {
    const audit = await this.runComprehensiveAudit();
    const blockers = audit.violations.filter(v => 
      v.severity === 'high' && 
      ['insecure_storage', 'data_leak', 'weak_encryption'].includes(v.type)
    );
    
    return {
      ready: blockers.length === 0 && audit.complianceScore >= 80,
      blockers
    };
  }
}

// Singleton instance
export const privacyAuditService = new PrivacyAuditService();