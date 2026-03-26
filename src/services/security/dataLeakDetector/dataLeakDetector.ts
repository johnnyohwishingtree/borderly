/**
 * Data Leak Detector Service
 *
 * Orchestrates comprehensive PII leak detection across all storage layers.
 * Delegates pattern matching, scanning, and reporting to focused modules.
 */

import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '@/services/storage/database';
import type {
  DataLeakDetectionResult,
  DataLeak,
} from './dataLeakDetectorTypes';
import { scanStringForLeaks } from './piiPatterns';
import { calculateRiskLevel, generateRecommendations } from './reporting';

export type {
  DataLeakDetectionResult,
  DataLeak,
  DataLeakRecommendation,
} from './dataLeakDetectorTypes';

class DataLeakDetectorService {
  private readonly auditMmkv = new MMKV({ id: 'borderly_leak_detection' });
  private readonly SCAN_HISTORY_KEY = 'leak_scan_history';
  private readonly MAX_SCAN_HISTORY = 25;

  async runComprehensiveLeakDetection(): Promise<DataLeakDetectionResult> {
    const scanDate = new Date();
    const leaks: DataLeak[] = [];

    await this.scanMMKVStorage(leaks);
    await this.scanAsyncStorage(leaks);
    await this.scanDatabaseForLeaks(leaks);

    const riskLevel = calculateRiskLevel(leaks);
    const recommendations = generateRecommendations(leaks);

    const result: DataLeakDetectionResult = {
      leaksDetected: leaks.length > 0,
      leakCount: leaks.length,
      leaks,
      riskLevel,
      recommendations,
      lastScanDate: scanDate,
    };

    await this.storeScanHistory(result);
    return result;
  }

  private async scanMMKVStorage(leaks: DataLeak[]): Promise<void> {
    try {
      const mmkv = new MMKV();
      const keys = mmkv.getAllKeys();

      for (const key of keys) {
        const value = mmkv.getString(key);
        if (value) {
          scanStringForLeaks(value, `mmkv:${key}`, leaks);
        }
      }

      const mmkvInstances = [
        { id: 'borderly_app_config', name: 'app_config' },
        { id: 'borderly_audit', name: 'audit' },
        { id: 'borderly_leak_detection', name: 'leak_detection' },
      ];

      for (const instance of mmkvInstances) {
        try {
          const instanceMmkv = new MMKV({ id: instance.id });
          const instanceKeys = instanceMmkv.getAllKeys();

          for (const key of instanceKeys) {
            const value = instanceMmkv.getString(key);
            if (value) {
              scanStringForLeaks(value, `mmkv:${instance.name}:${key}`, leaks);
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
          scanStringForLeaks(value, `asyncstorage:${key}`, leaks);
        }
      }
    } catch (error) {
      console.warn('Failed to scan AsyncStorage for leaks:', error);
    }
  }

  private async scanDatabaseForLeaks(leaks: DataLeak[]): Promise<void> {
    try {
      await databaseService.getDatabase();

      const trips = await databaseService.getTrips();
      for (const trip of trips) {
        const tripData = JSON.stringify(trip);
        scanStringForLeaks(tripData, `database:trip:${trip.id}`, leaks);
      }

      const qrCodes = await databaseService.getQRCodes();
      for (const qrCode of qrCodes) {
        const qrData = JSON.stringify(qrCode);
        scanStringForLeaks(qrData, `database:qr:${qrCode.id}`, leaks);
      }
    } catch (error) {
      console.warn('Failed to scan database for leaks:', error);
    }
  }

  private async storeScanHistory(result: DataLeakDetectionResult): Promise<void> {
    try {
      const historyStr = this.auditMmkv.getString(this.SCAN_HISTORY_KEY);
      const history: DataLeakDetectionResult[] = historyStr ? JSON.parse(historyStr) : [];

      const minimalResult: Partial<DataLeakDetectionResult> & { leakTypes: string[] } = {
        leaksDetected: result.leaksDetected,
        leakCount: result.leakCount,
        riskLevel: result.riskLevel,
        lastScanDate: result.lastScanDate,
        leakTypes: [...new Set(result.leaks.map(l => l.type))],
      };

      history.unshift(minimalResult as DataLeakDetectionResult);
      const truncatedHistory = history.slice(0, this.MAX_SCAN_HISTORY);

      this.auditMmkv.set(this.SCAN_HISTORY_KEY, JSON.stringify(truncatedHistory));
    } catch (error) {
      console.error('Failed to store leak scan history:', error);
    }
  }

  async getLastScan(): Promise<DataLeakDetectionResult | null> {
    return null;
  }

  async getScanHistory(): Promise<DataLeakDetectionResult[]> {
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

  async quickAppStoreScan(): Promise<{
    ready: boolean;
    criticalIssues: DataLeak[];
    summary: string;
  }> {
    const result = await this.runComprehensiveLeakDetection();
    const criticalIssues = result.leaks.filter(
      l => l.severity === 'critical' || l.type === 'passport' || l.type === 'financial',
    );

    const ready = criticalIssues.length === 0 && result.riskLevel !== 'critical';
    const summary = ready
      ? 'No critical data leaks detected. Ready for App Store submission.'
      : `${criticalIssues.length} critical issues found. Review required before submission.`;

    return { ready, criticalIssues, summary };
  }
}

export const dataLeakDetector = new DataLeakDetectorService();
