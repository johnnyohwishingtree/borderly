import { Linking, Alert } from 'react-native';
import { PortalIntegrationService } from '../../../src/services/portal/portalIntegration';
import { CountryFormSchema } from '../../../src/types/schema';

// Mock React Native dependencies
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

const mockLinking = jest.mocked(Linking);
const mockAlert = jest.mocked(Alert);

describe('PortalIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPortalInfo', () => {
    it('returns Japan portal info correctly', () => {
      const info = PortalIntegrationService.getPortalInfo('JPN');
      
      expect(info).toEqual({
        name: 'Visit Japan Web',
        url: 'https://vjw-lp.digital.go.jp/en/',
        countryCode: 'JPN',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: false,
          requiresManualEntry: true,
        },
        guidelines: expect.objectContaining({
          recommendedBrowser: expect.arrayContaining(['Safari', 'Chrome', 'Edge']),
          preparationTips: expect.any(Array),
          commonIssues: expect.any(Array),
        }),
      });
    });

    it('returns Malaysia portal info correctly', () => {
      const info = PortalIntegrationService.getPortalInfo('MYS');
      
      expect(info?.name).toBe('Malaysia Digital Arrival Card (MDAC)');
      expect(info?.countryCode).toBe('MYS');
      expect(info?.url).toBe('https://imigresen-online.imi.gov.my/mdac/main');
    });

    it('returns Singapore portal info correctly', () => {
      const info = PortalIntegrationService.getPortalInfo('SGP');
      
      expect(info?.name).toBe('SG Arrival Card');
      expect(info?.countryCode).toBe('SGP');
      expect(info?.url).toBe('https://eservices.ica.gov.sg/sgarrivalcard/');
    });

    it('returns null for unknown country codes', () => {
      const info = PortalIntegrationService.getPortalInfo('XXX');
      expect(info).toBeNull();
    });
  });

  describe('launchPortal', () => {
    const mockSchema: CountryFormSchema = {
      countryCode: 'JPN',
      countryName: 'Japan',
      schemaVersion: '1.0.0',
      lastUpdated: '2025-06-01T00:00:00Z',
      portalUrl: 'https://vjw-lp.digital.go.jp/en/',
      portalName: 'Visit Japan Web',
      metadata: {
        priority: 1,
        complexity: 'low',
        popularity: 80,
        lastVerified: '2025-06-01T00:00:00Z',
        supportedLanguages: ['en'],
        implementationStatus: 'complete',
        maintenanceFrequency: 'monthly',
      },
      changeDetection: {
        monitoredSelectors: ['form'],
        changeThreshold: 0.2,
        fallbackActions: [{ trigger: 'test', action: 'notify' }],
      },
      submission: {
        earliestBeforeArrival: '14d',
        latestBeforeArrival: '0h',
        recommended: '72h',
      },
      portalFlow: {
        requiresAccount: false,
        multiStep: false,
        canSaveProgress: false,
      },
      sections: [],
      submissionGuide: [],
    };

    it('successfully launches portal when URL is valid', async () => {
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue(undefined);

      const result = await PortalIntegrationService.launchPortal(mockSchema);

      expect(result.success).toBe(true);
      expect(mockLinking.canOpenURL).toHaveBeenCalledWith('https://vjw-lp.digital.go.jp/en/');
      expect(mockLinking.openURL).toHaveBeenCalledWith('https://vjw-lp.digital.go.jp/en/');
    });

    it('fails when URL cannot be opened', async () => {
      mockLinking.canOpenURL.mockResolvedValue(false);

      const result = await PortalIntegrationService.launchPortal(mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot open Visit Japan Web');
    });

    it('fails when portal URL is invalid', async () => {
      const invalidSchema = { ...mockSchema, portalUrl: 'not-a-url' };

      const result = await PortalIntegrationService.launchPortal(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid portal URL');
    });

    it('fails when portal URL is missing', async () => {
      const invalidSchema = { ...mockSchema, portalUrl: '' };

      const result = await PortalIntegrationService.launchPortal(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid portal URL');
    });

    it('adds tracking parameters when provided', async () => {
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue(undefined);

      const trackingParams = { source: 'app', campaign: 'test' };
      await PortalIntegrationService.launchPortal(mockSchema, { trackingParams });

      expect(mockLinking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('source=app')
      );
      expect(mockLinking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('campaign=test')
      );
    });

    it('handles network errors gracefully', async () => {
      mockLinking.canOpenURL.mockRejectedValue(new Error('Network error'));

      const result = await PortalIntegrationService.launchPortal(mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('handles timeout errors', async () => {
      // Mock a delayed response that exceeds timeout
      mockLinking.canOpenURL.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 15000))
      );

      const result = await PortalIntegrationService.launchPortal(mockSchema);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    }, 20000);
  });

  describe('checkPortalAccessibility', () => {
    it('returns true for internet connectivity when successful', async () => {
      mockLinking.canOpenURL.mockResolvedValue(true);

      const result = await PortalIntegrationService.checkPortalAccessibility();

      expect(result.hasInternetConnection).toBe(true);
      expect(result.canAccessHttps).toBe(true);
      expect(result.recommendedAction).toBeUndefined();
    });

    it('returns false and recommendation when connectivity fails', async () => {
      mockLinking.canOpenURL.mockResolvedValue(false);

      const result = await PortalIntegrationService.checkPortalAccessibility();

      expect(result.hasInternetConnection).toBe(false);
      expect(result.canAccessHttps).toBe(false);
      expect(result.recommendedAction).toBe('Please check your internet connection and try again.');
    });

    it('handles errors gracefully', async () => {
      mockLinking.canOpenURL.mockRejectedValue(new Error('Network error'));

      const result = await PortalIntegrationService.checkPortalAccessibility();

      expect(result.hasInternetConnection).toBe(false);
      expect(result.canAccessHttps).toBe(false);
      expect(result.recommendedAction).toBe('Please check your internet connection and try again.');
    });
  });

  describe('getSubmissionGuidance', () => {
    it('returns guidance for known countries', () => {
      const guidance = PortalIntegrationService.getSubmissionGuidance('JPN');

      expect(guidance.beforeSubmission).toEqual(expect.arrayContaining([
        'Ensure stable internet connection',
        'Have all required documents ready',
        'Use a recommended browser',
        'Allow sufficient time for completion',
      ]));

      expect(guidance.duringSubmission).toEqual(expect.arrayContaining([
        'Fill out forms completely and accurately',
        'Double-check all information before submitting',
        'Save confirmation numbers/emails',
        'Screenshot QR codes immediately',
      ]));

      expect(guidance.afterSubmission).toEqual(expect.arrayContaining([
        'Save QR codes to your phone',
        'Print confirmation if required',
        'Keep confirmation accessible while traveling',
        'Check email for additional instructions',
      ]));

      expect(guidance.troubleshooting).toEqual(expect.arrayContaining([
        'Try refreshing the page if it becomes unresponsive',
        'Clear browser cache if experiencing issues',
        'Try a different browser if problems persist',
        'Contact official support if submission fails',
      ]));
    });

    it('includes country-specific tips when available', () => {
      const guidance = PortalIntegrationService.getSubmissionGuidance('JPN');

      expect(guidance.beforeSubmission).toEqual(expect.arrayContaining([
        'Have your passport ready for scanning',
        'Prepare accommodation booking details',
        'Know your flight number and airline',
        'Have your planned departure date',
      ]));
    });

    it('returns base guidance for unknown countries', () => {
      const guidance = PortalIntegrationService.getSubmissionGuidance('XXX');

      expect(guidance.beforeSubmission).toEqual(expect.arrayContaining([
        'Ensure stable internet connection',
        'Have all required documents ready',
        'Use a recommended browser',
        'Allow sufficient time for completion',
      ]));
    });
  });

  describe('showPortalLaunchAlert', () => {
    it('shows success alert for successful portal launch', () => {
      const result = { success: true };
      
      PortalIntegrationService.showPortalLaunchAlert(result, 'Test Portal');

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Opening Portal',
        expect.stringContaining('Test Portal is opening in your browser'),
        [{ text: 'OK', style: 'default' }]
      );
    });

    it('shows error alert for failed portal launch', () => {
      const result = { success: false, error: 'Network error' };
      
      PortalIntegrationService.showPortalLaunchAlert(result, 'Test Portal');

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Portal Error',
        'Network error',
        expect.arrayContaining([
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', style: 'default', onPress: expect.any(Function) },
        ])
      );
    });

    it('shows default error message when no specific error provided', () => {
      const result = { success: false };
      
      PortalIntegrationService.showPortalLaunchAlert(result, 'Test Portal');

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Portal Error',
        'Failed to open Test Portal',
        expect.any(Array)
      );
    });
  });

  describe('getTimeEstimates', () => {
    it('returns estimates for Japan', () => {
      const estimates = PortalIntegrationService.getTimeEstimates('JPN');

      expect(estimates).toEqual({
        preparationMinutes: 5,
        submissionMinutes: 15,
        totalMinutes: 20,
        factors: ['Account creation if first time', 'Passport scanning', 'QR code generation'],
      });
    });

    it('returns estimates for Malaysia', () => {
      const estimates = PortalIntegrationService.getTimeEstimates('MYS');

      expect(estimates.preparationMinutes).toBe(3);
      expect(estimates.submissionMinutes).toBe(10);
      expect(estimates.totalMinutes).toBe(13);
    });

    it('returns estimates for Singapore', () => {
      const estimates = PortalIntegrationService.getTimeEstimates('SGP');

      expect(estimates.preparationMinutes).toBe(2);
      expect(estimates.submissionMinutes).toBe(8);
      expect(estimates.totalMinutes).toBe(10);
    });

    it('returns default estimates for unknown countries', () => {
      const estimates = PortalIntegrationService.getTimeEstimates('XXX');

      expect(estimates.preparationMinutes).toBe(5);
      expect(estimates.submissionMinutes).toBe(12);
      expect(estimates.totalMinutes).toBe(17);
      expect(estimates.factors).toEqual(['Standard government form processing']);
    });
  });
});