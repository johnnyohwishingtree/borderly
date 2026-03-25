import { Linking, Alert } from 'react-native';
import { CountryFormSchema } from '../../types/schema';
import type { PortalInfo, PortalLaunchOptions } from './portalIntegrationTypes';
import { portalMap, portalTimeEstimates } from './portalData';

/**
 * Portal Integration Service
 *
 * Handles deep-linking and integration with government portals.
 * Currently supports basic web portal launching with future extensibility
 * for more advanced integration features.
 */
export class PortalIntegrationService {
  private static readonly PORTAL_TIMEOUT = 10000; // 10 seconds

  /**
   * Gets portal information for a specific country
   */
  static getPortalInfo(countryCode: string): PortalInfo | null {
    return portalMap[countryCode] || null;
  }

  /**
   * Launches a government portal in the user's default browser
   */
  static async launchPortal(
    schema: CountryFormSchema,
    options: PortalLaunchOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { portalUrl, portalName, countryCode } = schema;

      // Validate portal URL
      if (!portalUrl || !this.isValidUrl(portalUrl)) {
        return {
          success: false,
          error: `Invalid portal URL for ${portalName}`,
        };
      }

      // Add tracking parameters if provided
      let finalUrl = portalUrl;
      if (options.trackingParams) {
        finalUrl = this.addTrackingParams(portalUrl, options.trackingParams);
      }

      // Check if the URL can be opened
      let timeoutId: ReturnType<typeof setTimeout>;
      const canOpen = await Promise.race([
        Linking.canOpenURL(finalUrl),
        new Promise<boolean>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), this.PORTAL_TIMEOUT);
        }),
      ]).finally(() => clearTimeout(timeoutId));

      if (!canOpen) {
        return {
          success: false,
          error: `Cannot open ${portalName}. Please check your internet connection.`,
        };
      }

      // Open the portal
      await Linking.openURL(finalUrl);

      // Log portal launch for analytics (without PII)
      this.logPortalLaunch(countryCode, {
        success: true,
        hasTrackingParams: !!options.trackingParams,
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log error (without PII)
      this.logPortalLaunch(schema.countryCode, {
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to open ${schema.portalName}: ${errorMessage}`,
      };
    }
  }

  /**
   * Checks if the user's device can access government portals
   */
  static async checkPortalAccessibility(): Promise<{
    hasInternetConnection: boolean;
    canAccessHttps: boolean;
    recommendedAction?: string;
  }> {
    try {
      // Test basic HTTPS connectivity with a reliable endpoint
      const testUrl = 'https://www.google.com';
      const canAccessHttps = await Linking.canOpenURL(testUrl);

      return {
        hasInternetConnection: canAccessHttps,
        canAccessHttps,
        ...(canAccessHttps
          ? {}
          : { recommendedAction: 'Please check your internet connection and try again.' }),
      };
    } catch {
      return {
        hasInternetConnection: false,
        canAccessHttps: false,
        recommendedAction: 'Please check your internet connection and try again.',
      };
    }
  }

  /**
   * Provides guidance for manual portal submission
   */
  static getSubmissionGuidance(countryCode: string): {
    beforeSubmission: string[];
    duringSubmission: string[];
    afterSubmission: string[];
    troubleshooting: string[];
  } {
    const portalInfo = this.getPortalInfo(countryCode);

    const baseGuidance = {
      beforeSubmission: [
        'Ensure stable internet connection',
        'Have all required documents ready',
        'Use a recommended browser',
        'Allow sufficient time for completion',
      ],
      duringSubmission: [
        'Fill out forms completely and accurately',
        'Double-check all information before submitting',
        'Save confirmation numbers/emails',
        'Screenshot QR codes immediately',
      ],
      afterSubmission: [
        'Save QR codes to your phone',
        'Print confirmation if required',
        'Keep confirmation accessible while traveling',
        'Check email for additional instructions',
      ],
      troubleshooting: [
        'Try refreshing the page if it becomes unresponsive',
        'Clear browser cache if experiencing issues',
        'Try a different browser if problems persist',
        'Contact official support if submission fails',
      ],
    };

    // Add country-specific guidance if available
    if (portalInfo) {
      baseGuidance.beforeSubmission.push(...portalInfo.guidelines.preparationTips);
      baseGuidance.troubleshooting.push(
        ...portalInfo.guidelines.commonIssues.map(issue => `Note: ${issue}`)
      );
    }

    return baseGuidance;
  }

  /**
   * Validates that a URL is properly formatted and secure
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && urlObj.hostname.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Adds tracking parameters to a URL for analytics
   */
  private static addTrackingParams(
    url: string,
    params: Record<string, string>
  ): string {
    try {
      const urlObj = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
      return urlObj.toString();
    } catch {
      return url; // Return original URL if parsing fails
    }
  }

  /**
   * Logs portal launch events for analytics (without PII)
   */
  private static logPortalLaunch(
    countryCode: string,
    event: {
      success: boolean;
      error?: string;
      hasTrackingParams?: boolean;
    }
  ): void {
    // TODO: Implement analytics logging here
    // This would integrate with a privacy-compliant analytics service
    // that doesn't capture any personally identifiable information

    if (__DEV__) {
      console.log('[PortalIntegration]', {
        countryCode,
        ...event,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Shows a user-friendly alert with portal launch results
   */
  static showPortalLaunchAlert(
    result: { success: boolean; error?: string },
    portalName: string
  ): void {
    if (result.success) {
      Alert.alert(
        'Opening Portal',
        `${portalName} is opening in your browser. Please complete the submission and return to this app to save your QR code.`,
        [{ text: 'OK', style: 'default' }]
      );
    } else {
      Alert.alert(
        'Portal Error',
        result.error || `Failed to open ${portalName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Try Again',
            style: 'default',
            onPress: () => {
              // Could retry the portal launch here
            }
          }
        ]
      );
    }
  }

  /**
   * Gets estimated time requirements for portal submission
   */
  static getTimeEstimates(countryCode: string): {
    preparationMinutes: number;
    submissionMinutes: number;
    totalMinutes: number;
    factors: string[];
  } {
    const countryEstimate = portalTimeEstimates[countryCode] || {
      preparationMinutes: 5,
      submissionMinutes: 12,
      factors: ['Standard government form processing']
    };

    return {
      ...countryEstimate,
      totalMinutes: countryEstimate.preparationMinutes + countryEstimate.submissionMinutes,
    };
  }
}
