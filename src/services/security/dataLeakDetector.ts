import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '@/services/storage/database';

export interface DataLeakDetectionResult {
  leaksDetected: boolean;
  leakCount: number;
  leaks: DataLeak[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendations: DataLeakRecommendation[];
  lastScanDate: Date;
}

export interface DataLeak {
  id: string;
  type: 'pii' | 'passport' | 'financial' | 'location' | 'biometric' | 'government_id';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  detectedValue: string; // Redacted for logging
  fullMatch: boolean;
  confidence: number; // 0-1
  remediation: string;
}

export interface DataLeakRecommendation {
  priority: 'immediate' | 'urgent' | 'standard' | 'advisory';
  title: string;
  description: string;
  actions: string[];
  impact: string;
}

class DataLeakDetectorService {
  private readonly auditMmkv = new MMKV({ id: 'borderly_leak_detection' });
  private readonly SCAN_HISTORY_KEY = 'leak_scan_history';
  private readonly MAX_SCAN_HISTORY = 25;

  // PII Detection Patterns
  private readonly PII_PATTERNS = {
    passportNumber: {
      pattern: /\b[A-Z0-9]{6,9}\b/g,
      type: 'passport' as const,
      severity: 'critical' as const,
      description: 'Passport number detected'
    },
    fullName: {
      pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
      type: 'pii' as const,
      severity: 'high' as const,
      description: 'Full name detected'
    },
    dateOfBirth: {
      pattern: /\b(?:\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/g,
      type: 'pii' as const,
      severity: 'medium' as const,
      description: 'Date of birth detected'
    },
    emailAddress: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      type: 'pii' as const,
      severity: 'medium' as const,
      description: 'Email address detected'
    },
    phoneNumber: {
      pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      type: 'pii' as const,
      severity: 'medium' as const,
      description: 'Phone number detected'
    },
    creditCard: {
      pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      type: 'financial' as const,
      severity: 'critical' as const,
      description: 'Credit card number detected'
    },
    governmentId: {
      pattern: /\b(?:SSN|Social Security Number|Tax ID|National ID)[\s:]*[0-9-]+\b/gi,
      type: 'government_id' as const,
      severity: 'critical' as const,
      description: 'Government ID number detected'
    },
    address: {
      pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g,
      type: 'pii' as const,
      severity: 'medium' as const,
      description: 'Physical address detected'
    },
    coordinates: {
      pattern: /\b[-]?(?:180|1[0-7]\d|\d{1,2})\.?\d*[,\s]+[-]?(?:90|[1-8]\d|\d)\.?\d*\b/g,
      type: 'location' as const,
      severity: 'high' as const,
      description: 'GPS coordinates detected'
    }
  };

  async runComprehensiveLeakDetection(): Promise<DataLeakDetectionResult> {
    const scanDate = new Date();
    const leaks: DataLeak[] = [];

    // Scan MMKV storage for PII leaks
    await this.scanMMKVStorage(leaks);

    // Scan AsyncStorage for PII leaks
    await this.scanAsyncStorage(leaks);

    // Scan database for improperly stored sensitive data
    await this.scanDatabaseForLeaks(leaks);

    // Scan clipboard for lingering sensitive data
    await this.scanClipboardLeaks(leaks);

    // Check for data in device logs (if accessible)
    await this.scanLogsForLeaks(leaks);

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(leaks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(leaks);

    const result: DataLeakDetectionResult = {
      leaksDetected: leaks.length > 0,
      leakCount: leaks.length,
      leaks,
      riskLevel,
      recommendations,
      lastScanDate: scanDate
    };

    // Store scan history
    await this.storeScanHistory(result);

    return result;
  }

  private async scanMMKVStorage(leaks: DataLeak[]): Promise<void> {
    try {
      // Scan main MMKV instance
      const mmkv = new MMKV();
      const keys = mmkv.getAllKeys();

      for (const key of keys) {
        const value = mmkv.getString(key);
        if (value) {
          await this.scanStringForLeaks(value, `mmkv:${key}`, leaks);
        }
      }

      // Scan specific MMKV instances we know about
      const mmkvInstances = [
        { id: 'borderly_app_config', name: 'app_config' },
        { id: 'borderly_audit', name: 'audit' },
        { id: 'borderly_leak_detection', name: 'leak_detection' }
      ];

      for (const instance of mmkvInstances) {
        try {
          const instanceMmkv = new MMKV({ id: instance.id });
          const instanceKeys = instanceMmkv.getAllKeys();
          
          for (const key of instanceKeys) {
            const value = instanceMmkv.getString(key);
            if (value) {
              await this.scanStringForLeaks(value, `mmkv:${instance.name}:${key}`, leaks);
            }
          }
        } catch {
          // Instance may not exist, skip silently
        }
      }
    } catch (error) {
      console.warn('Failed to scan MMKV storage for leaks:', error);
    }
  }

  private async scanAsyncStorage(leaks: DataLeak[]): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          await this.scanStringForLeaks(value, `asyncstorage:${key}`, leaks);
        }
      }
    } catch (error) {
      console.warn('Failed to scan AsyncStorage for leaks:', error);
    }
  }

  private async scanDatabaseForLeaks(leaks: DataLeak[]): Promise<void> {
    try {
      await databaseService.getDatabase();
      
      // Check trips for PII that should be in keychain
      const trips = await databaseService.getTrips();
      for (const trip of trips) {
        const tripData = JSON.stringify(trip);
        await this.scanStringForLeaks(tripData, `database:trip:${trip.id}`, leaks);
      }

      // Check QR codes for embedded PII
      const qrCodes = await databaseService.getQRCodes();
      for (const qrCode of qrCodes) {
        const qrData = JSON.stringify(qrCode);
        await this.scanStringForLeaks(qrData, `database:qr:${qrCode.id}`, leaks);
      }

    } catch (error) {
      console.warn('Failed to scan database for leaks:', error);
    }
  }

  private async scanClipboardLeaks(_leaks: DataLeak[]): Promise<void> {
    // Note: Reading clipboard requires user interaction on iOS 14+
    // This is a placeholder for when clipboard access is available
    try {
      // In production, this would check if sensitive data is still in clipboard
      // For now, we add a recommendation to clear clipboard periodically
    } catch (error) {
      console.warn('Failed to scan clipboard for leaks:', error);
    }
  }

  private async scanLogsForLeaks(_leaks: DataLeak[]): Promise<void> {
    // Note: In production, this would scan accessible log files
    // React Native apps typically can't access system logs
    // This is more relevant for debugging scenarios
  }

  private async scanStringForLeaks(content: string, location: string, leaks: DataLeak[]): Promise<void> {
    for (const [patternName, pattern] of Object.entries(this.PII_PATTERNS)) {
      const matches = content.match(pattern.pattern);
      
      if (matches) {
        for (const match of matches) {
          // Skip obvious false positives
          if (this.isFalsePositive(match, patternName)) {
            continue;
          }

          const confidence = this.calculateConfidence(match, patternName);
          
          if (confidence >= 0.7) { // Only report high-confidence matches
            const leak: DataLeak = {
              id: `${location}:${patternName}:${Date.now()}:${Math.random()}`,
              type: pattern.type,
              severity: pattern.severity,
              location,
              description: `${pattern.description} found in ${location}`,
              detectedValue: this.redactValue(match),
              fullMatch: true,
              confidence,
              remediation: this.getRemediationForPattern(patternName, location)
            };

            leaks.push(leak);
          }
        }
      }
    }
  }

  private isFalsePositive(match: string, patternName: string): boolean {
    const falsePositives: Record<string, string[]> = {
      fullName: [
        'John Doe', 'Jane Smith', 'Test User', 'Demo User',
        'React Native', 'App Store', 'Google Play'
      ],
      passportNumber: [
        'ABCD1234', '123456789', '000000000'
      ],
      dateOfBirth: [
        '1900-01-01', '2000-01-01', '1970-01-01'
      ],
      phoneNumber: [
        '555-555-5555', '123-456-7890', '000-000-0000'
      ]
    };

    const patterns = falsePositives[patternName] || [];
    return patterns.some((fp: string) => match.toLowerCase().includes(fp.toLowerCase()));
  }

  private calculateConfidence(match: string, patternName: string): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on pattern type
    if (patternName === 'passportNumber') {
      // Higher confidence for passport-like patterns
      if (/^[A-Z]{1,2}[0-9]{6,8}$/.test(match)) confidence = 0.95;
      if (/^[0-9]{8,9}$/.test(match)) confidence = 0.85;
    } else if (patternName === 'fullName') {
      // Lower confidence for names (common false positives)
      confidence = 0.7;
      if (match.includes('Test') || match.includes('Demo')) confidence = 0.3;
    } else if (patternName === 'creditCard') {
      // Higher confidence for valid Luhn algorithm
      confidence = this.passesLuhnCheck(match) ? 0.95 : 0.6;
    }

    return confidence;
  }

  private passesLuhnCheck(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let alternate = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits.charAt(i));
      
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      
      sum += n;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  }

  private redactValue(value: string): string {
    if (value.length <= 4) return '***';
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  private getRemediationForPattern(patternName: string, location: string): string {
    const remediations: Record<string, string> = {
      passportNumber: 'Move to keychain with biometric protection',
      fullName: 'Store in keychain or remove if unnecessary',
      dateOfBirth: 'Store in keychain or anonymize',
      emailAddress: 'Remove if not needed for functionality',
      phoneNumber: 'Remove if not needed for functionality',
      creditCard: 'Never store credit card numbers in app',
      governmentId: 'Move to keychain with maximum security',
      address: 'Store in encrypted database or remove',
      coordinates: 'Anonymize or store with reduced precision'
    };

    const base = remediations[patternName] || 'Review and secure sensitive data';
    
    if (location.startsWith('mmkv:')) {
      return `${base}. MMKV should only store non-sensitive configuration data.`;
    } else if (location.startsWith('asyncstorage:')) {
      return `${base}. AsyncStorage is not encrypted and should never contain PII.`;
    } else if (location.startsWith('database:')) {
      return `${base}. Ensure database encryption is properly configured.`;
    }
    
    return base;
  }

  private calculateRiskLevel(leaks: DataLeak[]): 'critical' | 'high' | 'medium' | 'low' {
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

  private generateRecommendations(leaks: DataLeak[]): DataLeakRecommendation[] {
    const recommendations: DataLeakRecommendation[] = [];

    // Critical recommendations based on leak types
    const passportLeaks = leaks.filter(l => l.type === 'passport');
    if (passportLeaks.length > 0) {
      recommendations.push({
        priority: 'immediate',
        title: 'Passport Data Security Violation',
        description: 'Passport information found outside secure keychain storage',
        actions: [
          'Move all passport data to keychain with biometric protection',
          'Clear passport data from insecure storage locations',
          'Audit app code to prevent future passport data leaks'
        ],
        impact: 'App Store rejection risk, severe privacy violation'
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
          'Use secure payment processing services instead of storing card data'
        ],
        impact: 'Legal compliance risk, potential fraud liability'
      });
    }

    // General recommendations
    if (leaks.length > 0) {
      recommendations.push({
        priority: 'urgent',
        title: 'Data Minimization Implementation',
        description: 'Reduce PII collection and storage to only what is necessary',
        actions: [
          'Audit all data collection points',
          'Implement data retention policies',
          'Use data masking for non-essential PII display'
        ],
        impact: 'Improved privacy compliance, reduced attack surface'
      });

      recommendations.push({
        priority: 'standard',
        title: 'Regular Security Audits',
        description: 'Implement automated data leak detection in CI/CD pipeline',
        actions: [
          'Add data leak scanning to automated tests',
          'Schedule monthly security audits',
          'Implement monitoring for new PII patterns'
        ],
        impact: 'Proactive security posture, early leak detection'
      });
    }

    // AsyncStorage specific recommendations
    const asyncStorageLeaks = leaks.filter(l => l.location.startsWith('asyncstorage:'));
    if (asyncStorageLeaks.length > 0) {
      recommendations.push({
        priority: 'urgent',
        title: 'AsyncStorage Security Risk',
        description: 'Sensitive data found in unencrypted AsyncStorage',
        actions: [
          'Migrate sensitive data to keychain or encrypted database',
          'Clear AsyncStorage of all PII',
          'Implement AsyncStorage usage guidelines for team'
        ],
        impact: 'Prevents data exposure through device backups and forensics'
      });
    }

    return recommendations;
  }

  private async storeScanHistory(result: DataLeakDetectionResult): Promise<void> {
    try {
      const historyStr = this.auditMmkv.getString(this.SCAN_HISTORY_KEY);
      const history: DataLeakDetectionResult[] = historyStr ? JSON.parse(historyStr) : [];
      
      // Store minimal history (without full leak details to save space)
      const minimalResult: Partial<DataLeakDetectionResult> & { leakTypes: string[] } = {
        leaksDetected: result.leaksDetected,
        leakCount: result.leakCount,
        riskLevel: result.riskLevel,
        lastScanDate: result.lastScanDate,
        leakTypes: [...new Set(result.leaks.map(l => l.type))]
      };

      history.unshift(minimalResult as DataLeakDetectionResult);
      const truncatedHistory = history.slice(0, this.MAX_SCAN_HISTORY);
      
      this.auditMmkv.set(this.SCAN_HISTORY_KEY, JSON.stringify(truncatedHistory));
    } catch (error) {
      console.error('Failed to store leak scan history:', error);
    }
  }

  async getLastScan(): Promise<DataLeakDetectionResult | null> {
    // For now, always run a fresh scan since we don't store full results
    return null;
  }

  async getScanHistory(): Promise<any[]> {
    try {
      const historyStr = this.auditMmkv.getString(this.SCAN_HISTORY_KEY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Failed to retrieve scan history:', error);
      return [];
    }
  }

  async clearScanHistory(): Promise<void> {
    this.auditMmkv.delete(this.SCAN_HISTORY_KEY);
  }

  // Quick scan for App Store submission readiness
  async quickAppStoreScan(): Promise<{
    ready: boolean;
    criticalIssues: DataLeak[];
    summary: string;
  }> {
    const result = await this.runComprehensiveLeakDetection();
    const criticalIssues = result.leaks.filter(l => 
      l.severity === 'critical' || 
      (l.type === 'passport' || l.type === 'financial')
    );

    const ready = criticalIssues.length === 0 && result.riskLevel !== 'critical';
    const summary = ready 
      ? 'No critical data leaks detected. Ready for App Store submission.'
      : `${criticalIssues.length} critical issues found. Review required before submission.`;

    return {
      ready,
      criticalIssues,
      summary
    };
  }
}

// Singleton instance
export const dataLeakDetector = new DataLeakDetectorService();