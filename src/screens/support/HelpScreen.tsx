import { useState } from 'react';
import { View, Text, ScrollView, Alert, Linking } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { CircleAlert } from 'lucide-react-native';
import { Button, Card, StatusBadge } from '@/components/ui';
import { SearchableHelp } from '@/components/help';

interface HelpScreenProps {
  route?: RouteProp<any, any>;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

export default function HelpScreen({ route: _route }: HelpScreenProps) {
  const navigation = useNavigation();
  const [searchTerm, _setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);

  const faqData: FAQItem[] = [
    {
      id: 'faq-1',
      question: 'How do I scan my passport?',
      answer: 'Go to Profile → Edit Profile and tap "Scan Passport". Point your camera at the bottom of your passport where the two-line code (MRZ) is located. Make sure the text is clear and well-lit.',
      category: 'passport',
      tags: ['passport', 'scan', 'mrz', 'camera'],
    },
    {
      id: 'faq-2',
      question: 'Which countries are supported?',
      answer: 'Borderly currently supports Japan, Malaysia, and Singapore. These countries cover common Asia travel corridors. More countries will be added in future updates.',
      category: 'countries',
      tags: ['countries', 'japan', 'malaysia', 'singapore', 'supported'],
    },
    {
      id: 'faq-3',
      question: 'Is my passport data secure?',
      answer: 'Yes! Your passport data is stored locally on your device using the secure OS Keychain. It never leaves your device unless you explicitly share it. No cloud storage or server sync is used.',
      category: 'security',
      tags: ['security', 'privacy', 'keychain', 'local', 'data'],
    },
    {
      id: 'faq-4',
      question: 'How do I create a trip?',
      answer: 'Go to the Trips tab and tap "Create Trip". Add your destinations in order, select dates, and the app will generate the required forms for each country.',
      category: 'trips',
      tags: ['trips', 'create', 'destinations', 'forms'],
    },
    {
      id: 'faq-5',
      question: 'What if a form field is not auto-filled?',
      answer: 'Some fields require manual input as they are country-specific or not available in your passport. The app shows you only the fields that need your attention.',
      category: 'forms',
      tags: ['forms', 'autofill', 'manual', 'fields'],
    },
    {
      id: 'faq-6',
      question: 'How do I submit forms to government portals?',
      answer: 'After filling out a form, use the Submission Guide feature. It provides step-by-step instructions and pre-filled values you can copy and paste into the official government website.',
      category: 'submission',
      tags: ['submission', 'government', 'portal', 'copy', 'paste'],
    },
    {
      id: 'faq-7',
      question: 'What are QR codes for?',
      answer: 'After submitting forms to government portals, you often receive QR codes for entry. Save these in your QR Wallet for easy access at borders and airports.',
      category: 'qr',
      tags: ['qr', 'codes', 'wallet', 'entry', 'borders'],
    },
    {
      id: 'faq-8',
      question: 'Can I use the app offline?',
      answer: 'Yes! Borderly is designed to work offline. All your data and country schemas are stored locally. You only need internet when accessing government portals for submission.',
      category: 'offline',
      tags: ['offline', 'internet', 'local', 'schemas'],
    },
    {
      id: 'faq-9',
      question: 'How do I enable biometric authentication?',
      answer: 'Go to Settings → Security & Privacy → Biometric Authentication. This adds an extra layer of security when viewing passport data.',
      category: 'security',
      tags: ['biometric', 'authentication', 'settings', 'security'],
    },
    {
      id: 'faq-10',
      question: 'The app is running slowly. What can I do?',
      answer: 'Go to Settings → Data Management → Clear Cache. This will remove temporary files and improve performance. Your profile and trip data will not be affected.',
      category: 'performance',
      tags: ['performance', 'slow', 'cache', 'clear'],
    },
  ];

  const categories = [
    { label: 'All Topics', value: 'all' },
    { label: 'Passport & Scanning', value: 'passport' },
    { label: 'Security & Privacy', value: 'security' },
    { label: 'Trips & Countries', value: 'trips' },
    { label: 'Forms & Submission', value: 'forms' },
    { label: 'QR Codes', value: 'qr' },
    { label: 'Performance', value: 'performance' },
  ];

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you would like to get help:',
      [
        {
          text: 'Send Feedback',
          onPress: () => {
            (navigation as any).navigate('Feedback');
          },
        },
        {
          text: 'Report Bug',
          onPress: () => {
            (navigation as any).navigate('BugReport');
          },
        },
        {
          text: 'Email Support',
          onPress: () => {
            Linking.openURL('mailto:support@borderly.app?subject=Borderly%20Support%20Request');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSearchNavigate = (type: string, id: string) => {
    if (type === 'faq') {
      // Navigate to FAQ screen with specific item
      (navigation as any).navigate('FAQ', { highlightId: id });
    } else if (type === 'troubleshooting') {
      // Navigate to troubleshooting screen with specific item
      (navigation as any).navigate('Troubleshooting', { highlightId: id });
    }
  };

  const handleNavigateToFAQ = () => {
    (navigation as any).navigate('FAQ');
  };

  const handleNavigateToTroubleshooting = () => {
    (navigation as any).navigate('Troubleshooting');
  };

  const handleOpenDocumentation = () => {
    Alert.alert(
      'User Guide',
      'The detailed user guide and documentation will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Help & Support</Text>
          <Text className="text-base text-gray-600">Find answers and get assistance</Text>
        </View>

        {/* Search Help */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-3">Search Help</Text>
          <Text className="text-sm text-gray-600 mb-4">
            Find answers quickly with our comprehensive search
          </Text>
          <Button
            title="Search All Help Topics"
            onPress={() => setIsSearchVisible(true)}
            variant="primary"
            fullWidth
          />
        </Card>

        {/* Help Categories */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Help Categories</Text>
          
          <View className="space-y-3">
            <Button
              title="Frequently Asked Questions"
              onPress={handleNavigateToFAQ}
              variant="outline"
              fullWidth
            />
            <Button
              title="Troubleshooting Guide"
              onPress={handleNavigateToTroubleshooting}
              variant="outline"
              fullWidth
            />
            <Button
              title="User Guide"
              onPress={handleOpenDocumentation}
              variant="outline"
              fullWidth
            />
          </View>
        </Card>

        {/* Contact & Support */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Contact & Support</Text>
          
          <View className="space-y-3">
            <Button
              title="Send Feedback"
              onPress={() => (navigation as any).navigate('Feedback')}
              variant="outline"
              fullWidth
            />
            <Button
              title="Report Bug"
              onPress={() => (navigation as any).navigate('BugReport')}
              variant="outline"
              fullWidth
            />
            <Button
              title="Contact Support"
              onPress={handleContactSupport}
              variant="primary"
              fullWidth
            />
          </View>
        </Card>

        {/* Category Filter */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</Text>
          
          <View className="flex-row flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.value}
                title={category.label}
                onPress={() => setSelectedCategory(category.value)}
                variant={selectedCategory === category.value ? "primary" : "outline"}
                size="small"
              />
            ))}
          </View>
          
          {selectedCategory !== 'all' && (
            <View className="mt-3">
              <StatusBadge 
                status="info" 
                size="small" 
                text={`Showing ${categories.find(c => c.value === selectedCategory)?.label} questions`} 
              />
            </View>
          )}
        </Card>

        {/* FAQ Section */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Frequently Asked Questions</Text>
            <StatusBadge 
              status="info" 
              size="small" 
              text={`${filteredFAQs.length} questions`} 
            />
          </View>

          {filteredFAQs.length === 0 ? (
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="text-center text-gray-600">No questions found for this category.</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredFAQs.map((faq, _index) => (
                <View key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    title={`${expandedFAQ === faq.id ? '−' : '+'} ${faq.question}`}
                    onPress={() => toggleFAQ(faq.id)}
                    variant="outline"
                    fullWidth
                  />
                  
                  {expandedFAQ === faq.id && (
                    <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      <Text className="text-sm text-gray-700 leading-relaxed">
                        {faq.answer}
                      </Text>
                      
                      <View className="flex-row flex-wrap gap-1 mt-3">
                        {faq.tags.map((tag) => (
                          <View key={tag} className="bg-blue-100 px-2 py-1 rounded">
                            <Text className="text-xs text-blue-700">#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Emergency Contact */}
        <Card>
          <View className="bg-red-50 p-4 rounded-lg">
            <View className="flex-row items-center mb-2">
              <CircleAlert size={20} color="#7f1d1d" />
              <Text className="text-base font-semibold text-red-900 ml-2">Emergency Travel Support</Text>
            </View>
            <Text className="text-sm text-red-800 mb-3">
              If you're having urgent issues while traveling:
            </Text>
            <Text className="text-xs text-red-700 mb-3">
              • Contact your country's embassy or consulate
              • Use official government websites directly
              • Keep physical copies of important documents
            </Text>
            <Text className="text-xs text-red-600">
              Borderly is a form assistant tool - always have backup documentation for travel.
            </Text>
          </View>
        </Card>

        {/* App Info */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">App Information</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Version:</Text>
              <Text className="text-sm text-gray-900">1.0.0 (MVP)</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Supported Countries:</Text>
              <Text className="text-sm text-gray-900">🇯🇵 🇲🇾 🇸🇬</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Privacy:</Text>
              <Text className="text-sm text-gray-900">Local-first, No cloud sync</Text>
            </View>
          </View>
          
          <View className="bg-green-50 p-3 rounded-lg mt-4">
            <Text className="text-xs font-medium text-green-800">💚 Built for Privacy</Text>
            <Text className="text-xs text-green-700 mt-1">
              Your travel data never leaves your device unless you share it
            </Text>
          </View>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
      
      {/* Searchable Help Modal */}
      <SearchableHelp
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        onNavigate={handleSearchNavigate}
      />
    </ScrollView>
  );
}