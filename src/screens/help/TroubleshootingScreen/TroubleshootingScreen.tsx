import { View, Text, ScrollView, TextInput } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Button, Card, StatusBadge, ScreenContainer } from '@/components/ui';
import HelpHint from '@/components/ui/HelpHint';
import { useTroubleshootingScreen } from '@/hooks/useTroubleshootingScreen';
import { TroubleshootingItem } from './troubleshootingData';

interface TroubleshootingScreenProps {
  route?: RouteProp<any, any>;
}

const SEVERITY_CONFIG = {
  low: { status: 'success' as const, text: 'Low Priority' },
  medium: { status: 'warning' as const, text: 'Medium Priority' },
  high: { status: 'error' as const, text: 'High Priority' },
  critical: { status: 'error' as const, text: 'Critical' },
};

function SeverityBadge({ severity }: { severity: TroubleshootingItem['severity'] }) {
  const config = SEVERITY_CONFIG[severity];
  return <StatusBadge status={config.status} size="small" text={config.text} />;
}

export default function TroubleshootingScreen({ route: _route }: TroubleshootingScreenProps) {
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    expandedIssue,
    filteredIssues,
    categories,
    toggleIssue,
    clearSearch,
    handleContactSupport,
  } = useTroubleshootingScreen();

  return (
    <ScreenContainer className="bg-gray-50">
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Troubleshooting Guide</Text>
          <Text className="text-base text-gray-600">Solve common issues and problems</Text>
        </View>

        <HelpHint
          title="Travel Emergency"
          content="If you're having urgent issues while traveling, contact your embassy and use official government websites directly. Borderly is a form assistant tool - always have backup documentation."
          variant="warning"
        />

        {/* Search */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-3">Search Issues</Text>
          <View className="space-y-3">
            <View className="relative">
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Describe your problem or search symptoms..."
                className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-white"
                accessibilityLabel="Search troubleshooting issues"
                accessibilityHint="Type keywords to search for solutions to common problems"
              />
              {searchTerm.length > 0 && (
                <View className="absolute right-2 top-2">
                  <Button title="Clear" onPress={clearSearch} variant="secondary" size="small" />
                </View>
              )}
            </View>
            {searchTerm.length > 0 && (
              <StatusBadge
                status="info"
                size="small"
                text={`Found ${filteredIssues.length} solutions for "${searchTerm}"`}
              />
            )}
          </View>
        </Card>

        {/* Category Filter */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Issue Categories</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map(cat => (
              <Button
                key={cat.value}
                title={cat.label}
                onPress={() => setSelectedCategory(cat.value)}
                variant={selectedCategory === cat.value ? 'primary' : 'secondary'}
                size="small"
              />
            ))}
          </View>
        </Card>

        {/* Issues List */}
        <Card>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Common Issues</Text>
            <StatusBadge status="info" size="small" text={`${filteredIssues.length} issues`} />
          </View>

          {filteredIssues.length === 0 ? (
            <View className="bg-gray-50 p-6 rounded-lg text-center">
              <Text className="text-lg text-gray-600 mb-2">No issues found</Text>
              <Text className="text-sm text-gray-500 mb-4">Try different search terms or browse categories</Text>
              <Button title="Clear Search" onPress={clearSearch} variant="secondary" size="small" />
            </View>
          ) : (
            <View className="space-y-3">
              {filteredIssues.map(issue => (
                <View key={issue.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <View className="p-4 bg-white">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-semibold text-gray-900 flex-1 mr-3">{issue.problem}</Text>
                      <SeverityBadge severity={issue.severity} />
                    </View>
                    <Button
                      title={expandedIssue === issue.id ? 'Hide Solutions' : 'Show Solutions'}
                      onPress={() => toggleIssue(issue.id)}
                      variant="secondary"
                      size="small"
                      fullWidth
                    />
                  </View>

                  {expandedIssue === issue.id && (
                    <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      <View className="mb-4">
                        <Text className="font-semibold text-gray-900 mb-2">Common Symptoms:</Text>
                        {issue.symptoms.map((symptom, i) => (
                          <Text key={i} className="text-sm text-gray-700 mb-1">• {symptom}</Text>
                        ))}
                      </View>
                      <View className="mb-4">
                        <Text className="font-semibold text-gray-900 mb-2">Solutions to Try:</Text>
                        {issue.solutions.map((solution, i) => (
                          <View key={i} className="flex-row mb-2">
                            <Text className="text-sm text-blue-600 mr-2">{i + 1}.</Text>
                            <Text className="text-sm text-gray-700 flex-1">{solution}</Text>
                          </View>
                        ))}
                      </View>
                      <View className="flex-row flex-wrap gap-1">
                        {issue.tags.map(tag => (
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

        {/* Additional Help */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Still Having Issues?</Text>
          <View className="space-y-3">
            <Button title="View FAQ" onPress={() => {}} variant="secondary" fullWidth />
            <Button title="User Guide" onPress={() => {}} variant="secondary" fullWidth />
            <Button title="Send Feedback" onPress={() => {}} variant="secondary" fullWidth />
            <Button title="Contact Support" onPress={handleContactSupport} variant="primary" fullWidth />
          </View>
        </Card>

        {/* Diagnostic Info */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">System Information</Text>
          <View className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-xs text-gray-600 mb-1">When contacting support, include:</Text>
            <Text className="text-xs text-gray-700 mb-1">• App version: 1.0.0 (MVP)</Text>
            <Text className="text-xs text-gray-700 mb-1">• Device model and OS version</Text>
            <Text className="text-xs text-gray-700 mb-1">• Steps to reproduce the issue</Text>
            <Text className="text-xs text-gray-700">• Screenshots (without personal data)</Text>
          </View>
        </Card>

        <View className="h-8" />
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
