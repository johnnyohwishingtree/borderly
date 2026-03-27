import { useState, useMemo, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  FAQ_DATA,
  HELP_CATEGORIES,
  FAQItem,
  HelpCategory,
} from '@/screens/support/HelpScreen/helpData';

export interface UseHelpScreenReturn {
  search: {
    searchTerm: string;
    isSearchVisible: boolean;
    setIsSearchVisible: (visible: boolean) => void;
    handleSearchNavigate: (type: string, id: string, callbacks: SearchNavigateCallbacks) => void;
  };
  faq: {
    filteredFAQs: FAQItem[];
    expandedFAQ: string | null;
    toggleFAQ: (faqId: string) => void;
  };
  category: {
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    categories: HelpCategory[];
  };
  actions: {
    handleContactSupport: (callbacks: ContactSupportCallbacks) => void;
    handleOpenDocumentation: () => void;
  };
}

export interface ContactSupportCallbacks {
  onFeedback: () => void;
  onBugReport: () => void;
}

export interface SearchNavigateCallbacks {
  onFAQ: (id: string) => void;
  onTroubleshooting: (id: string) => void;
}

export function filterFAQs(
  items: FAQItem[],
  searchTerm: string,
  category: string,
): FAQItem[] {
  return items.filter(faq => {
    const matchesCategory = category === 'all' || faq.category === category;
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      faq.question.toLowerCase().includes(lowerSearch) ||
      faq.answer.toLowerCase().includes(lowerSearch) ||
      faq.tags.some(tag => tag.toLowerCase().includes(lowerSearch));

    return matchesCategory && matchesSearch;
  });
}

export function useHelpScreen(): UseHelpScreenReturn {
  const [searchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const filteredFAQs = useMemo(
    () => filterFAQs(FAQ_DATA, searchTerm, selectedCategory),
    [searchTerm, selectedCategory],
  );

  const toggleFAQ = useCallback((faqId: string) => {
    setExpandedFAQ(prev => (prev === faqId ? null : faqId));
  }, []);

  const handleContactSupport = useCallback(
    (callbacks: ContactSupportCallbacks) => {
      Alert.alert(
        'Contact Support',
        'Choose how you would like to get help:',
        [
          { text: 'Send Feedback', onPress: callbacks.onFeedback },
          { text: 'Report Bug', onPress: callbacks.onBugReport },
          {
            text: 'Email Support',
            onPress: () => {
              Linking.openURL('mailto:support@borderly.app?subject=Borderly%20Support%20Request');
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    },
    [],
  );

  const handleSearchNavigate = useCallback(
    (type: string, id: string, callbacks: SearchNavigateCallbacks) => {
      if (type === 'faq') {
        callbacks.onFAQ(id);
      } else if (type === 'troubleshooting') {
        callbacks.onTroubleshooting(id);
      }
    },
    [],
  );

  const handleOpenDocumentation = useCallback(() => {
    Alert.alert(
      'User Guide',
      'The detailed user guide and documentation will be available in a future update.',
      [{ text: 'OK' }],
    );
  }, []);

  return {
    search: {
      searchTerm,
      isSearchVisible,
      setIsSearchVisible,
      handleSearchNavigate,
    },
    faq: {
      filteredFAQs,
      expandedFAQ,
      toggleFAQ,
    },
    category: {
      selectedCategory,
      setSelectedCategory,
      categories: HELP_CATEGORIES,
    },
    actions: {
      handleContactSupport,
      handleOpenDocumentation,
    },
  };
}

export default useHelpScreen;
