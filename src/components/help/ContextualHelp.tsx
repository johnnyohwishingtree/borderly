import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { CircleHelp, X } from 'lucide-react-native';
import { Button } from '@/components/ui';

interface HelpContent {
  title: string;
  description: string;
  tips?: string[];
  links?: Array<{
    title: string;
    action: () => void;
  }>;
}

interface ContextualHelpProps {
  content: HelpContent;
  variant?: 'icon' | 'text' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function ContextualHelp({
  content,
  variant = 'icon',
  size = 'medium',
  className = '',
}: ContextualHelpProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sizeConfig = {
    small: {
      iconSize: 16,
      buttonSize: 24,
      fontSize: 'text-xs',
      padding: 'p-1',
    },
    medium: {
      iconSize: 20,
      buttonSize: 32,
      fontSize: 'text-sm',
      padding: 'p-2',
    },
    large: {
      iconSize: 24,
      buttonSize: 40,
      fontSize: 'text-base',
      padding: 'p-3',
    },
  };

  const config = sizeConfig[size];

  const renderTrigger = () => {
    const baseClasses = `${config.padding} rounded-full bg-blue-100 border border-blue-200 ${className}`;
    
    switch (variant) {
      case 'text':
        return (
          <TouchableOpacity
            className={`${baseClasses} flex-row items-center space-x-1`}
            onPress={() => setIsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Get help"
            accessibilityHint={`Learn more about ${content.title}`}
          >
            <CircleHelp
              size={config.iconSize}
              color="#2563eb"
            />
            <Text className={`${config.fontSize} text-blue-700 font-medium`}>
              Help
            </Text>
          </TouchableOpacity>
        );
      case 'minimal':
        return (
          <TouchableOpacity
            className={`${config.padding}`}
            onPress={() => setIsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Get help"
            accessibilityHint={`Learn more about ${content.title}`}
          >
            <CircleHelp
              size={config.iconSize}
              color="#6b7280"
            />
          </TouchableOpacity>
        );
      default: // 'icon'
        return (
          <TouchableOpacity
            className={baseClasses}
            style={{ 
              width: config.buttonSize, 
              height: config.buttonSize,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={() => setIsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Get help"
            accessibilityHint={`Learn more about ${content.title}`}
          >
            <CircleHelp
              size={config.iconSize}
              color="#2563eb"
            />
          </TouchableOpacity>
        );
    }
  };

  const handleLinkPress = (action: () => void) => {
    setIsVisible(false);
    // Small delay to allow modal to close before navigation
    setTimeout(action, 150);
  };

  return (
    <>
      {renderTrigger()}
      
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-xl max-w-sm w-full max-h-4/5">
            <ScrollView className="p-6">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <CircleHelp size={24} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text className="text-lg font-semibold text-gray-900 flex-1">
                    {content.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsVisible(false)}
                  className="ml-2 p-1"
                  accessibilityRole="button"
                  accessibilityLabel="Close help"
                >
                  <X
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text className="text-base text-gray-700 leading-relaxed mb-4">
                {content.description}
              </Text>

              {/* Tips */}
              {content.tips && content.tips.length > 0 && (
                <View className="mb-4">
                  <Text className="text-base font-semibold text-gray-900 mb-2">
                    💡 Quick Tips:
                  </Text>
                  {content.tips.map((tip, index) => (
                    <View key={index} className="flex-row mb-2">
                      <Text className="text-blue-600 mr-2">•</Text>
                      <Text className="text-sm text-gray-700 flex-1">{tip}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Links */}
              {content.links && content.links.length > 0 && (
                <View className="space-y-2">
                  {content.links.map((link, index) => (
                    <Button
                      key={index}
                      title={link.title}
                      onPress={() => handleLinkPress(link.action)}
                      variant="outline"
                      size="small"
                      fullWidth
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View className="border-t border-gray-200 px-6 py-4">
              <Button
                title="Got it!"
                onPress={() => setIsVisible(false)}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Pre-defined help content for common scenarios
export const HelpContent = {
  passportScanning: {
    title: 'Passport Scanning',
    description: 'Scan the Machine Readable Zone (MRZ) at the bottom of your passport photo page. This contains two lines of text with your passport information.',
    tips: [
      'Ensure good lighting - natural light works best',
      'Hold your phone steady and align the MRZ within the frame',
      'Clean your camera lens for better text recognition',
      'If scanning fails, you can enter information manually'
    ],
    links: [
      {
        title: 'View scanning tutorial',
        action: () => Alert.alert('Tutorial', 'Video tutorial would open here')
      },
      {
        title: 'Troubleshooting guide',
        action: () => Alert.alert('Troubleshooting', 'This would navigate to troubleshooting')
      }
    ]
  },
  
  autoFill: {
    title: 'Smart Auto-Fill',
    description: 'Borderly automatically fills form fields using your passport and trip information. Only fields that need your input are shown.',
    tips: [
      'Green badges indicate auto-filled fields',
      'Some fields always require manual input (like purpose of visit)',
      'Country-specific fields must be completed for each destination',
      'Your data never leaves your device during auto-fill'
    ],
    links: [
      {
        title: 'Learn about Smart Delta',
        action: () => Alert.alert('Smart Delta', 'This would show more details')
      }
    ]
  },
  
  qrWallet: {
    title: 'QR Code Wallet',
    description: 'Save QR codes received from government portals after form submission. These codes are often needed for fast-track entry at airports.',
    tips: [
      'QR codes work offline once saved',
      'Tap any code to view full-screen for scanning',
      'Organize codes by country and trip',
      'Take screenshots as backup before traveling'
    ],
    links: [
      {
        title: 'How to save QR codes',
        action: () => Alert.alert('QR Saving', 'This would show QR saving guide')
      }
    ]
  },
  
  submissionGuide: {
    title: 'Submission Guide',
    description: 'Follow step-by-step instructions to submit your forms to government portals. Copy pre-filled data from Borderly and paste into the official website.',
    tips: [
      'Always use official government websites',
      'Copy data exactly as shown in Borderly',
      'Save any QR codes or confirmation numbers',
      'Submit forms well before your travel date'
    ],
    links: [
      {
        title: 'Portal requirements by country',
        action: () => Alert.alert('Requirements', 'This would show country-specific info')
      }
    ]
  },
  
  biometricSecurity: {
    title: 'Biometric Security',
    description: 'Enable Face ID, Touch ID, or PIN protection to secure your passport data. This adds an extra layer of security when accessing sensitive information.',
    tips: [
      'Required for accessing passport data',
      'App locks automatically after 5 minutes',
      'Data is encrypted and stored locally only',
      'Can be disabled in Settings if needed'
    ],
    links: [
      {
        title: 'Security & Privacy settings',
        action: () => Alert.alert('Settings', 'This would navigate to security settings')
      }
    ]
  },
  
  tripManagement: {
    title: 'Trip Management',
    description: 'Create trips with multiple destinations to generate country-specific forms. Add countries in the order you plan to visit them.',
    tips: [
      'Add destinations in travel order',
      'Set accurate arrival/departure dates',
      'Each country generates its own form',
      'Edit trip details anytime before submission'
    ],
    links: [
      {
        title: 'Supported countries',
        action: () => Alert.alert('Countries', 'This would show supported countries list')
      }
    ]
  },
};