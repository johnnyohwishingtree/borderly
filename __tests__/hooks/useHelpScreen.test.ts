/**
 * Unit tests for useHelpScreen hook.
 *
 * Tests pure filter function directly and hook behavior via renderHook.
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { useHelpScreen, filterFAQs } from '@/hooks/useHelpScreen';
import { FAQ_DATA, HELP_CATEGORIES } from '@/screens/support/HelpScreen/helpData';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.spyOn(Alert, 'alert').mockImplementation(() => {});
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

jest.mock('../../src/constants/countries', () => ({
  formatSupportedCountryList: () => 'Japan, Malaysia, Singapore',
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── filterFAQs ────────────────────────────────────────────────────────────────

describe('filterFAQs', () => {
  it('returns all items when category is "all" and search is empty', () => {
    const result = filterFAQs(FAQ_DATA, '', 'all');
    expect(result.length).toBe(FAQ_DATA.length);
  });

  it('filters by category', () => {
    const result = filterFAQs(FAQ_DATA, '', 'security');
    expect(result.every(faq => faq.category === 'security')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('filters by search term in question', () => {
    const result = filterFAQs(FAQ_DATA, 'passport', 'all');
    expect(result.some(faq => faq.question.toLowerCase().includes('passport'))).toBe(true);
  });

  it('filters by search term in tags', () => {
    const result = filterFAQs(FAQ_DATA, 'mrz', 'all');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].tags).toContain('mrz');
  });

  it('filters by both category and search term', () => {
    const result = filterFAQs(FAQ_DATA, 'biometric', 'security');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(faq => faq.category === 'security')).toBe(true);
  });

  it('returns empty array when no matches', () => {
    const result = filterFAQs(FAQ_DATA, 'xyznonexistent', 'all');
    expect(result).toEqual([]);
  });
});

// ── useHelpScreen hook ────────────────────────────────────────────────────────

describe('useHelpScreen', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useHelpScreen());

    expect(result.current.selectedCategory).toBe('all');
    expect(result.current.expandedFAQ).toBeNull();
    expect(result.current.isSearchVisible).toBe(false);
    expect(result.current.filteredFAQs.length).toBe(FAQ_DATA.length);
    expect(result.current.categories).toBe(HELP_CATEGORIES);
  });

  it('filters FAQs when category changes', () => {
    const { result } = renderHook(() => useHelpScreen());

    act(() => {
      result.current.setSelectedCategory('security');
    });

    expect(result.current.filteredFAQs.every(faq => faq.category === 'security')).toBe(true);
    expect(result.current.filteredFAQs.length).toBeLessThan(FAQ_DATA.length);
  });

  it('toggleFAQ expands and collapses', () => {
    const { result } = renderHook(() => useHelpScreen());

    act(() => {
      result.current.toggleFAQ('faq-1');
    });
    expect(result.current.expandedFAQ).toBe('faq-1');

    act(() => {
      result.current.toggleFAQ('faq-1');
    });
    expect(result.current.expandedFAQ).toBeNull();
  });

  it('toggleFAQ switches to different FAQ', () => {
    const { result } = renderHook(() => useHelpScreen());

    act(() => {
      result.current.toggleFAQ('faq-1');
    });
    expect(result.current.expandedFAQ).toBe('faq-1');

    act(() => {
      result.current.toggleFAQ('faq-2');
    });
    expect(result.current.expandedFAQ).toBe('faq-2');
  });

  it('setIsSearchVisible toggles search modal', () => {
    const { result } = renderHook(() => useHelpScreen());

    act(() => {
      result.current.setIsSearchVisible(true);
    });
    expect(result.current.isSearchVisible).toBe(true);

    act(() => {
      result.current.setIsSearchVisible(false);
    });
    expect(result.current.isSearchVisible).toBe(false);
  });

  it('handleContactSupport shows alert with options', () => {
    const { result } = renderHook(() => useHelpScreen());
    const onFeedback = jest.fn();
    const onBugReport = jest.fn();

    act(() => {
      result.current.handleContactSupport({ onFeedback, onBugReport });
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Contact Support',
      'Choose how you would like to get help:',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Send Feedback' }),
        expect.objectContaining({ text: 'Report Bug' }),
        expect.objectContaining({ text: 'Email Support' }),
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      ]),
    );
  });

  it('handleContactSupport Send Feedback calls onFeedback', () => {
    const { result } = renderHook(() => useHelpScreen());
    const onFeedback = jest.fn();
    const onBugReport = jest.fn();

    act(() => {
      result.current.handleContactSupport({ onFeedback, onBugReport });
    });

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const feedbackButton = alertButtons.find((b: any) => b.text === 'Send Feedback');
    feedbackButton.onPress();

    expect(onFeedback).toHaveBeenCalled();
  });

  it('handleContactSupport Email Support opens mailto link', () => {
    const { result } = renderHook(() => useHelpScreen());

    act(() => {
      result.current.handleContactSupport({ onFeedback: jest.fn(), onBugReport: jest.fn() });
    });

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const emailButton = alertButtons.find((b: any) => b.text === 'Email Support');
    emailButton.onPress();

    expect(Linking.openURL).toHaveBeenCalledWith(
      'mailto:support@borderly.app?subject=Borderly%20Support%20Request',
    );
  });

  it('handleSearchNavigate calls onFAQ for faq type', () => {
    const { result } = renderHook(() => useHelpScreen());
    const onFAQ = jest.fn();
    const onTroubleshooting = jest.fn();

    act(() => {
      result.current.handleSearchNavigate('faq', 'faq-1', { onFAQ, onTroubleshooting });
    });

    expect(onFAQ).toHaveBeenCalledWith('faq-1');
    expect(onTroubleshooting).not.toHaveBeenCalled();
  });

  it('handleSearchNavigate calls onTroubleshooting for troubleshooting type', () => {
    const { result } = renderHook(() => useHelpScreen());
    const onFAQ = jest.fn();
    const onTroubleshooting = jest.fn();

    act(() => {
      result.current.handleSearchNavigate('troubleshooting', 'ts-1', { onFAQ, onTroubleshooting });
    });

    expect(onTroubleshooting).toHaveBeenCalledWith('ts-1');
    expect(onFAQ).not.toHaveBeenCalled();
  });

  it('handleOpenDocumentation shows coming soon alert', () => {
    const { result } = renderHook(() => useHelpScreen());

    act(() => {
      result.current.handleOpenDocumentation();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'User Guide',
      'The detailed user guide and documentation will be available in a future update.',
      [{ text: 'OK' }],
    );
  });
});
