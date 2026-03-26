/**
 * Unit tests for useTroubleshootingScreen hook.
 *
 * Tests search/filter logic directly via the exported filterIssues function
 * and hook behavior via renderHook.
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import {
  useTroubleshootingScreen,
  filterIssues,
} from '@/hooks/useTroubleshootingScreen';
import { TROUBLESHOOTING_ITEMS, CATEGORIES } from '@/screens/help/TroubleshootingScreen/troubleshootingData';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.spyOn(Alert, 'alert').mockImplementation(() => {});
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

beforeEach(() => {
  jest.clearAllMocks();
});

// ── filterIssues ──────────────────────────────────────────────────────────────

describe('filterIssues', () => {
  it('returns all items when no filter is applied', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, '', 'all');
    expect(result).toHaveLength(TROUBLESHOOTING_ITEMS.length);
  });

  it('filters by category', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, '', 'passport');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('passport');
  });

  it('filters by search term in problem text', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'passport', 'all');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(i => i.problem.toLowerCase().includes('passport'))).toBe(true);
  });

  it('filters by search term in symptoms', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'Camera won\'t focus', 'all');
    expect(result.length).toBeGreaterThan(0);
  });

  it('filters by search term in solutions', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'Clean your camera lens', 'all');
    expect(result.length).toBeGreaterThan(0);
  });

  it('filters by search term in tags', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'mrz', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('trouble-1');
  });

  it('combines category and search filters', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'crash', 'performance');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('trouble-2');
  });

  it('returns empty array when nothing matches', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'xyznonexistent', 'all');
    expect(result).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const result = filterIssues(TROUBLESHOOTING_ITEMS, 'PASSPORT', 'all');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── useTroubleshootingScreen hook ─────────────────────────────────────────────

describe('useTroubleshootingScreen', () => {
  it('returns all issues initially', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());
    expect(result.current.filteredIssues).toHaveLength(TROUBLESHOOTING_ITEMS.length);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.selectedCategory).toBe('all');
  });

  it('returns categories', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());
    expect(result.current.categories).toEqual(CATEGORIES);
  });

  it('filters when search term changes', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    act(() => {
      result.current.setSearchTerm('passport');
    });

    expect(result.current.filteredIssues.length).toBeLessThan(TROUBLESHOOTING_ITEMS.length);
    expect(result.current.searchTerm).toBe('passport');
  });

  it('filters when category changes', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    act(() => {
      result.current.setSelectedCategory('security');
    });

    expect(result.current.filteredIssues).toHaveLength(1);
    expect(result.current.selectedCategory).toBe('security');
  });

  it('toggleIssue expands and collapses', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    expect(result.current.expandedIssue).toBeNull();

    act(() => {
      result.current.toggleIssue('trouble-1');
    });
    expect(result.current.expandedIssue).toBe('trouble-1');

    act(() => {
      result.current.toggleIssue('trouble-1');
    });
    expect(result.current.expandedIssue).toBeNull();
  });

  it('toggleIssue switches to different issue', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    act(() => {
      result.current.toggleIssue('trouble-1');
    });
    expect(result.current.expandedIssue).toBe('trouble-1');

    act(() => {
      result.current.toggleIssue('trouble-2');
    });
    expect(result.current.expandedIssue).toBe('trouble-2');
  });

  it('clearSearch resets search and category', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    act(() => {
      result.current.setSearchTerm('passport');
      result.current.setSelectedCategory('security');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.selectedCategory).toBe('all');
    expect(result.current.filteredIssues).toHaveLength(TROUBLESHOOTING_ITEMS.length);
  });

  it('handleContactSupport shows alert with options', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    act(() => {
      result.current.handleContactSupport();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Contact Support',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Email Support' }),
        expect.objectContaining({ text: 'Cancel' }),
      ]),
    );
  });

  it('Email Support option opens mailto link', () => {
    const { result } = renderHook(() => useTroubleshootingScreen());

    act(() => {
      result.current.handleContactSupport();
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const emailBtn = buttons.find(b => b.text === 'Email Support');
    emailBtn?.onPress?.();

    expect(Linking.openURL).toHaveBeenCalledWith(
      'mailto:support@borderly.app?subject=Troubleshooting%20Support',
    );
  });
});
