import { bugReporter } from '@/services/support/bugReporter';
import { mmkvService } from '@/services/storage';

// Mock MMKV service
jest.mock('@/services/storage', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
  },
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

// Mock stores
jest.mock('@/stores/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({
      preferences: {
        language: 'en',
        theme: 'auto',
        biometricEnabled: true,
        analyticsEnabled: true,
      },
      isBiometricAvailable: true,
    })),
  },
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: {
    getState: jest.fn(() => ({
      profile: { id: 'test-profile' },
    })),
  },
}));

jest.mock('@/stores/useTripStore', () => ({
  useTripStore: {
    getState: jest.fn(() => ({
      trips: [{ id: 'trip-1' }, { id: 'trip-2' }],
    })),
  },
}));

describe('BugReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mmkvService.getString as jest.Mock).mockReturnValue(null);
  });

  describe('submitBugReport', () => {
    it('should successfully submit valid bug report', async () => {
      const bugReportData = {
        title: 'App crashes on startup',
        description: 'The app crashes when I try to open it after the latest update.',
        severity: 'high' as const,
        category: 'general' as const,
        stepsToReproduce: '1. Open app\n2. Wait for splash screen\n3. App crashes',
      };

      const result = await bugReporter.submitBugReport(bugReportData, true);

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(mmkvService.setString).toHaveBeenCalled();
    });

    it('should include diagnostic info when requested', async () => {
      const bugReportData = {
        title: 'Test bug',
        description: 'Test description',
        severity: 'low' as const,
        category: 'general' as const,
      };

      // Mock error logs
      (mmkvService.getString as jest.Mock)
        .mockReturnValueOnce(null) // For bug reports
        .mockReturnValueOnce(JSON.stringify([
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            message: 'Test error',
            stack: 'Error stack trace',
          },
        ])); // For error logs

      const result = await bugReporter.submitBugReport(bugReportData, true);

      expect(result.success).toBe(true);
      
      // Verify that setString was called with diagnostic info
      const setStringCalls = (mmkvService.setString as jest.Mock).mock.calls;
      const storedData = JSON.parse(setStringCalls[0][1]);
      const lastReport = storedData[storedData.length - 1];
      
      expect(lastReport.diagnostics).toBeDefined();
      expect(lastReport.diagnostics.platform).toBe('ios');
      expect(lastReport.diagnostics.deviceInfo.hasProfile).toBe(true);
      expect(lastReport.diagnostics.deviceInfo.tripsCount).toBe(2);
    });

    it('should reject bug report with empty title', async () => {
      const bugReportData = {
        title: '', // Empty title
        description: 'Test description',
        severity: 'medium' as const,
        category: 'general' as const,
      };

      const result = await bugReporter.submitBugReport(bugReportData, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bug report data');
    });

    it('should reject bug report with invalid severity', async () => {
      const bugReportData = {
        title: 'Test bug',
        description: 'Test description',
        severity: 'invalid' as any, // Invalid severity
        category: 'general' as const,
      };

      const result = await bugReporter.submitBugReport(bugReportData, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bug report data');
    });
  });

  describe('logError', () => {
    it('should log errors with context', async () => {
      const error = new Error('Test error');
      const context = 'test-context';

      await bugReporter.logError(error, context);

      expect(mmkvService.setString).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Test error')
      );
    });

    it('should handle logging errors gracefully', async () => {
      (mmkvService.setString as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const error = new Error('Test error');

      // Should not throw
      await expect(bugReporter.logError(error)).resolves.toBeUndefined();
    });
  });

  describe('getBugReportStats', () => {
    it('should calculate correct statistics', async () => {
      const now = new Date('2024-01-01T12:00:00.000Z');
      // Mock Date.now to return our fixed date for recentReportsCount calculation
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
      const storedReports = [
        {
          id: 'bug-1',
          severity: 'high',
          category: 'general',
          timestamp: now.toISOString(),
        },
        {
          id: 'bug-2',
          severity: 'critical',
          category: 'passport-scan',
          timestamp: new Date(now.getTime() - 1000 * 60).toISOString(), // 1 minute ago
        },
        {
          id: 'bug-3',
          severity: 'low',
          category: 'general',
          timestamp: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
        },
      ];

      (mmkvService.getString as jest.Mock).mockReturnValue(JSON.stringify(storedReports));

      const stats = await bugReporter.getBugReportStats();

      expect(stats.totalCount).toBe(3);
      expect(stats.severityDistribution.high).toBe(1);
      expect(stats.severityDistribution.critical).toBe(1);
      expect(stats.severityDistribution.low).toBe(1);
      expect(stats.categoryDistribution.general).toBe(2);
      expect(stats.categoryDistribution['passport-scan']).toBe(1);
      expect(stats.recentReportsCount).toBe(2); // Only 2 within last 30 days
      expect(stats.criticalReportsCount).toBe(1);
      
      // Cleanup the Date mock
      jest.restoreAllMocks();
    });
  });
});