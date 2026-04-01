import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { CircleAlert } from 'lucide-react-native';
import { Button, Card, StatusBadge, ScreenContainer } from '@/components/ui';
import { SearchableHelp } from '@/components/help';
import { useHelpScreen } from '@/hooks/useHelpScreen';

interface HelpScreenProps {
  route?: RouteProp<any, any>;
}

export default function HelpScreen({ route: _route }: HelpScreenProps) {
  const navigation = useNavigation();
  const {
    search: { isSearchVisible, setIsSearchVisible, handleSearchNavigate },
    faq: { filteredFAQs, expandedFAQ, toggleFAQ },
    category: { selectedCategory, setSelectedCategory, categories },
    actions: { handleContactSupport, handleOpenDocumentation },
  } = useHelpScreen();

  return (
    <ScreenContainer className="bg-gray-50">
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
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
            variant="secondary"
            fullWidth
          />
        </Card>

        {/* Help Categories */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Help Categories</Text>

          <View className="space-y-3">
            <Button
              title="Frequently Asked Questions"
              onPress={() => (navigation as any).navigate('FAQ')}
              variant="secondary"
              fullWidth
            />
            <Button
              title="Troubleshooting Guide"
              onPress={() => (navigation as any).navigate('Troubleshooting')}
              variant="secondary"
              fullWidth
            />
            <Button
              title="User Guide"
              onPress={handleOpenDocumentation}
              variant="secondary"
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
              variant="secondary"
              fullWidth
            />
            <Button
              title="Report Bug"
              onPress={() => (navigation as any).navigate('BugReport')}
              variant="secondary"
              fullWidth
            />
            <Button
              title="Contact Support"
              onPress={() =>
                handleContactSupport({
                  onFeedback: () => (navigation as any).navigate('Feedback'),
                  onBugReport: () => (navigation as any).navigate('BugReport'),
                })
              }
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
                variant={selectedCategory === category.value ? "primary" : "secondary"}
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
              {filteredFAQs.map((faq) => (
                <View key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    title={`${expandedFAQ === faq.id ? '−' : '+'} ${faq.question}`}
                    onPress={() => toggleFAQ(faq.id)}
                    variant="secondary"
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
              • Contact your country's embassy or consulate{'\n'}
              • Use official government websites directly{'\n'}
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
            <Text className="text-xs font-medium text-green-800">Built for Privacy</Text>
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
        onNavigate={(type, id) =>
          handleSearchNavigate(type, id, {
            onFAQ: (faqId) => (navigation as any).navigate('FAQ', { highlightId: faqId }),
            onTroubleshooting: (tsId) => (navigation as any).navigate('Troubleshooting', { highlightId: tsId }),
          })
        }
      />
    </ScrollView>
    </ScreenContainer>
  );
}
