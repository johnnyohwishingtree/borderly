/**
 * Compliance check definitions — the full list of checks the validator runs.
 */

import type { AppStoreComplianceCheck } from './appStoreComplianceTypes';

export function initializeChecks(): AppStoreComplianceCheck[] {
  return [
    // App Configuration Checks
    {
      id: 'app_icon_present',
      name: 'App Icon Present',
      category: 'configuration',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'App must have properly configured icon files',
      fixAction: 'Add app icon files to platform-specific directories',
    },
    {
      id: 'launch_screen_configured',
      name: 'Launch Screen Configured',
      category: 'configuration',
      platform: 'ios',
      required: true,
      status: 'unknown',
      message: 'iOS requires a launch screen storyboard',
      fixAction: 'Configure LaunchScreen.storyboard in iOS project',
    },
    {
      id: 'version_consistency',
      name: 'Version Number Consistency',
      category: 'configuration',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'iOS and Android versions should match',
      fixAction: 'Update version numbers in Info.plist and build.gradle',
    },

    // Permission Checks
    {
      id: 'camera_permission_description',
      name: 'Camera Permission Description',
      category: 'permissions',
      platform: 'ios',
      required: true,
      status: 'unknown',
      message: 'NSCameraUsageDescription must be present and clear',
      fixAction: 'Add camera usage description to Info.plist',
    },
    {
      id: 'biometric_permission_description',
      name: 'Biometric Permission Description',
      category: 'permissions',
      platform: 'ios',
      required: true,
      status: 'unknown',
      message: 'NSFaceIDUsageDescription must be present',
      fixAction: 'Add Face ID usage description to Info.plist',
    },
    {
      id: 'android_permissions_declared',
      name: 'Android Permissions Declared',
      category: 'permissions',
      platform: 'android',
      required: true,
      status: 'unknown',
      message: 'All used permissions must be declared in AndroidManifest.xml',
      fixAction: 'Declare CAMERA and USE_BIOMETRIC permissions',
    },

    // Privacy Compliance
    {
      id: 'privacy_policy_accessible',
      name: 'Privacy Policy Accessible',
      category: 'privacy',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'Privacy policy must be accessible from app',
      fixAction: 'Add privacy policy link to settings screen',
    },
    {
      id: 'no_server_data_collection',
      name: 'No Server Data Collection',
      category: 'privacy',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'App must not send PII to any server',
      fixAction: 'Verify no network calls contain sensitive data',
    },
    {
      id: 'encryption_compliance',
      name: 'Encryption Compliance Declaration',
      category: 'privacy',
      platform: 'ios',
      required: true,
      status: 'unknown',
      message: 'ITSAppUsesNonExemptEncryption must be set correctly',
      fixAction: 'Set ITSAppUsesNonExemptEncryption to NO in Info.plist',
    },

    // Content Checks
    {
      id: 'age_rating_appropriate',
      name: 'Age Rating Appropriate',
      category: 'content',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'App content must match declared age rating (4+)',
      fixAction: 'Verify no inappropriate content in app',
    },
    {
      id: 'no_placeholder_content',
      name: 'No Placeholder Content',
      category: 'content',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'App must not contain placeholder text or images',
      fixAction: 'Replace any lorem ipsum or placeholder content',
    },

    // Metadata Checks
    {
      id: 'app_store_description_complete',
      name: 'App Store Description Complete',
      category: 'metadata',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'Store listing description must be complete and accurate',
      fixAction: 'Complete app store description following guidelines',
    },
    {
      id: 'screenshots_provided',
      name: 'Screenshots Provided',
      category: 'metadata',
      platform: 'both',
      required: true,
      status: 'unknown',
      message: 'Required screenshots for all device types must be provided',
      fixAction: 'Capture and upload required screenshots',
    },
    {
      id: 'keywords_appropriate',
      name: 'Keywords Appropriate',
      category: 'metadata',
      platform: 'ios',
      required: false,
      status: 'unknown',
      message: 'App Store keywords should be relevant and accurate',
      fixAction: 'Review and optimize keyword list',
    },
  ];
}
