/**
 * Shared Access Configuration
 *
 * Constants for App Group and shared Keychain access group,
 * enabling data sharing between the main Borderly app and
 * the AutoFill Credential Provider Extension.
 *
 * iOS setup requirements:
 * 1. Enable "App Groups" capability in both targets
 * 2. Enable "Keychain Sharing" capability in both targets
 * 3. Add the same App Group ID and Keychain access group to both targets' entitlements
 */

/** App Group identifier for sharing data between app and extensions */
export const APP_GROUP_IDENTIFIER = 'group.com.borderly.shared';

/** Shared Keychain access group for cross-target Keychain access */
export const SHARED_KEYCHAIN_ACCESS_GROUP = 'com.borderly.shared-keychain';

/** Whether to use the shared access group.
 * On simulator without provisioning profile, access groups cause
 * "required entitlement isn't present" errors. Skip in __DEV__. */
export const USE_SHARED_ACCESS_GROUP = !__DEV__;

/** Keychain service identifier (used as the `service` param in react-native-keychain) */
export const KEYCHAIN_SERVICE = 'borderly';
