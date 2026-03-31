/**
 * Tests for usePortalAutoFill hook.
 * Covers: initial state, auto-fill trigger, result handling, banner, dismissal.
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePortalAutoFill } from '@/hooks/usePortalAutoFill';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGenerateFilledForm = jest.fn().mockReturnValue({
  sections: [{ fields: [{ name: 'surname', required: true, source: 'profile', label: 'Surname' }] }],
});
const mockIsAutoFillSufficient = jest.fn().mockReturnValue(true);
const mockBuildFillData = jest.fn().mockReturnValue({ surname: 'Doe', givenNames: 'John' });
const mockBuildHeuristicFillScript = jest.fn().mockReturnValue('javascript:heuristicFill()');

jest.mock('@/services/submission/submissionCoordinator', () => ({
  submissionCoordinator: {
    generateFilledForm: (...args: unknown[]) => mockGenerateFilledForm(...args),
    isAutoFillSufficient: (...args: unknown[]) => mockIsAutoFillSufficient(...args),
  },
}));

jest.mock('@/services/submission/heuristicFiller', () => ({
  buildFillData: (...args: unknown[]) => mockBuildFillData(...args),
  buildHeuristicFillScript: (...args: unknown[]) => mockBuildHeuristicFillScript(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderAutoFill(overrides = {}) {
  const webViewRef = { current: { injectJavaScript: jest.fn() } };
  const lastUsedProfileRef = { current: '' };

  const defaultProps = {
    webViewRef,
    lastUsedProfileRef,
    schema: {
      countryCode: 'JPN',
      submissionGuide: [{ order: 1, title: 'Step 1' }],
      sections: [{ fields: [{ name: 'surname', required: true }] }],
    },
    leg: { id: 'leg-1', destinationCountry: 'JPN', formStatus: 'not_started' },
    effectiveProfile: { id: 'prof-1', surname: 'Doe', givenNames: 'John' },
    countryCode: 'JPN',
    selectedProfileId: 'prof-1',
    currentStep: 1,
    ...overrides,
  };

  return { ...renderHook(() => usePortalAutoFill(defaultProps as any)), webViewRef };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockBuildFillData.mockReturnValue({ surname: 'Doe', givenNames: 'John' });
  mockBuildHeuristicFillScript.mockReturnValue('javascript:heuristicFill()');
  mockGenerateFilledForm.mockReturnValue({
    sections: [{ fields: [{ name: 'surname', required: true, source: 'profile', label: 'Surname' }] }],
  });
});

describe('usePortalAutoFill', () => {
  describe('initial state', () => {
    it('starts with null banner and no low fill warning', () => {
      const { result } = renderAutoFill();

      expect(result.current.bannerState).toBeNull();
      expect(result.current.showLowFillWarning).toBe(false);
    });

    it('computes form completion status', () => {
      const { result } = renderAutoFill();

      expect(typeof result.current.isFormComplete).toBe('boolean');
      expect(Array.isArray(result.current.missingRequiredFields)).toBe(true);
    });
  });

  describe('handleAutoFill', () => {
    it('builds fill data from profile and leg then injects heuristic script', () => {
      const { result, webViewRef } = renderAutoFill();

      act(() => {
        result.current.handleAutoFill();
      });

      expect(mockBuildFillData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prof-1' }),
        expect.objectContaining({ id: 'leg-1' }),
      );
      expect(mockBuildHeuristicFillScript).toHaveBeenCalledWith({ surname: 'Doe', givenNames: 'John' });
      expect(webViewRef.current.injectJavaScript).toHaveBeenCalledWith('javascript:heuristicFill()');
    });

    it('does not inject when effectiveProfile is null', () => {
      const { result, webViewRef } = renderAutoFill({ effectiveProfile: null });

      act(() => {
        result.current.handleAutoFill();
      });

      expect(webViewRef.current.injectJavaScript).not.toHaveBeenCalled();
    });
  });

  describe('handleAutoFillResult', () => {
    it('updates banner state with fill counts', () => {
      const { result } = renderAutoFill();

      act(() => {
        result.current.handleAutoFillResult({
          total: 5,
          filled: 3,
          results: [
            { id: 'f1', filled: true },
            { id: 'f2', filled: true },
            { id: 'f3', filled: true },
            { id: 'f4', filled: false },
            { id: 'f5', filled: false },
          ],
        });
      });

      expect(result.current.bannerState).toMatchObject({ filled: 3, total: 5 });
    });

    it('ignores messages with zero total', () => {
      const { result } = renderAutoFill();

      act(() => {
        result.current.handleAutoFillResult({ total: 0, filled: 0, results: [] });
      });

      expect(result.current.bannerState).toBeNull();
    });
  });

  describe('dismissBanner', () => {
    it('clears the banner state', () => {
      const { result } = renderAutoFill();

      // Set banner
      act(() => {
        result.current.handleAutoFillResult({
          total: 2,
          filled: 1,
          results: [{ id: 'f1', filled: true }],
        });
      });
      expect(result.current.bannerState).toMatchObject({ filled: 1, total: 2 });

      // Dismiss
      act(() => {
        result.current.dismissBanner();
      });
      expect(result.current.bannerState).toBeNull();
    });
  });
});
