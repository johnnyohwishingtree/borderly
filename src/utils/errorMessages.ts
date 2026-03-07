/**
 * Enhanced Error Messages Utility
 * 
 * Provides contextual, actionable error messages with recovery guidance
 * for different error scenarios in the Borderly app.
 */

import { ERROR_CODES, ErrorCode } from './errorHandling';

export interface ErrorMessageContext {
  screen?: string;
  action?: string;
  deviceType?: 'ios' | 'android';
  userLevel?: 'beginner' | 'experienced';
}

export interface EnhancedErrorMessage {
  title: string;
  message: string;
  actionGuidance: string;
  recoverySteps: string[];
  preventionTips?: string[];
  supportInfo?: {
    searchTerms: string[];
    contactInfo?: string;
  };
}

/**
 * Enhanced error messages with contextual guidance
 */
const ENHANCED_ERROR_MESSAGES: Record<ErrorCode, EnhancedErrorMessage> = {
  [ERROR_CODES.NETWORK_UNAVAILABLE]: {
    title: 'No Internet Connection',
    message: 'Your device is not connected to the internet.',
    actionGuidance: 'Check your internet connection and try again.',
    recoverySteps: [
      'Check if Wi-Fi is connected',
      'Try switching to mobile data',
      'Move closer to your router',
      'Restart your network connection',
      'Wait a few moments and try again'
    ],
    preventionTips: [
      'Ensure stable internet before starting passport scanning',
      'Download offline data when connected'
    ],
    supportInfo: {
      searchTerms: ['network', 'internet', 'connection', 'wifi']
    }
  },

  [ERROR_CODES.REQUEST_TIMEOUT]: {
    title: 'Request Timed Out',
    message: 'The operation took too long to complete.',
    actionGuidance: 'Your internet connection may be slow. Please try again.',
    recoverySteps: [
      'Check your internet speed',
      'Try again with a better connection',
      'Wait a few minutes before retrying',
      'Close other apps using internet'
    ],
    preventionTips: [
      'Use Wi-Fi when available for faster speeds',
      'Close bandwidth-heavy apps while using Borderly'
    ],
    supportInfo: {
      searchTerms: ['timeout', 'slow', 'speed', 'performance']
    }
  },

  [ERROR_CODES.SERVER_ERROR]: {
    title: 'Server Temporarily Unavailable',
    message: 'The government portal is experiencing issues.',
    actionGuidance: 'Please try again in a few minutes.',
    recoverySteps: [
      'Wait 5-10 minutes and try again',
      'Check if the government website is accessible',
      'Try during off-peak hours',
      'Use manual submission if automated fails'
    ],
    preventionTips: [
      'Avoid peak submission times (early morning, late evening)',
      'Have manual submission option ready as backup'
    ],
    supportInfo: {
      searchTerms: ['server', 'government', 'portal', 'maintenance']
    }
  },

  [ERROR_CODES.STORAGE_UNAVAILABLE]: {
    title: 'Storage Access Problem',
    message: 'Cannot access device storage for saving your data.',
    actionGuidance: 'Restart the app and check your device storage.',
    recoverySteps: [
      'Force close and restart Borderly',
      'Check available device storage space',
      'Restart your device if issues persist',
      'Clear app cache in device settings'
    ],
    preventionTips: [
      'Keep at least 500MB of free storage space',
      'Regularly restart the app to refresh storage access'
    ],
    supportInfo: {
      searchTerms: ['storage', 'save', 'memory', 'device']
    }
  },

  [ERROR_CODES.STORAGE_FULL]: {
    title: 'Device Storage Full',
    message: 'Your device does not have enough storage space.',
    actionGuidance: 'Free up storage space and try again.',
    recoverySteps: [
      'Delete unused photos and videos',
      'Remove old apps you no longer use',
      'Clear cache from other apps',
      'Move files to cloud storage',
      'Restart the app once space is freed'
    ],
    preventionTips: [
      'Keep at least 1GB of free space for optimal performance',
      'Regularly clean up your device storage'
    ],
    supportInfo: {
      searchTerms: ['storage full', 'space', 'memory', 'cleanup']
    }
  },

  [ERROR_CODES.KEYCHAIN_ACCESS_DENIED]: {
    title: 'Secure Storage Access Denied',
    message: 'Cannot access secure storage for your passport data.',
    actionGuidance: 'Check your biometric/passcode settings and try again.',
    recoverySteps: [
      'Verify Face ID/Touch ID/Fingerprint is enabled',
      'Check your device passcode is set',
      'Go to Settings > Borderly > Allow Keychain Access',
      'Restart the app and authenticate again',
      'Contact support if issues persist'
    ],
    preventionTips: [
      'Keep biometric authentication enabled',
      'Don\'t disable device passcode while using Borderly'
    ],
    supportInfo: {
      searchTerms: ['keychain', 'biometric', 'passcode', 'security', 'face id', 'touch id']
    }
  },

  [ERROR_CODES.CAMERA_UNAVAILABLE]: {
    title: 'Camera Not Available',
    message: 'Cannot access your device camera for passport scanning.',
    actionGuidance: 'Check camera permissions and try again.',
    recoverySteps: [
      'Go to Settings > Borderly > Camera > Allow',
      'Close other apps using the camera',
      'Restart Borderly app',
      'Try entering passport details manually instead',
      'Restart your device if camera issues persist'
    ],
    preventionTips: [
      'Keep camera permission enabled for Borderly',
      'Close other camera apps before scanning'
    ],
    supportInfo: {
      searchTerms: ['camera', 'permission', 'scan', 'passport']
    }
  },

  [ERROR_CODES.CAMERA_PERMISSION_DENIED]: {
    title: 'Camera Permission Required',
    message: 'Borderly needs camera access to scan your passport.',
    actionGuidance: 'Please enable camera permission in your device settings.',
    recoverySteps: [
      'Go to Settings > Privacy > Camera > Borderly > Enable',
      'Return to the app and try scanning again',
      'Alternatively, use manual passport entry'
    ],
    preventionTips: [
      'Always allow camera permission when prompted',
      'Review app permissions periodically'
    ],
    supportInfo: {
      searchTerms: ['camera permission', 'privacy', 'settings', 'access']
    }
  },

  [ERROR_CODES.MRZ_SCAN_FAILED]: {
    title: 'Passport Scan Failed',
    message: 'Could not read the information from your passport.',
    actionGuidance: 'Improve lighting and passport positioning, then try again.',
    recoverySteps: [
      'Find better lighting (avoid shadows and glare)',
      'Hold your phone steady over the passport',
      'Make sure the passport page is flat and unfolded',
      'Clean your camera lens',
      'Try scanning the bottom two lines (MRZ) specifically',
      'Use manual entry if scanning continues to fail'
    ],
    preventionTips: [
      'Use natural daylight or bright indoor lighting',
      'Place passport on a flat, contrasting surface',
      'Hold device about 6-8 inches away from passport'
    ],
    supportInfo: {
      searchTerms: ['mrz', 'scan', 'passport', 'lighting', 'manual entry']
    }
  },

  [ERROR_CODES.VALIDATION_FAILED]: {
    title: 'Form Validation Error',
    message: 'Some information in the form needs to be corrected.',
    actionGuidance: 'Please review the highlighted fields and fix any errors.',
    recoverySteps: [
      'Look for red text indicating field errors',
      'Check date formats (YYYY-MM-DD)',
      'Verify passport number is correct',
      'Ensure required fields are filled',
      'Double-check spelling and formatting'
    ],
    preventionTips: [
      'Have your passport handy while filling forms',
      'Use the camera scan feature to avoid typing errors',
      'Review all fields before submitting'
    ],
    supportInfo: {
      searchTerms: ['validation', 'form', 'required', 'format', 'error']
    }
  },

  [ERROR_CODES.FORM_SUBMISSION_FAILED]: {
    title: 'Form Submission Failed',
    message: 'Could not submit your form to the government portal.',
    actionGuidance: 'Check your connection and try again, or use manual submission.',
    recoverySteps: [
      'Check your internet connection',
      'Try again in a few minutes',
      'Use the manual submission guide instead',
      'Verify the government website is accessible',
      'Try during off-peak hours if busy'
    ],
    preventionTips: [
      'Submit forms well before travel deadlines',
      'Have manual submission ready as backup',
      'Double-check all information before submitting'
    ],
    supportInfo: {
      searchTerms: ['submission', 'government', 'portal', 'manual', 'backup']
    }
  },

  [ERROR_CODES.UNKNOWN_ERROR]: {
    title: 'Unexpected Error',
    message: 'Something unexpected happened.',
    actionGuidance: 'Try restarting the app. If the problem persists, contact support.',
    recoverySteps: [
      'Force close and restart the app',
      'Try the action again',
      'Restart your device if issues continue',
      'Contact support with details of what you were doing'
    ],
    preventionTips: [
      'Keep the app updated to the latest version',
      'Restart the app periodically for best performance'
    ],
    supportInfo: {
      searchTerms: ['unknown', 'unexpected', 'crash', 'support', 'help'],
      contactInfo: 'help@borderly.app'
    }
  },

  [ERROR_CODES.PARSING_ERROR]: {
    title: 'Data Format Error',
    message: 'The information could not be processed correctly.',
    actionGuidance: 'Please try entering the information again or contact support.',
    recoverySteps: [
      'Try re-scanning your passport',
      'Use manual entry instead of camera scan',
      'Check that passport information is clearly visible',
      'Verify dates are in correct format',
      'Contact support if error persists'
    ],
    preventionTips: [
      'Ensure passport is in good condition (not damaged)',
      'Use good lighting when scanning',
      'Double-check manually entered dates and numbers'
    ],
    supportInfo: {
      searchTerms: ['parsing', 'format', 'data', 'scan', 'manual entry']
    }
  }
};

/**
 * Get enhanced error message with context
 */
export function getEnhancedErrorMessage(
  errorCode: ErrorCode,
  context?: ErrorMessageContext
): EnhancedErrorMessage {
  const baseMessage = ENHANCED_ERROR_MESSAGES[errorCode];
  
  // Customize message based on context
  if (context?.deviceType === 'ios' && errorCode === ERROR_CODES.CAMERA_PERMISSION_DENIED) {
    return {
      ...baseMessage,
      recoverySteps: [
        'Go to Settings > Privacy & Security > Camera > Borderly > Enable',
        'Return to the app and try scanning again',
        'Alternatively, use manual passport entry'
      ]
    };
  }
  
  if (context?.deviceType === 'android' && errorCode === ERROR_CODES.CAMERA_PERMISSION_DENIED) {
    return {
      ...baseMessage,
      recoverySteps: [
        'Go to Settings > Apps > Borderly > Permissions > Camera > Allow',
        'Return to the app and try scanning again', 
        'Alternatively, use manual passport entry'
      ]
    };
  }

  return baseMessage;
}

/**
 * Get quick recovery steps for an error
 */
export function getQuickRecoverySteps(errorCode: ErrorCode): string[] {
  const message = ENHANCED_ERROR_MESSAGES[errorCode];
  return message.recoverySteps.slice(0, 3); // Return first 3 steps for quick guidance
}

/**
 * Get contextual help text for an error
 */
export function getContextualHelp(
  errorCode: ErrorCode,
  context?: ErrorMessageContext
): string {
  const message = getEnhancedErrorMessage(errorCode, context);
  
  if (context?.userLevel === 'beginner') {
    return `${message.actionGuidance}\n\nNext steps:\n${message.recoverySteps.slice(0, 2).map(step => `• ${step}`).join('\n')}`;
  }
  
  return message.actionGuidance;
}

/**
 * Check if an error has automated recovery options
 */
export function hasAutomatedRecovery(errorCode: ErrorCode): boolean {
  const automatedRecoveryErrors: ErrorCode[] = [
    ERROR_CODES.NETWORK_UNAVAILABLE,
    ERROR_CODES.REQUEST_TIMEOUT,
    ERROR_CODES.SERVER_ERROR,
    ERROR_CODES.STORAGE_UNAVAILABLE,
    ERROR_CODES.CAMERA_UNAVAILABLE,
    ERROR_CODES.MRZ_SCAN_FAILED
  ];
  
  return automatedRecoveryErrors.includes(errorCode);
}

/**
 * Get suggested search terms for finding help
 */
export function getHelpSearchTerms(errorCode: ErrorCode): string[] {
  const message = ENHANCED_ERROR_MESSAGES[errorCode];
  return message.supportInfo?.searchTerms || [];
}

/**
 * Export all enhanced error messages for reference
 */
export { ENHANCED_ERROR_MESSAGES };