import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { Button, Card, StatusBadge } from '@/components/ui';
import HelpHint from '@/components/ui/HelpHint';

interface TroubleshootingScreenProps {
  route?: RouteProp<any, any>;
}

interface TroubleshootingItem {
  id: string;
  problem: string;
  symptoms: string[];
  solutions: string[];
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export default function TroubleshootingScreen({ route: _route }: TroubleshootingScreenProps) {
  useNavigation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const troubleshootingData: TroubleshootingItem[] = [
    {
      id: 'trouble-1',
      problem: 'Passport scanning not working',
      symptoms: ['Camera won\'t focus', 'No text detected', 'Wrong data extracted'],
      solutions: [
        'Ensure good lighting - use natural light or bright room lighting',
        'Clean your camera lens with a soft cloth',
        'Hold phone steady and align MRZ lines within the frame',
        'Try different angles - slightly tilt the passport',
        'Check passport condition - ensure MRZ text is not damaged or worn',
        'If scanning continues to fail, tap "Enter Manually" to input data by hand'
      ],
      category: 'passport',
      severity: 'high',
      tags: ['passport', 'scanning', 'camera', 'mrz', 'detection'],
    },
    {
      id: 'trouble-2',
      problem: 'App crashes on startup',
      symptoms: ['App closes immediately', 'Black screen on launch', 'Error messages'],
      solutions: [
        'Force close the app completely and restart',
        'Restart your device',
        'Check available storage space (need at least 100MB free)',
        'Update to the latest app version if available',
        'Check if biometric authentication is working on your device',
        'If problem persists, try clearing app cache in device settings'
      ],
      category: 'performance',
      severity: 'critical',
      tags: ['crash', 'startup', 'launch', 'error'],
    },
    {
      id: 'trouble-3',
      problem: 'Form auto-fill not working correctly',
      symptoms: ['Fields remain empty', 'Wrong data in fields', 'Partial auto-fill'],
      solutions: [
        'Check that your profile is complete in Profile → Edit Profile',
        'Verify passport data was scanned or entered correctly',
        'Update trip dates and destinations in trip details',
        'Some fields are intentionally left empty as they require manual input',
        'Clear app cache and restart the app',
        'Re-scan passport if multiple fields are incorrect'
      ],
      category: 'forms',
      severity: 'medium',
      tags: ['autofill', 'forms', 'profile', 'data'],
    },
    {
      id: 'trouble-4',
      problem: 'Cannot save or scan QR codes',
      symptoms: ['QR scanner won\'t open', 'Saved QR codes don\'t appear', 'Camera permission denied'],
      solutions: [
        'Check camera permissions in device settings',
        'Ensure QR code is clear and well-lit when scanning',
        'Try manual entry instead of scanning',
        'Restart the app if camera is unresponsive',
        'Verify sufficient storage space for saving QR codes',
        'Check that QR code format is supported (most standard formats work)'
      ],
      category: 'qr',
      severity: 'medium',
      tags: ['qr', 'camera', 'permissions', 'scanning', 'saving'],
    },
    {
      id: 'trouble-5',
      problem: 'Biometric authentication fails',
      symptoms: ['Face ID not working', 'Touch ID fails', 'Keeps asking for PIN'],
      solutions: [
        'Check that biometric authentication is set up in device settings',
        'Try using alternative authentication method (PIN/password)',
        'Restart the app and try again',
        'Re-enable biometric authentication in Settings → Security & Privacy',
        'Ensure your face/finger is clean and properly positioned',
        'If problem persists, disable and re-enable biometric authentication'
      ],
      category: 'security',
      severity: 'high',
      tags: ['biometric', 'faceid', 'touchid', 'authentication', 'security'],
    },
    {
      id: 'trouble-6',
      problem: 'App running very slowly',
      symptoms: ['Long loading times', 'Laggy scrolling', 'Delayed responses'],
      solutions: [
        'Close other apps to free up device memory',
        'Clear app cache in Settings → Data Management',
        'Restart the app completely',
        'Check available device storage (need at least 500MB free)',
        'Update to latest app version',
        'Restart your device if performance is still poor'
      ],
      category: 'performance',
      severity: 'low',
      tags: ['performance', 'slow', 'memory', 'cache', 'storage'],
    },
    {
      id: 'trouble-7',
      problem: 'Government portal submission errors',
      symptoms: ['Portal shows validation errors', 'Data not accepted', 'Submission fails'],
      solutions: [
        'Double-check all copied data for accuracy',
        'Verify date formats match portal requirements (usually YYYY-MM-DD)',
        'Ensure all required fields are completed',
        'Check passport expiry date is more than 6 months from travel',
        'Try submitting during off-peak hours for better portal performance',
        'Always verify requirements on official government websites'
      ],
      category: 'submission',
      severity: 'high',
      tags: ['submission', 'portal', 'government', 'validation', 'errors'],
    },
    {
      id: 'trouble-8',
      problem: 'Data sync or loss issues',
      symptoms: ['Profile data missing', 'Trips disappeared', 'QR codes lost'],
      solutions: [
        'Data is stored locally - if device is reset, data may be lost',
        'Check if data is temporarily hidden due to biometric lock',
        'Try unlocking with biometric authentication',
        'If data was accidentally deleted, it cannot be recovered',
        'Regularly export your data through Settings → Privacy → Export Data',
        'Consider taking screenshots of important information as backup'
      ],
      category: 'data',
      severity: 'critical',
      tags: ['data', 'loss', 'sync', 'backup', 'recovery'],
    },
    {
      id: 'trouble-9',
      problem: 'Internet connectivity issues',
      symptoms: ['Portal won\'t load', 'Submission fails', 'No network error'],
      solutions: [
        'Borderly works offline - internet is only needed for government portals',
        'Check your internet connection',
        'Try switching between WiFi and mobile data',
        'Government portals may be temporarily down - try again later',
        'Use VPN if accessing portals from abroad',
        'Verify portal URLs are correct and official'
      ],
      category: 'network',
      severity: 'medium',
      tags: ['internet', 'connectivity', 'portal', 'network', 'offline'],
    },
    {
      id: 'trouble-10',
      problem: 'App won\'t open government portals',
      symptoms: ['Portal links don\'t work', 'Browser won\'t open', 'Submission guide errors'],
      solutions: [
        'Check if default browser is set correctly',
        'Try copying portal URL and opening manually',
        'Ensure portal is available in your region',
        'Some portals have geographic restrictions',
        'Clear browser cache and try again',
        'Try different browser if available'
      ],
      category: 'portal',
      severity: 'medium',
      tags: ['portal', 'browser', 'links', 'submission', 'access'],
    },
  ];

  const categories = [
    { label: 'All Issues', value: 'all' },
    { label: 'Passport Scanning', value: 'passport' },
    { label: 'App Performance', value: 'performance' },
    { label: 'Forms & Auto-fill', value: 'forms' },
    { label: 'QR Codes', value: 'qr' },
    { label: 'Security & Biometrics', value: 'security' },
    { label: 'Government Portals', value: 'submission' },
    { label: 'Data & Sync', value: 'data' },
    { label: 'Network Issues', value: 'network' },
  ];

  const filteredIssues = troubleshootingData.filter(issue => {
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      issue.problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.symptoms.some(symptom => symptom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      issue.solutions.some(solution => solution.toLowerCase().includes(searchTerm.toLowerCase())) ||
      issue.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const toggleIssue = (issueId: string) => {
    setExpandedIssue(expandedIssue === issueId ? null : issueId);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'If these solutions don\'t resolve your issue:',
      [
        {
          text: 'Send Feedback',
          onPress: () => {
            // Navigate to feedback screen
          },
        },
        {
          text: 'Report Bug',
          onPress: () => {
            // Navigate to bug report screen
          },
        },
        {
          text: 'Email Support',
          onPress: () => {
            Linking.openURL('mailto:support@borderly.app?subject=Troubleshooting%20Support');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { status: 'success' as const, text: 'Low Priority' },
      medium: { status: 'warning' as const, text: 'Medium Priority' },
      high: { status: 'error' as const, text: 'High Priority' },
      critical: { status: 'error' as const, text: 'Critical' },
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig];
    return <StatusBadge status={config.status} size="small" text={config.text} />;
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Troubleshooting Guide</Text>
          <Text className="text-base text-gray-600">Solve common issues and problems</Text>
        </View>

        {/* Emergency Notice */}
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
                  <Button
                    title="Clear"
                    onPress={clearSearch}
                    variant="outline"
                    size="small"
                  />
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
        </Card>

        {/* Issues List */}
        <Card>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Common Issues</Text>
            <StatusBadge 
              status="info" 
              size="small" 
              text={`${filteredIssues.length} issues`} 
            />
          </View>

          {filteredIssues.length === 0 ? (
            <View className="bg-gray-50 p-6 rounded-lg text-center">
              <Text className="text-lg text-gray-600 mb-2">No issues found</Text>
              <Text className="text-sm text-gray-500 mb-4">
                Try different search terms or browse categories
              </Text>
              <Button
                title="Clear Search"
                onPress={clearSearch}
                variant="outline"
                size="small"
              />
            </View>
          ) : (
            <View className="space-y-3">
              {filteredIssues.map((issue) => (
                <View key={issue.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <View className="p-4 bg-white">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-semibold text-gray-900 flex-1 mr-3">{issue.problem}</Text>
                      {getSeverityBadge(issue.severity)}
                    </View>
                    
                    <Button
                      title={expandedIssue === issue.id ? 'Hide Solutions' : 'Show Solutions'}
                      onPress={() => toggleIssue(issue.id)}
                      variant="outline"
                      size="small"
                      fullWidth
                    />
                  </View>
                  
                  {expandedIssue === issue.id && (
                    <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      {/* Symptoms */}
                      <View className="mb-4">
                        <Text className="font-semibold text-gray-900 mb-2">Common Symptoms:</Text>
                        {issue.symptoms.map((symptom, index) => (
                          <Text key={index} className="text-sm text-gray-700 mb-1">
                            • {symptom}
                          </Text>
                        ))}
                      </View>

                      {/* Solutions */}
                      <View className="mb-4">
                        <Text className="font-semibold text-gray-900 mb-2">Solutions to Try:</Text>
                        {issue.solutions.map((solution, index) => (
                          <View key={index} className="flex-row mb-2">
                            <Text className="text-sm text-blue-600 mr-2">{index + 1}.</Text>
                            <Text className="text-sm text-gray-700 flex-1">{solution}</Text>
                          </View>
                        ))}
                      </View>
                      
                      {/* Tags */}
                      <View className="flex-row flex-wrap gap-1">
                        {issue.tags.map((tag) => (
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
            <Button
              title="📘 View FAQ"
              onPress={() => {
                // Navigate to FAQ screen
              }}
              variant="outline"
              fullWidth
            />
            <Button
              title="📚 User Guide"
              onPress={() => {
                // Navigate to user guide
              }}
              variant="outline"
              fullWidth
            />
            <Button
              title="💬 Send Feedback"
              onPress={() => {
                // Navigate to feedback screen
              }}
              variant="outline"
              fullWidth
            />
            <Button
              title="🆘 Contact Support"
              onPress={handleContactSupport}
              variant="primary"
              fullWidth
            />
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

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}