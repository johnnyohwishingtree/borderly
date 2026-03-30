import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors } from '../../utils/colors';
import { CREDENTIAL_PROMPT_IDS } from './testIDs';

export interface CredentialPromptProps {
  /** Whether the prompt is visible */
  visible: boolean;
  /** Human-readable portal name shown in the heading */
  portalName: string;
  /** Pre-filled username / email */
  initialUsername?: string;
  /**
   * Called when the user taps "Save".
   * The parent is responsible for persisting the credential via keychainService.
   */
  onSave: (username: string, password: string) => void;
  /** Called when the user taps "Skip" or dismisses the prompt */
  onSkip: () => void;
  /** Override the default title */
  title?: string;
  /** Override the default subtitle / explanation */
  subtitle?: string;
  testID?: string;
}

/**
 * CredentialPrompt — reusable modal for capturing portal login credentials.
 *
 * Used in two places:
 *  1. AccountSetupChecklist — after the user finishes portal account creation.
 *  2. PortalSubmissionScreen — after the user manually logs in to a portal.
 *
 * The component is intentionally presentational: it collects username + password
 * and hands them to the parent via `onSave`. Persistence (Keychain) is the
 * caller's responsibility.
 */
export function CredentialPrompt({
  visible,
  portalName,
  initialUsername = '',
  onSave,
  onSkip,
  title,
  subtitle,
  testID,
}: CredentialPromptProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset fields each time the prompt becomes visible or initialUsername changes
  useEffect(() => {
    if (visible) {
      setUsername(initialUsername);
      setPassword('');
      setShowPassword(false);
    }
  }, [visible, initialUsername]);

  const canSave = username.trim().length > 0 && password.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(username.trim(), password);
  };

  const resolvedTitle = title ?? 'Save login credentials?';
  const resolvedSubtitle =
    subtitle ??
    `Borderly can remember your ${portalName} login so you never have to type it again. Credentials are stored securely on this device with biometric protection.`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onSkip}
      testID={testID ?? CREDENTIAL_PROMPT_IDS.modal.id}
    >
      <View className="flex-1">
        {/* Tap-outside-to-dismiss overlay */}
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onSkip}
          testID={CREDENTIAL_PROMPT_IDS.backdrop.id}
          accessibilityLabel="Dismiss credential prompt"
        />

        {/* Bottom sheet */}
        <View
          className="bg-white rounded-t-2xl px-5 pt-4 pb-8 shadow-lg elevation-8"
          testID={CREDENTIAL_PROMPT_IDS.sheet.id}
        >
          {/* Handle */}
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

          {/* Title */}
          <Text
            className="text-lg font-semibold text-gray-900 mb-1.5"
            testID={CREDENTIAL_PROMPT_IDS.title.id}
          >
            {resolvedTitle}
          </Text>

          {/* Subtitle */}
          <Text
            className="text-sm text-gray-500 leading-5 mb-5"
            testID={CREDENTIAL_PROMPT_IDS.subtitle.id}
          >
            {resolvedSubtitle}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={false}>
            {/* Username / email field */}
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Email / Username
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900 bg-gray-50"
                value={username}
                onChangeText={setUsername}
                placeholder="you@example.com"
                placeholderTextColor={colors.gray[400]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                testID={CREDENTIAL_PROMPT_IDS.username.id}
                accessibilityLabel="Email or username"
              />
            </View>

            {/* Password field */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Password
              </Text>
              <View className="relative">
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 pr-12 text-base text-gray-900 bg-gray-50"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.gray[400]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  testID={CREDENTIAL_PROMPT_IDS.password.id}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  className="absolute right-3 top-0 bottom-0 justify-center"
                  onPress={() => setShowPassword(s => !s)}
                  testID={CREDENTIAL_PROMPT_IDS.togglePassword.id}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text className="text-xs text-gray-500">
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-[10px] border border-gray-300 items-center"
                onPress={onSkip}
                testID={CREDENTIAL_PROMPT_IDS.skip.id}
                accessibilityLabel="Skip saving credentials"
              >
                <Text className="text-base font-medium text-gray-700">Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-[2] py-3 rounded-[10px] items-center ${canSave ? 'bg-blue-600' : 'bg-blue-300'}`}
                onPress={handleSave}
                disabled={!canSave}
                testID={CREDENTIAL_PROMPT_IDS.save.id}
                accessibilityLabel="Save credentials securely"
              >
                <Text className="text-base font-semibold text-white">
                  Save securely 🔒
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
