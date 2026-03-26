import { useState, useMemo, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  TROUBLESHOOTING_ITEMS,
  CATEGORIES,
  TroubleshootingItem,
  TroubleshootingCategory,
} from '@/screens/help/TroubleshootingScreen/troubleshootingData';

export interface UseTroubleshootingScreenReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  expandedIssue: string | null;
  filteredIssues: TroubleshootingItem[];
  categories: TroubleshootingCategory[];
  toggleIssue: (issueId: string) => void;
  clearSearch: () => void;
  handleContactSupport: () => void;
}

export function filterIssues(
  items: TroubleshootingItem[],
  searchTerm: string,
  category: string,
): TroubleshootingItem[] {
  return items.filter(issue => {
    const matchesCategory = category === 'all' || issue.category === category;
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      issue.problem.toLowerCase().includes(lowerSearch) ||
      issue.symptoms.some(s => s.toLowerCase().includes(lowerSearch)) ||
      issue.solutions.some(s => s.toLowerCase().includes(lowerSearch)) ||
      issue.tags.some(t => t.toLowerCase().includes(lowerSearch));

    return matchesCategory && matchesSearch;
  });
}

export function useTroubleshootingScreen(): UseTroubleshootingScreenReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const filteredIssues = useMemo(
    () => filterIssues(TROUBLESHOOTING_ITEMS, searchTerm, selectedCategory),
    [searchTerm, selectedCategory],
  );

  const toggleIssue = useCallback(
    (issueId: string) => {
      setExpandedIssue(prev => (prev === issueId ? null : issueId));
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
  }, []);

  const handleContactSupport = useCallback(() => {
    Alert.alert(
      'Contact Support',
      'If these solutions don\'t resolve your issue:',
      [
        { text: 'Send Feedback', onPress: () => {} },
        { text: 'Report Bug', onPress: () => {} },
        {
          text: 'Email Support',
          onPress: () => {
            Linking.openURL('mailto:support@borderly.app?subject=Troubleshooting%20Support');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    expandedIssue,
    filteredIssues,
    categories: CATEGORIES,
    toggleIssue,
    clearSearch,
    handleContactSupport,
  };
}

export default useTroubleshootingScreen;
