import { useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { Button, Card, StatusBadge } from '@/components/ui';

interface FAQScreenProps {
  route?: RouteProp<any, any>;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  videoUrl?: string;
}

export default function FAQScreen({ route: _route }: FAQScreenProps) {
  useNavigation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqData: FAQItem[] = [
    {
      id: 'faq-1',
      question: 'How do I scan my passport?',
      answer: 'Go to Profile → Edit Profile and tap "Scan Passport". Point your camera at the bottom of your passport where the two-line code (MRZ) is located. Make sure the text is clear and well-lit. The MRZ contains all your passport information in a standardized format.',
      category: 'passport',
      tags: ['passport', 'scan', 'mrz', 'camera'],
    },
    {
      id: 'faq-2',
      question: 'Which countries are supported?',
      answer: 'Borderly currently supports Japan (Visit Japan Web), Malaysia (MDAC), and Singapore (SG Arrival Card). These countries cover common Asia travel corridors. More countries including Thailand, Vietnam, Canada, UK, and USA will be added in future updates.',
      category: 'countries',
      tags: ['countries', 'japan', 'malaysia', 'singapore', 'supported'],
    },
    {
      id: 'faq-3',
      question: 'Is my passport data secure?',
      answer: 'Yes! Your passport data is stored locally on your device using the secure OS Keychain with biometric protection. It never leaves your device unless you explicitly share it. No cloud storage, server sync, or analytics capture your personal information.',
      category: 'security',
      tags: ['security', 'privacy', 'keychain', 'local', 'data'],
    },
    {
      id: 'faq-4',
      question: 'How do I create a trip?',
      answer: 'Go to the Trips tab and tap "Create Trip". Add your destinations in order, select arrival and departure dates for each country, and the app will generate the required forms for each destination automatically.',
      category: 'trips',
      tags: ['trips', 'create', 'destinations', 'forms'],
    },
    {
      id: 'faq-5',
      question: 'What if a form field is not auto-filled?',
      answer: 'Some fields require manual input as they are country-specific (like purpose of visit, accommodation details) or not available in your passport data. The app\'s Smart Delta feature only shows you the fields that need your attention.',
      category: 'forms',
      tags: ['forms', 'autofill', 'manual', 'fields', 'smart-delta'],
    },
    {
      id: 'faq-6',
      question: 'How do I submit forms to government portals?',
      answer: 'After filling out a form, use the Submission Guide feature. It provides step-by-step instructions with screenshots and pre-filled values you can copy and paste into the official government website. Each country has specific portal requirements.',
      category: 'submission',
      tags: ['submission', 'government', 'portal', 'copy', 'paste', 'guide'],
    },
    {
      id: 'faq-7',
      question: 'What are QR codes for?',
      answer: 'After submitting forms to government portals, you often receive QR codes for fast-track entry at airports. Save these in your QR Wallet for easy offline access at borders and immigration checkpoints.',
      category: 'qr',
      tags: ['qr', 'codes', 'wallet', 'entry', 'borders', 'immigration'],
    },
    {
      id: 'faq-8',
      question: 'Can I use the app offline?',
      answer: 'Yes! Borderly is designed to work completely offline. All your data, country schemas, and form logic are stored locally. You only need internet when accessing government portals for final submission.',
      category: 'offline',
      tags: ['offline', 'internet', 'local', 'schemas'],
    },
    {
      id: 'faq-9',
      question: 'How do I enable biometric authentication?',
      answer: 'During onboarding or in Settings → Security & Privacy → Biometric Authentication. This adds Face ID, Touch ID, or PIN protection when viewing passport data and accessing sensitive information.',
      category: 'security',
      tags: ['biometric', 'authentication', 'settings', 'security', 'faceid', 'touchid'],
    },
    {
      id: 'faq-10',
      question: 'The app is running slowly. What can I do?',
      answer: 'Go to Settings → Data Management → Clear Cache. This removes temporary files and improves performance. Your profile, trip data, and QR codes will not be affected. Also try closing other apps to free memory.',
      category: 'performance',
      tags: ['performance', 'slow', 'cache', 'clear', 'memory'],
    },
    {
      id: 'faq-11',
      question: 'Can I edit my passport information after scanning?',
      answer: 'Yes! After scanning, you can edit any field in the confirmation screen. You can also edit your profile anytime by going to Profile → Edit Profile. Changes will auto-fill in future forms.',
      category: 'passport',
      tags: ['passport', 'edit', 'profile', 'modify', 'update'],
    },
    {
      id: 'faq-12',
      question: 'What happens to my data if I lose my phone?',
      answer: 'Your data is stored locally and encrypted with your device\'s hardware security. If you lose your phone, your data is protected by biometric authentication and cannot be accessed without your permission. However, you\'ll need to re-enter your information on a new device.',
      category: 'security',
      tags: ['security', 'lost', 'phone', 'data', 'recovery', 'backup'],
    },
    {
      id: 'faq-13',
      question: 'How accurate is the auto-fill feature?',
      answer: 'Auto-fill is highly accurate for passport data (name, number, dates, nationality) and trip details (destinations, dates). Country-specific fields like accommodation and purpose of visit always require manual input as they\'re not in your passport.',
      category: 'forms',
      tags: ['autofill', 'accuracy', 'passport', 'data', 'manual'],
    },
    {
      id: 'faq-14',
      question: 'Can I share my forms with family members?',
      answer: 'Currently, Borderly is designed for individual use to maintain privacy and security. Each traveler should use their own device and profile. Family group management is planned for future updates.',
      category: 'sharing',
      tags: ['sharing', 'family', 'multiple', 'users', 'group'],
    },
    {
      id: 'faq-15',
      question: 'What if a government portal changes its requirements?',
      answer: 'Country schemas are updated regularly to match government portal changes. When available, app updates will include the latest requirements. Always verify requirements on official government websites before traveling.',
      category: 'updates',
      tags: ['updates', 'schemas', 'government', 'requirements', 'changes'],
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
    { label: 'Sharing & Updates', value: 'sharing' },
    { label: 'Offline Usage', value: 'offline' },
  ];

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory || faq.tags.includes(selectedCategory);
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Frequently Asked Questions</Text>
          <Text className="text-base text-gray-600">Search and browse common questions</Text>
        </View>

        {/* Search */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-3">Search FAQs</Text>
          
          <View className="space-y-3">
            <View className="relative">
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search questions, answers, or topics..."
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white"
                accessibilityLabel="Search FAQ"
                accessibilityHint="Type keywords to search frequently asked questions"
              />
              {searchTerm.length > 0 && (
                <Button
                  title="Clear"
                  onPress={clearSearch}
                  variant="outline"
                  size="small"
                  className="absolute right-2 top-2"
                />
              )}
            </View>
            
            {searchTerm.length > 0 && (
              <StatusBadge 
                status="info" 
                size="small" 
                text={`Found ${filteredFAQs.length} results for "${searchTerm}"`} 
              />
            )}
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

        {/* FAQ List */}
        <Card>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Questions</Text>
            <StatusBadge 
              status="info" 
              size="small" 
              text={`${filteredFAQs.length} of ${faqData.length}`} 
            />
          </View>

          {filteredFAQs.length === 0 ? (
            <View className="bg-gray-50 p-6 rounded-lg text-center">
              <Text className="text-lg text-gray-600 mb-2">No questions found</Text>
              <Text className="text-sm text-gray-500 mb-4">
                {searchTerm ? `Try different search terms or clear the search` : `No questions in this category`}
              </Text>
              {searchTerm && (
                <Button
                  title="Clear Search"
                  onPress={clearSearch}
                  variant="outline"
                  size="small"
                />
              )}
            </View>
          ) : (
            <View className="space-y-3">
              {filteredFAQs.map((faq, index) => (
                <View key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    title={`${expandedFAQ === faq.id ? '−' : '+'} ${faq.question}`}
                    onPress={() => toggleFAQ(faq.id)}
                    variant="outline"
                    fullWidth
                    className="text-left"
                  />
                  
                  {expandedFAQ === faq.id && (
                    <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      <Text className="text-sm text-gray-700 leading-relaxed mb-3">
                        {faq.answer}
                      </Text>
                      
                      <View className="flex-row flex-wrap gap-1">
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

        {/* Help Actions */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Still Need Help?</Text>
          
          <View className="space-y-3">
            <Button
              title="📘 View User Guide"
              onPress={() => {
                // This would navigate to user guide or open documentation
              }}
              variant="outline"
              fullWidth
            />
            <Button
              title="🔧 Troubleshooting"
              onPress={() => {
                // This would navigate to troubleshooting screen
              }}
              variant="outline"
              fullWidth
            />
            <Button
              title="💬 Send Feedback"
              onPress={() => {
                // This would navigate to feedback screen
              }}
              variant="outline"
              fullWidth
            />
            <Button
              title="🐛 Report Bug"
              onPress={() => {
                // This would navigate to bug report screen
              }}
              variant="primary"
              fullWidth
            />
          </View>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}