import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';

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

  // Reset fields each time the prompt becomes visible
  const handleVisible = (isVisible: boolean) => {
    if (isVisible) {
      setUsername(initialUsername);
      setPassword('');
      setShowPassword(false);
    }
  };

  // Trigger field reset when `visible` flips to true (controlled externally)
  // We use a simple approach: reset when visible changes to true
  if (visible && username === '' && initialUsername !== '') {
    setUsername(initialUsername);
  }

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
      onShow={() => handleVisible(true)}
      testID={testID ?? 'credential-prompt-modal'}
    >
      <View style={{ flex: 1 }}>
        {/* Tap-outside-to-dismiss overlay */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onSkip}
          testID="credential-prompt-backdrop"
          accessibilityLabel="Dismiss credential prompt"
        />

        {/* Bottom sheet */}
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}
          testID="credential-prompt-sheet"
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#D1D5DB',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />

          {/* Title */}
          <Text
            style={{ fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 6 }}
            testID="credential-prompt-title"
          >
            {resolvedTitle}
          </Text>

          {/* Subtitle */}
          <Text
            style={{ fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 20 }}
            testID="credential-prompt-subtitle"
          >
            {resolvedSubtitle}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={false}>
            {/* Username / email field */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 }}
              >
                Email / Username
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: '#111827',
                  backgroundColor: '#F9FAFB',
                }}
                value={username}
                onChangeText={setUsername}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                testID="credential-prompt-username"
                accessibilityLabel="Email or username"
              />
            </View>

            {/* Password field */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 }}
              >
                Password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    paddingRight: 50,
                    fontSize: 15,
                    color: '#111827',
                    backgroundColor: '#F9FAFB',
                  }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  testID="credential-prompt-password"
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                  }}
                  onPress={() => setShowPassword(s => !s)}
                  testID="credential-prompt-toggle-password"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  alignItems: 'center',
                }}
                onPress={onSkip}
                testID="credential-prompt-skip"
                accessibilityLabel="Skip saving credentials"
              >
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#374151' }}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: canSave ? '#2563EB' : '#93C5FD',
                  alignItems: 'center',
                }}
                onPress={handleSave}
                disabled={!canSave}
                testID="credential-prompt-save"
                accessibilityLabel="Save credentials securely"
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
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
