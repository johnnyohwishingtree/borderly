import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  Animated,
  StyleSheet,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react-native';
import { PortalWebView } from '@/components/submission/PortalWebView';
import { AutoFillBanner } from '@/components/submission/AutoFillBanner';
import { QRSaveOverlay } from '@/components/submission/QRSaveOverlay';
import { AutoFillPill } from '@/components/submission/AutoFillPill';
import { CredentialPrompt } from '@/components/submission/CredentialPrompt';
import { usePortalSubmission } from '@/hooks/usePortalSubmission';
import { PORTAL_SUBMISSION_IDS } from './testIDs';

export default function PortalSubmissionScreen() {
  const {
    route: { url },
    webViewRef,
    state: { navState, currentStep, qrPayload, pageType, pillDismissed },
    derived: { schema, totalSteps, progressPercent, loadError },
    autoLogin,
    autoFill,
    webViewHandlers: {
      handleNavigationChange, handlePageLoad, handleLoadStart, handleMessage,
      handleWebViewError, handleGoBack, handleGoForward, handleRefresh,
    },
    actions: {
      handleClose, handleContinueManually, handleSaveQR,
      handleOpenWallet, dismissPill, dismissQrPayload, clearLoadError,
    },
  } = usePortalSubmission();

  return (
    <SafeAreaView className="flex-1 bg-white" testID={PORTAL_SUBMISSION_IDS.screen.id}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-base font-semibold text-gray-900" numberOfLines={1}>
            {schema?.portalName ?? 'Government Portal'}
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
            accessibilityLabel="Close portal and go back to trip"
            testID={PORTAL_SUBMISSION_IDS.closeButton.id}
          >
            <X size={22} color="#374151" />
          </Pressable>
        </View>

        {totalSteps > 0 && (
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-gray-500">
                Step {currentStep} of {totalSteps}
              </Text>
              {schema?.submissionGuide?.[currentStep - 1]?.title ? (
                <Text className="text-xs text-blue-600 font-medium" numberOfLines={1}>
                  {schema.submissionGuide[currentStep - 1].title}
                </Text>
              ) : null}
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <Animated.View
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: '#3B82F6',
                  borderRadius: 9999,
                }}
                testID={PORTAL_SUBMISSION_IDS.progressBar.id}
              />
            </View>
          </View>
        )}
      </View>

      {/* Loading indicator */}
      {navState.loading && loadError === null && (
        <View
          className="bg-blue-50 border-b border-blue-200 px-4 py-1"
          testID={PORTAL_SUBMISSION_IDS.loadingIndicator.id}
        >
          <Text className="text-xs text-blue-700">Loading portal...</Text>
        </View>
      )}

      {/* Toolbar */}
      <View className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex-row items-center gap-4">
        <Pressable
          onPress={handleGoBack}
          disabled={!navState.canGoBack}
          style={({ pressed }) => ({ opacity: pressed || !navState.canGoBack ? 0.4 : 1, padding: 6 })}
          accessibilityLabel="Go back"
          testID={PORTAL_SUBMISSION_IDS.toolbarBackButton.id}
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Pressable
          onPress={handleGoForward}
          disabled={!navState.canGoForward}
          style={({ pressed }) => ({ opacity: pressed || !navState.canGoForward ? 0.4 : 1, padding: 6 })}
          accessibilityLabel="Go forward"
          testID={PORTAL_SUBMISSION_IDS.toolbarForwardButton.id}
        >
          <ArrowRight size={20} color="#374151" />
        </Pressable>
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, padding: 6 })}
          accessibilityLabel="Refresh page"
          testID={PORTAL_SUBMISSION_IDS.toolbarRefreshButton.id}
        >
          <RefreshCw size={20} color="#374151" />
        </Pressable>
        <Text className="flex-1 text-xs text-gray-400" numberOfLines={1}>
          {navState.url}
        </Text>
      </View>

      {/* Auth page banners */}
      {pageType === 'auth' && autoLogin.state.autoLoginBannerState === 'in_progress' && (
        <View
          className="bg-blue-50 border-b border-blue-500 px-4 py-2.5"
          testID={PORTAL_SUBMISSION_IDS.autoLoginProgressBanner.id}
        >
          <Text className="text-sm text-blue-700 font-medium">
            🔐 Logging in automatically...
          </Text>
        </View>
      )}

      {pageType === 'auth' && autoLogin.state.autoLoginBannerState === 'failed' && (
        <View
          className="bg-amber-100 border-b border-amber-500 px-4 py-2.5"
          testID={PORTAL_SUBMISSION_IDS.autoLoginFailedBanner.id}
        >
          <Text className="text-sm text-amber-800 font-medium">
            ⚠️ Auto-login failed. Please log in manually.
          </Text>
        </View>
      )}

      {pageType === 'auth' && autoLogin.state.autoLoginBannerState === 'idle' && (
        <View
          className="bg-amber-100 border-b border-amber-500 px-4 py-2.5"
          testID={PORTAL_SUBMISSION_IDS.authPageBanner.id}
        >
          <Text className="text-sm text-amber-800 font-medium">
            🔐 Log in to continue
          </Text>
        </View>
      )}

      {pageType === 'captcha' && (
        <View
          className="bg-amber-100 border-b border-amber-500 px-4 py-2.5"
          testID={PORTAL_SUBMISSION_IDS.captchaPageBanner.id}
        >
          <Text className="text-sm text-amber-800 font-medium">
            🤖 Complete the verification to continue
          </Text>
        </View>
      )}

      {/* Auto-fill feedback banner */}
      {autoFill.bannerState !== null && (
        <AutoFillBanner
          filled={autoFill.bannerState.filled}
          total={autoFill.bannerState.total}
          {...(autoFill.bannerState.results ? { results: autoFill.bannerState.results } : {})}
          onDismiss={autoFill.dismissBanner}
          testID={PORTAL_SUBMISSION_IDS.autofillBanner.id}
        />
      )}

      {/* Save credentials prompt */}
      {autoLogin.state.showSaveCredentialsPrompt && (
        <CredentialPrompt
          visible
          portalName={schema?.portalName ?? 'this portal'}
          initialUsername={autoLogin.state.extractedUsername}
          title="Save your login for next time?"
          onSave={autoLogin.actions.handleCredentialSave}
          onSkip={autoLogin.actions.dismissCredentialPrompt}
          testID={PORTAL_SUBMISSION_IDS.saveCredentialsPrompt.id}
        />
      )}

      {/* WebView */}
      <View className="flex-1">
        <PortalWebView
          ref={webViewRef}
          url={url}
          onNavigationChange={handleNavigationChange}
          onPageLoad={handlePageLoad}
          onLoadStart={handleLoadStart}
          onMessage={handleMessage}
          onError={handleWebViewError}
          testID={PORTAL_SUBMISSION_IDS.portalWebview.id}
        />

        {(pageType === 'form' || pageType === 'captcha') && !pillDismissed && (
          <AutoFillPill
            onAutoFill={autoFill.handleAutoFill}
            onDismiss={dismissPill}
            testID={PORTAL_SUBMISSION_IDS.autofillPill.id}
          />
        )}

        {/* Error overlay */}
        {loadError !== null && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(107, 114, 128, 0.92)',
            }}
            className="justify-center items-center p-6"
            testID={PORTAL_SUBMISSION_IDS.loadErrorOverlay.id}
          >
            <View className="bg-white rounded-xl p-6 w-full max-w-sm">
              <Text className="text-base font-semibold text-gray-900 mb-2">
                Unable to Load Portal
              </Text>
              <Text className="text-sm text-gray-600 mb-5 leading-5">
                {loadError}
              </Text>
              <Pressable
                onPress={() => {
                  clearLoadError();
                  handleRefresh();
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginBottom: 10,
                  opacity: pressed ? 0.8 : 1,
                })}
                accessibilityLabel="Try again"
                testID={PORTAL_SUBMISSION_IDS.errorTryAgainButton.id}
              >
                <Text className="text-white font-semibold text-center">
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinueManually}
                style={({ pressed }) => ({
                  backgroundColor: '#F3F4F6',
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  opacity: pressed ? 0.8 : 1,
                })}
                accessibilityLabel="Continue with manual guide"
                testID={PORTAL_SUBMISSION_IDS.errorContinueManuallyButton.id}
              >
                <Text className="text-gray-700 font-semibold text-center">
                  Continue Manually
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* QR save overlay */}
      <QRSaveOverlay
        payload={qrPayload}
        onSave={handleSaveQR}
        onDismiss={dismissQrPayload}
        onOpenWallet={handleOpenWallet}
        testID={PORTAL_SUBMISSION_IDS.qrSaveOverlay.id}
      />
    </SafeAreaView>
  );
}
