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
import { useAccountSetupStore } from '@/stores/useAccountSetupStore';
import { getSchemaByCountryCode } from '@/schemas';
import { CountryFormSchema } from '@/types/schema';
import { TripLeg } from '@/types/trip';

export interface AccountSetupChecklistProps {
  /** The legs of the trip to show account setup items for */
  legs: TripLeg[];
  /** Primary profile ID (for storing readiness per profile × portal) */
  profileId: string;
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
 */
export default function AccountSetupChecklist({
  legs,
  profileId,
  familyProfileIds: _familyProfileIds = [],
  testID,
}: AccountSetupChecklistProps) {
  const [portalInfos, setPortalInfos] = useState<PortalAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signupModal, setSignupModal] = useState<{
    url: string;
    title: string;
    portalCode: string;
  } | null>(null);
  const [webviewLoading, setWebviewLoading] = useState(true);

  const { getStatus, markReady, resetStatus, loadStatuses } = useAccountSetupStore();

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

  const handleOpenSignup = useCallback(
    (info: PortalAccountInfo) => {
      setWebviewLoading(true);
      setSignupModal({
        url: info.signupUrl,
        title: `${info.portalName} — Sign Up`,
        portalCode: info.countryCode,
      });
    },
    []
  );

  const handleMarkReady = useCallback(
    (portalCode: string) => {
      // Only mark the current profile as ready.
      // Family members with 'individual' portals must sign up separately;
      // companion portals share the primary account, but the primary
      // profile is already covered by this single call.
      markReady(profileId, portalCode);
      setSignupModal(null);
    },
    [profileId, markReady]
  );

  const handleCloseModal = useCallback(() => {
    setSignupModal(null);
  }, []);

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
      testID={testID ?? 'account-setup-checklist'}
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
          <ActivityIndicator size="small" color="#6b7280" testID="account-setup-loading" />
        </View>
      ) : (
        <View className="py-1">
          {portalInfos.map(info => {
            const status = info.requiresAccount
              ? getStatus(profileId, info.countryCode)
              : 'not_started';
            const isReady = status === 'ready';
            const isStarted = status === 'setup_started';
            const isCompanion =
              info.familyPolicy?.type === 'companion';

            if (!info.requiresAccount) {
              // No account needed — informational row
              return (
                <View
                  key={info.countryCode}
                  testID={`account-row-${info.countryCode}`}
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
                testID={`account-row-${info.countryCode}`}
                onPress={() => !isReady && handleOpenSignup(info)}
                activeOpacity={isReady ? 1 : 0.7}
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
                      ? `${info.portalName} account ready`
                      : isStarted
                      ? `${info.portalName} setup in progress`
                      : `${info.portalName} account needed`}
                  </Text>
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
                    testID={`reset-account-${info.countryCode}`}
                    onPress={() => resetStatus(profileId, info.countryCode)}
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
        testID="signup-webview-modal"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity
              onPress={handleCloseModal}
              testID="signup-modal-close"
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
                signupModal && handleMarkReady(signupModal.portalCode)
              }
              testID="signup-modal-mark-ready"
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
                  <ActivityIndicator size="large" color="#2563eb" testID="signup-webview-loading" />
                  <Text className="text-sm text-gray-500 mt-2">Loading signup page…</Text>
                </View>
              )}
              <WebView
                testID="signup-webview"
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
    </View>
  );
}
