import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import { X } from 'lucide-react-native';
import { getSchemaByCountryCode } from '@/schemas';
import { CredentialPrompt } from '@/components/submission/CredentialPrompt';
import { CountryFormSchema } from '@/types/schema';
import { TripLeg } from '@/types/trip';
import { TravelerProfile } from '@/types/profile';
import type { AccountReadinessStatus } from '@/types/submission';
import { ACCOUNT_SETUP_CHECKLIST_IDS } from './testIDs';

export interface AccountSetupActions {
  getPortalStatus: (portalCode: string) => AccountReadinessStatus;
  markPortalReady: (portalCode: string) => void;
  resetPortalStatus: (portalCode: string) => void;
  loadStatuses: () => void;
  getPortalCredential: (portalCode: string) => Promise<{ username: string; password: string } | null>;
  storePortalCredential: (portalCode: string, username: string, password: string, email?: string) => Promise<void>;
}

export interface AccountSetupChecklistProps {
  /** The legs of the trip to show account setup items for */
  legs: TripLeg[];
  /** Account setup actions provided by the parent screen */
  accountSetup: AccountSetupActions;
  /** Optional profile object — used to pre-fill email in the credential prompt */
  profile?: TravelerProfile;
  /**
   * Additional family member profile IDs.
   * If provided, the checklist tracks readiness for each family member separately
   * for portals with `individual` family policy.
   */
  familyProfileIds?: string[];
  testID?: string;
}

interface PortalAccountInfo {
  countryCode: string;
  countryName: string;
  portalName: string;
  requiresAccount: boolean;
  signupUrl: string;
  familyPolicy?: CountryFormSchema['portalFlow']['familyPolicy'];
}

/**
 * AccountSetupChecklist — Pre-trip portal account readiness tracker.
 *
 * Shows a checklist of portal accounts the user needs to set up before
 * filling out forms. Countries that don't require an account show an
 * informational row so the user knows they can skip that step.
 *
 * Tapping an incomplete item opens the portal's signup page in a WebView
 * modal. After visiting the signup page the user can mark the account as ready.
 * A credential-save prompt is then shown so the user can store their login
 * details for future auto-login.
 */
export default function AccountSetupChecklist({
  legs,
  accountSetup,
  profile,
  familyProfileIds: _familyProfileIds = [],
  testID,
}: AccountSetupChecklistProps) {
  const [portalInfos, setPortalInfos] = useState<PortalAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signupModal, setSignupModal] = useState<{
    url: string;
    title: string;
    portalCode: string;
    portalName: string;
  } | null>(null);
  const [webviewLoading, setWebviewLoading] = useState(true);

  /** Map from portalCode → whether credentials are stored (checked after marking ready) */
  const [credentialStatus, setCredentialStatus] = useState<Record<string, boolean>>({});

  /** State for the credential-save prompt shown after account creation */
  const [credentialPrompt, setCredentialPrompt] = useState<{
    portalCode: string;
    portalName: string;
  } | null>(null);

  const { getPortalStatus, markPortalReady, resetPortalStatus, loadStatuses, getPortalCredential, storePortalCredential } = accountSetup;

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    // Deduplicate country codes across all legs
    const uniqueCodes = [...new Set(legs.map(l => l.destinationCountry))];

    setLoading(true);
    Promise.all(
      uniqueCodes.map(async code => {
        const schema = await getSchemaByCountryCode(code);
        if (!schema) return null;
        const info: PortalAccountInfo = {
          countryCode: schema.countryCode,
          countryName: schema.countryName,
          portalName: schema.portalName,
          requiresAccount: schema.portalFlow.requiresAccount,
          signupUrl: schema.portalFlow.signupUrl ?? schema.portalUrl,
          familyPolicy: schema.portalFlow.familyPolicy,
        };
        return info;
      })
    )
      .then(infos => {
        setPortalInfos(infos.filter((i): i is PortalAccountInfo => i !== null));
      })
      .catch(err => {
        console.error('AccountSetupChecklist: failed to load schemas', err);
      })
      .finally(() => setLoading(false));
  }, [legs]);

  /** Refresh credential status for all ready portals */
  const refreshCredentialStatuses = useCallback(async () => {
    const updates: Record<string, boolean> = {};
    for (const info of portalInfos) {
      if (info.requiresAccount && getPortalStatus(info.countryCode) === 'ready') {
        const cred = await getPortalCredential(info.countryCode);
        updates[info.countryCode] = cred !== null;
      }
    }
    setCredentialStatus(prev => ({ ...prev, ...updates }));
  }, [portalInfos, getPortalStatus, getPortalCredential]);

  useEffect(() => {
    if (!loading) {
      refreshCredentialStatuses();
    }
  }, [loading, refreshCredentialStatuses]);

  const handleOpenSignup = useCallback(
    (info: PortalAccountInfo) => {
      setWebviewLoading(true);
      setSignupModal({
        url: info.signupUrl,
        title: `${info.portalName} — Sign Up`,
        portalCode: info.countryCode,
        portalName: info.portalName,
      });
    },
    []
  );

  /**
   * Called when the user taps "Mark Ready".
   * Marks account as ready, then checks if credentials are stored.
   * If not, shows the credential-save prompt.
   */
  const handleMarkReady = useCallback(
    async (portalCode: string, portalName: string) => {
      markPortalReady(portalCode);
      setSignupModal(null);

      // Check if credentials are already stored
      const existing = await getPortalCredential(portalCode);
      if (!existing) {
        // Prompt user to save credentials
        setCredentialPrompt({ portalCode, portalName });
      } else {
        setCredentialStatus(prev => ({ ...prev, [portalCode]: true }));
      }
    },
    [markPortalReady, getPortalCredential]
  );

  const handleCloseModal = useCallback(() => {
    setSignupModal(null);
  }, []);

  /** Called when user taps "Save" in the credential prompt */
  const handleCredentialSave = useCallback(
    async (username: string, password: string) => {
      if (!credentialPrompt) return;
      try {
        await storePortalCredential(
          credentialPrompt.portalCode,
          username,
          password,
          profile?.email,
        );
        setCredentialStatus(prev => ({ ...prev, [credentialPrompt.portalCode]: true }));
      } catch (err) {
        console.error('AccountSetupChecklist: failed to store credential', err);
      } finally {
        setCredentialPrompt(null);
      }
    },
    [credentialPrompt, storePortalCredential, profile?.email]
  );

  const handleCredentialSkip = useCallback(() => {
    if (credentialPrompt) {
      setCredentialStatus(prev => ({ ...prev, [credentialPrompt.portalCode]: false }));
    }
    setCredentialPrompt(null);
  }, [credentialPrompt]);

  /**
   * Called when a "ready" portal row is tapped — lets the user re-save
   * credentials if they skipped initially.
   */
  const handleResaveCredentials = useCallback(
    (info: PortalAccountInfo) => {
      setCredentialPrompt({ portalCode: info.countryCode, portalName: info.portalName });
    },
    []
  );

  // Show nothing if no legs (e.g. empty trip) or still loading with no data
  if (loading && portalInfos.length === 0) {
    return null;
  }

  // Only render the section if at least one portal exists
  if (!loading && portalInfos.length === 0) {
    return null;
  }

  return (
    <View
      testID={testID ?? ACCOUNT_SETUP_CHECKLIST_IDS.container.id}
      className="bg-white mx-4 mb-4 rounded-xl shadow-sm border border-gray-100"
    >
      {/* Section header */}
      <View className="px-4 pt-4 pb-2 border-b border-gray-100">
        <Text className="text-base font-semibold text-gray-900">Pre-trip Setup</Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          Set up portal accounts before you fill out forms
        </Text>
      </View>

      {/* Portal rows */}
      {loading ? (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color="#6b7280" testID={ACCOUNT_SETUP_CHECKLIST_IDS.loading.id} />
        </View>
      ) : (
        <View className="py-1">
          {portalInfos.map(info => {
            const status = info.requiresAccount
              ? getPortalStatus(info.countryCode)
              : 'not_started';
            const isReady = status === 'ready';
            const isStarted = status === 'setup_started';
            const isCompanion =
              info.familyPolicy?.type === 'companion';
            const hasCredentials = credentialStatus[info.countryCode] ?? false;

            if (!info.requiresAccount) {
              // No account needed — informational row
              return (
                <View
                  key={info.countryCode}
                  testID={ACCOUNT_SETUP_CHECKLIST_IDS.accountRow(info.countryCode).id}
                  className="flex-row items-center px-4 py-3"
                >
                  <Text className="text-base mr-2">ℹ️</Text>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600">
                      <Text className="font-medium text-gray-800">{info.countryName}</Text>
                      {' — No account needed'}
                    </Text>
                  </View>
                </View>
              );
            }

            // Account required — show status and action
            return (
              <TouchableOpacity
                key={info.countryCode}
                testID={ACCOUNT_SETUP_CHECKLIST_IDS.accountRow(info.countryCode).id}
                onPress={() => {
                  if (!isReady) {
                    handleOpenSignup(info);
                  } else if (!hasCredentials) {
                    handleResaveCredentials(info);
                  }
                }}
                activeOpacity={isReady && hasCredentials ? 1 : 0.7}
                className="flex-row items-center px-4 py-3"
              >
                {/* Status icon */}
                <Text className="text-base mr-2">
                  {isReady ? '✅' : isStarted ? '🔄' : '⬜'}
                </Text>

                {/* Country and status info */}
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">
                    {info.countryName}
                    {' — '}
                    {isReady
                      ? hasCredentials
                        ? `${info.portalName} account ready (credentials saved)`
                        : `${info.portalName} account ready (no saved credentials)`
                      : isStarted
                      ? `${info.portalName} setup in progress`
                      : `${info.portalName} account needed`}
                  </Text>
                  {isReady && !hasCredentials && (
                    <Text
                      className="text-xs text-blue-600 mt-0.5"
                      testID={ACCOUNT_SETUP_CHECKLIST_IDS.saveCredentialsHint(info.countryCode).id}
                    >
                      Tap to save login credentials
                    </Text>
                  )}
                  {isCompanion && !isReady && (
                    <Text className="text-xs text-blue-600 mt-0.5">
                      {info.familyPolicy?.description}
                    </Text>
                  )}
                  {!isCompanion &&
                    info.familyPolicy?.type === 'individual' &&
                    !isReady && (
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {info.familyPolicy?.description}
                      </Text>
                    )}
                </View>

                {/* Action hint */}
                {!isReady && (
                  <Text className="text-xs text-blue-600 ml-2">Sign up →</Text>
                )}
                {isReady && (
                  <TouchableOpacity
                    testID={ACCOUNT_SETUP_CHECKLIST_IDS.resetAccount(info.countryCode).id}
                    onPress={() => resetPortalStatus(info.countryCode)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color="#9ca3af" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* WebView signup modal */}
      <Modal
        visible={signupModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        testID={ACCOUNT_SETUP_CHECKLIST_IDS.signupWebviewModal.id}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity
              onPress={handleCloseModal}
              testID={ACCOUNT_SETUP_CHECKLIST_IDS.signupModalClose.id}
              className="mr-4"
            >
              <Text className="text-base text-blue-600">Close</Text>
            </TouchableOpacity>
            <Text
              className="flex-1 text-sm font-medium text-gray-800 text-center"
              numberOfLines={1}
            >
              {signupModal?.title}
            </Text>
            <TouchableOpacity
              onPress={() =>
                signupModal &&
                handleMarkReady(signupModal.portalCode, signupModal.portalName)
              }
              testID={ACCOUNT_SETUP_CHECKLIST_IDS.signupModalMarkReady.id}
              className="ml-4"
            >
              <Text className="text-base font-medium text-green-600">Mark Ready</Text>
            </TouchableOpacity>
          </View>

          {/* WebView */}
          {signupModal && (
            <View className="flex-1">
              {webviewLoading && (
                <View className="absolute inset-0 items-center justify-center z-10 bg-white">
                  <ActivityIndicator size="large" color="#2563eb" testID={ACCOUNT_SETUP_CHECKLIST_IDS.signupWebviewLoading.id} />
                  <Text className="text-sm text-gray-500 mt-2">Loading signup page…</Text>
                </View>
              )}
              <WebView
                testID={ACCOUNT_SETUP_CHECKLIST_IDS.signupWebview.id}
                source={{ uri: signupModal.url }}
                onLoadStart={() => setWebviewLoading(true)}
                onLoadEnd={() => setWebviewLoading(false)}
                onError={() => setWebviewLoading(false)}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Credential save prompt — shown after account creation */}
      <CredentialPrompt
        visible={credentialPrompt !== null}
        portalName={credentialPrompt?.portalName ?? ''}
        initialUsername={profile?.email ?? ''}
        title="Account created! Save your login?"
        onSave={handleCredentialSave}
        onSkip={handleCredentialSkip}
        testID={ACCOUNT_SETUP_CHECKLIST_IDS.credentialPrompt.id}
      />
    </View>
  );
}
