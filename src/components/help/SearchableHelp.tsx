import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import React from 'react';
import { X, Search, SearchX, TrendingUp, CircleHelp, BookOpen, Wrench, Info } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { formatSupportedCountryList } from '@/constants/countries';
import { Button, Card, StatusBadge } from '@/components/ui';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  type: 'faq' | 'guide' | 'troubleshooting';
  relevanceScore: number;
  tags: string[];
}

interface SearchableHelpProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate?: (type: string, id: string) => void;
}

// Comprehensive help database (static — defined outside component to keep referentially stable)
const helpDatabase: SearchResult[] = [
    // FAQ items
    {
      id: 'faq-passport-scan',
      title: 'How do I scan my passport?',
      content: 'Go to Profile → Edit Profile and tap "Scan Passport". Point your camera at the bottom of your passport where the two-line code (MRZ) is located. Make sure the text is clear and well-lit.',
      category: 'passport',
      type: 'faq',
      relevanceScore: 0,
      tags: ['passport', 'scan', 'mrz', 'camera', 'profile'],
    },
    {
      id: 'faq-countries',
      title: 'Which countries are supported?',
      content: `Borderly currently supports ${formatSupportedCountryList()}. These countries cover popular travel corridors across Asia, North America, and Europe.`,
      category: 'countries',
      type: 'faq',
      relevanceScore: 0,
      tags: ['countries', 'japan', 'malaysia', 'singapore', 'supported'],
    },
    {
      id: 'faq-security',
      title: 'Is my passport data secure?',
      content: 'Yes! Your passport data is stored locally on your device using the secure OS Keychain. It never leaves your device unless you explicitly share it. No cloud storage or server sync is used.',
      category: 'security',
      type: 'faq',
      relevanceScore: 0,
      tags: ['security', 'privacy', 'keychain', 'local', 'data'],
    },
    {
      id: 'faq-trip-create',
      title: 'How do I create a trip?',
      content: 'Go to the Trips tab and tap "Create Trip". Add your destinations in order, select dates, and the app will generate the required forms for each country.',
      category: 'trips',
      type: 'faq',
      relevanceScore: 0,
      tags: ['trips', 'create', 'destinations', 'forms'],
    },
    {
      id: 'faq-autofill',
      title: 'What if a form field is not auto-filled?',
      content: 'Some fields require manual input as they are country-specific or not available in your passport. The app shows you only the fields that need your attention.',
      category: 'forms',
      type: 'faq',
      relevanceScore: 0,
      tags: ['forms', 'autofill', 'manual', 'fields'],
    },
    // Troubleshooting items
    {
      id: 'trouble-passport-scan',
      title: 'Passport scanning not working',
      content: 'Ensure good lighting, clean camera lens, hold phone steady, try different angles. If scanning continues to fail, tap "Enter Manually".',
      category: 'passport',
      type: 'troubleshooting',
      relevanceScore: 0,
      tags: ['passport', 'scanning', 'camera', 'mrz', 'detection', 'problem'],
    },
    {
      id: 'trouble-app-crash',
      title: 'App crashes on startup',
      content: 'Force close the app, restart device, check storage space, update app, check biometric authentication, clear app cache.',
      category: 'performance',
      type: 'troubleshooting',
      relevanceScore: 0,
      tags: ['crash', 'startup', 'launch', 'error', 'performance'],
    },
    {
      id: 'trouble-autofill',
      title: 'Form auto-fill not working correctly',
      content: 'Check profile completeness, verify passport data, update trip dates, some fields require manual input, clear cache, re-scan passport.',
      category: 'forms',
      type: 'troubleshooting',
      relevanceScore: 0,
      tags: ['autofill', 'forms', 'profile', 'data', 'problem'],
    },
    {
      id: 'trouble-qr-codes',
      title: 'Cannot save or scan QR codes',
      content: 'Check camera permissions, ensure QR code is clear, try manual entry, restart app, verify storage space, check QR code format.',
      category: 'qr',
      type: 'troubleshooting',
      relevanceScore: 0,
      tags: ['qr', 'camera', 'permissions', 'scanning', 'saving', 'problem'],
    },
    // Guide items
    {
      id: 'guide-getting-started',
      title: 'Getting Started with Borderly',
      content: 'Welcome to Borderly! Start by scanning your passport, creating your profile, and setting up biometric security for your travel data.',
      category: 'onboarding',
      type: 'guide',
      relevanceScore: 0,
      tags: ['getting-started', 'onboarding', 'setup', 'welcome'],
    },
    {
      id: 'guide-japan-submission',
      title: 'Japan - Visit Japan Web Guide',
      content: 'Complete Japan form in app, use Submission Guide, copy pre-filled data to Visit Japan Web portal, save received QR codes for airport e-Gates.',
      category: 'submission',
      type: 'guide',
      relevanceScore: 0,
      tags: ['japan', 'visit-japan-web', 'submission', 'portal', 'qr'],
    },
    {
      id: 'guide-malaysia-submission',
      title: 'Malaysia - MDAC Guide',
      content: 'Complete Malaysia form, follow MDAC portal instructions, copy data from guided fields, submit and save confirmation codes.',
      category: 'submission',
      type: 'guide',
      relevanceScore: 0,
      tags: ['malaysia', 'mdac', 'submission', 'portal'],
    },
    {
      id: 'guide-singapore-submission',
      title: 'Singapore - SG Arrival Card Guide',
      content: 'Complete Singapore form, follow ICA portal instructions, use copyable fields, submit and save confirmation details.',
      category: 'submission',
      type: 'guide',
      relevanceScore: 0,
      tags: ['singapore', 'ica', 'arrival-card', 'submission', 'portal'],
    },
];

export default function SearchableHelp({
  isVisible,
  onClose,
  onNavigate,
}: SearchableHelpProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search function with fuzzy matching and relevance scoring
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    const searchResults = helpDatabase.map(item => {
      let score = 0;
      
      // Title matching (highest weight)
      const titleMatches = searchTerms.filter(term => 
        item.title.toLowerCase().includes(term)
      );
      score += titleMatches.length * 3;
      
      // Content matching
      const contentMatches = searchTerms.filter(term => 
        item.content.toLowerCase().includes(term)
      );
      score += contentMatches.length * 2;
      
      // Tag matching
      const tagMatches = searchTerms.filter(term => 
        item.tags.some(tag => tag.includes(term))
      );
      score += tagMatches.length * 1;
      
      // Category matching
      if (searchTerms.some(term => item.category.includes(term))) {
        score += 1;
      }
      
      return { ...item, relevanceScore: score };
    })
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10); // Limit to top 10 results
    
    setResults(searchResults);
  }, []);

  // Debounced search
  useEffect(() => {
    setIsSearching(true);
    const delayedSearch = setTimeout(() => {
      performSearch(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, performSearch]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    if (query.trim() && !recentSearches.includes(query.trim())) {
      setRecentSearches(prev => [query.trim(), ...prev.slice(0, 4)]);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    onNavigate?.(result.type, result.id);
    onClose();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
  };

  const getTypeIcon = (type: string): LucideIcon => {
    switch (type) {
      case 'faq': return CircleHelp;
      case 'guide': return BookOpen;
      case 'troubleshooting': return Wrench;
      default: return Info;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'faq': return '#3b82f6';
      case 'guide': return '#10b981';
      case 'troubleshooting': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={onClose}
              className="mr-4 p-2 -ml-2"
              accessibilityRole="button"
              accessibilityLabel="Close search"
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Search Help
            </Text>
          </View>
        </View>

        {/* Search Input */}
        <View className="bg-white px-4 py-4 border-b border-gray-200">
          <View className="relative">
            <Search size={20} color="#6b7280" style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }} />
            <TextInput
              value={searchTerm}
              onChangeText={handleSearch}
              placeholder="Search help topics, FAQs, guides..."
              className="border border-gray-300 rounded-lg pl-10 pr-12 py-3 text-base bg-gray-50"
              autoFocus
              accessibilityLabel="Search help content"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                className="absolute right-3 top-3 p-1"
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
          
          {searchTerm.length > 0 && (
            <View className="flex-row items-center mt-2">
              <StatusBadge 
                status={isSearching ? "warning" : "info"} 
                size="small" 
                text={isSearching ? "Searching..." : `${results.length} results`} 
              />
            </View>
          )}
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Recent Searches */}
          {searchTerm.length === 0 && recentSearches.length > 0 && (
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Recent Searches</Text>
              <View className="flex-row flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSearch(search)}
                    className="bg-gray-100 px-3 py-2 rounded-full"
                  >
                    <Text className="text-sm text-gray-700">{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Popular Topics */}
          {searchTerm.length === 0 && (
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Popular Topics</Text>
              <View className="space-y-2">
                {[
                  'How to scan passport',
                  'Create a trip',
                  'QR code wallet',
                  'Auto-fill not working',
                  'Security and privacy',
                  'Japan Visit Japan Web',
                ].map((topic, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSearch(topic)}
                    className="flex-row items-center py-2"
                  >
                    <TrendingUp size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text className="text-sm text-gray-700">{topic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <View className="space-y-3">
              {results.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  onPress={() => handleResultPress(result)}
                  className="bg-white p-4 rounded-lg border border-gray-200"
                  accessibilityRole="button"
                  accessibilityLabel={`View ${result.title}`}
                >
                  <View className="flex-row items-start">
                    {React.createElement(getTypeIcon(result.type), { size: 20, color: getTypeColor(result.type), style: { marginRight: 12, marginTop: 2 } })}
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="font-semibold text-gray-900 flex-1">
                          {result.title}
                        </Text>
                        <StatusBadge
                          status={result.type === 'faq' ? 'info' : result.type === 'guide' ? 'success' : 'warning'}
                          size="small"
                          text={result.type.toUpperCase()}
                        />
                      </View>
                      <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                        {result.content}
                      </Text>
                      <View className="flex-row flex-wrap gap-1">
                        {result.tags.slice(0, 3).map((tag) => (
                          <View key={tag} className="bg-gray-100 px-2 py-1 rounded">
                            <Text className="text-xs text-gray-600">#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* No Results */}
          {searchTerm.length > 0 && results.length === 0 && !isSearching && (
            <Card>
              <View className="text-center py-8">
                <SearchX size={48} color="#9ca3af" style={{ alignSelf: 'center', marginBottom: 16 }} />
                <Text className="text-lg text-gray-600 mb-2">No results found</Text>
                <Text className="text-sm text-gray-500 mb-4">
                  Try different keywords or browse categories
                </Text>
                <Button
                  title="Browse All Help"
                  onPress={() => {
                    onNavigate?.('help', 'main');
                    onClose();
                  }}
                  variant="outline"
                  size="small"
                />
              </View>
            </Card>
          )}

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
}