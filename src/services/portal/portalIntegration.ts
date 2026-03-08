import { Linking, Alert } from 'react-native';
import { CountryFormSchema } from '../../types/schema';

export interface PortalInfo {
  name: string;
  url: string;
  countryCode: string;
  features: {
    supportsDeepLinks: boolean;
    supportsAutoFill: boolean;
    requiresManualEntry: boolean;
  };
  guidelines: {
    recommendedBrowser: string[];
    preparationTips: string[];
    commonIssues: string[];
  };
}

export interface PortalLaunchOptions {
  openInExternalBrowser?: boolean;
  prefillData?: boolean;
  trackingParams?: Record<string, string>;
}

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
    const portalMap: Record<string, PortalInfo> = {
      'JPN': {
        name: 'Visit Japan Web',
        url: 'https://vjw-lp.digital.go.jp/en/',
        countryCode: 'JPN',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: false,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Edge'],
          preparationTips: [
            'Have your passport ready for scanning',
            'Prepare accommodation booking details',
            'Know your flight number and airline',
            'Have your planned departure date',
          ],
          commonIssues: [
            'Portal may be slow during peak hours',
            'Passport scanning sometimes fails - manual entry is always available',
            'QR code generation can take 2-3 minutes',
          ],
        },
      },
      'MYS': {
        name: 'Malaysia Digital Arrival Card (MDAC)',
        url: 'https://imigresen-online.imi.gov.my/mdac/main',
        countryCode: 'MYS',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: false,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome'],
          preparationTips: [
            'Complete within 3 days of arrival',
            'Have accommodation address ready',
            'Know your purpose of visit',
            'Prepare contact information',
          ],
          commonIssues: [
            'System maintenance usually happens late night Malaysia time',
            'Upload passport photo if scan fails',
            'Confirmation email may take up to 30 minutes',
          ],
        },
      },
      'SGP': {
        name: 'SG Arrival Card',
        url: 'https://eservices.ica.gov.sg/sgarrivalcard/',
        countryCode: 'SGP',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: false,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Firefox'],
          preparationTips: [
            'Submit up to 14 days before arrival',
            'Have Singapore accommodation details',
            'Know your intended length of stay',
            'Prepare recent travel history',
          ],
          commonIssues: [
            'Portal blocks rapid form submissions',
            'Photo upload has file size limits',
            'Confirmation typically received within minutes',
          ],
        },
      },
      'THA': {
        name: 'Thailand Pass',
        url: 'https://tp.consular.go.th/',
        countryCode: 'THA',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: true,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Edge'],
          preparationTips: [
            'Create account and verify email first',
            'Have accommodation booking confirmation ready',
            'Prepare vaccination certificates if applicable',
            'Know your flight details and emergency contact',
            'Submit at least 72 hours before departure',
          ],
          commonIssues: [
            'Processing usually takes 24-72 hours',
            'Document uploads must be clear, colored scans',
            'Account verification email may go to spam folder',
            'QR code generation can take several hours',
          ],
        },
      },
      'VNM': {
        name: 'Vietnam e-Visa Portal',
        url: 'https://evisa.xuatnhapcanh.gov.vn/',
        countryCode: 'VNM',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: true,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Edge'],
          preparationTips: [
            'No account registration required - single session process',
            'Have passport valid for at least 6 months ready',
            'Prepare accommodation booking details and contact info',
            'Know your intended entry port and travel dates',
            'Submit 3-30 days before intended arrival',
            'Have credit card ready for visa fee (~$25 USD)',
          ],
          commonIssues: [
            'Processing takes 2-3 business days',
            'Religion field is mandatory (required by Vietnamese law)',
            'Passport and portrait photos must be clear and in JPEG format',
            'Visa fee payment by credit card only',
            'Emergency contact information is required',
            'Download and print e-visa upon approval',
          ],
        },
      },
      'GBR': {
        name: 'UK Electronic Travel Authorisation (ETA)',
        url: 'https://www.gov.uk/apply-electronic-travel-authorisation',
        countryCode: 'GBR',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: true,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Edge'],
          preparationTips: [
            'Create GOV.UK One Login account first',
            'Have passport valid for entire stay ready',
            'Prepare UK accommodation address with postcode',
            'Know your employment status and occupation',
            'Have a digital passport-style photo (taken within last month)',
            'Credit or debit card for £10 application fee',
            'Submit at least 72 hours before travel',
          ],
          commonIssues: [
            'Processing usually takes up to 3 working days',
            'Account creation requires email verification',
            'Photo must meet UK passport standards (plain background, no smiling)',
            'ETA is valid for 2 years or until passport expires',
            'Multiple visits allowed - up to 6 months each',
            'Background questions must be answered truthfully',
          ],
        },
      },
      'USA': {
        name: 'Electronic System for Travel Authorization (ESTA)',
        url: 'https://esta.cbp.dhs.gov/',
        countryCode: 'USA',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: true,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Edge', 'Firefox'],
          preparationTips: [
            'No account creation required - single session process',
            'Have passport from Visa Waiver Program country ready',
            'Prepare employment and emergency contact information',
            'Know your US accommodation address or contact person',
            'Submit at least 72 hours before departure (recommended)',
            'Have credit card ready for $21 authorization fee',
            'ESTA is valid for 2 years or until passport expires',
          ],
          commonIssues: [
            'Processing usually takes minutes to hours, can take up to 72 hours',
            'Eligibility questions must be answered truthfully - false answers can result in permanent visa denial',
            'Payment is required regardless of approval or denial',
            'Multiple entries allowed - up to 90 days each visit',
            'Contact person in US can be hotel or tour operator',
            'Beware of unofficial sites charging additional fees - only use esta.cbp.dhs.gov',
            'ESTA approval does not guarantee entry - final decision at port of entry',
          ],
        },
      },
      'CAN': {
        name: 'Electronic Travel Authorization (eTA)',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
        countryCode: 'CAN',
        features: {
          supportsDeepLinks: false,
          supportsAutoFill: true,
          requiresManualEntry: true,
        },
        guidelines: {
          recommendedBrowser: ['Safari', 'Chrome', 'Edge'],
          preparationTips: [
            'No account creation required - single session process',
            'Have passport from visa-exempt country ready',
            'Prepare email address for confirmation',
            'Know your employment and travel details',
            'Submit at least 72 hours before departure (recommended)',
            'Have credit card ready for CAD $7 application fee',
            'eTA is valid for 5 years or until passport expires',
          ],
          commonIssues: [
            'Processing usually takes minutes, can take up to 72 hours',
            'US citizens do not need an eTA',
            'Canadian citizens should not apply for eTA',
            'Application fee is required regardless of approval or denial',
            'Multiple entries allowed - up to 6 months each visit',
            'Background questions must be answered truthfully',
            'eTA is electronically linked to passport - no physical document',
          ],
        },
      },
    };

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
      const canOpen = await Promise.race([
        Linking.canOpenURL(finalUrl),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.PORTAL_TIMEOUT)
        ),
      ]);

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
    const estimates: Record<string, any> = {
      'JPN': {
        preparationMinutes: 5,
        submissionMinutes: 15,
        factors: ['Account creation if first time', 'Passport scanning', 'QR code generation']
      },
      'MYS': {
        preparationMinutes: 3,
        submissionMinutes: 10,
        factors: ['Photo upload', 'Contact information entry', 'Email confirmation wait']
      },
      'SGP': {
        preparationMinutes: 2,
        submissionMinutes: 8,
        factors: ['Travel history entry', 'Accommodation details', 'Quick processing']
      },
      'THA': {
        preparationMinutes: 8,
        submissionMinutes: 20,
        factors: ['Account creation and verification', 'Vaccination documents', 'Document uploads', 'Multi-step form process']
      },
      'VNM': {
        preparationMinutes: 5,
        submissionMinutes: 18,
        factors: ['No account needed', 'Multiple document sections', 'Passport and portrait photo uploads', 'Emergency contact details', 'Payment processing']
      },
      'GBR': {
        preparationMinutes: 8,
        submissionMinutes: 15,
        factors: ['GOV.UK One Login account creation', 'Photo preparation', 'UK address details', 'Security questions', 'Payment processing']
      },
      'USA': {
        preparationMinutes: 10,
        submissionMinutes: 25,
        factors: ['Multi-step ESTA process', 'Detailed eligibility questionnaire', 'Employment and emergency contact information', 'Travel details and US contact person', 'Payment processing ($21 fee)']
      },
      'CAN': {
        preparationMinutes: 5,
        submissionMinutes: 12,
        factors: ['No account needed', 'Personal and passport information', 'Background security questions', 'Travel purpose and funding details', 'Payment processing (CAD $7 fee)']
      }
    };

    const countryEstimate = estimates[countryCode] || {
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