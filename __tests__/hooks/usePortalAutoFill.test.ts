/**
 * Tests for usePortalAutoFill hook.
 * Covers: initial state, auto-fill trigger, result handling, banner, dismissal.
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePortalAutoFill } from '@/hooks/usePortalAutoFill';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBuildAutoFillSpecs = jest.fn().mockReturnValue([]);
const mockBuildAutoFillScript = jest.fn().mockReturnValue('javascript:void(0)');
const mockGenerateFilledForm = jest.fn().mockReturnValue({
  sections: [{ fields: [{ name: 'surname', required: true, source: 'profile', label: 'Surname' }] }],
});
const mockIsAutoFillSufficient = jest.fn().mockReturnValue(true);

jest.mock('@/services/submission/submissionCoordinator', () => ({
  submissionCoordinator: {
    buildAutoFillSpecs: (...args: unknown[]) => mockBuildAutoFillSpecs(...args),
    buildAutoFillScript: (...args: unknown[]) => mockBuildAutoFillScript(...args),
    generateFilledForm: (...args: unknown[]) => mockGenerateFilledForm(...args),
    isAutoFillSufficient: (...args: unknown[]) => mockIsAutoFillSufficient(...args),
  },
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
  mockBuildAutoFillSpecs.mockReturnValue([]);
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
    it('calls buildAutoFillSpecs with schema, leg, and profile', () => {
      mockBuildAutoFillSpecs.mockReturnValue([{ field: 'surname', value: 'Doe' }]);

      const { result } = renderAutoFill();

      act(() => {
        result.current.handleAutoFill();
      });

      expect(mockBuildAutoFillSpecs).toHaveBeenCalled();
    });

    it('injects script when specs are non-empty', () => {
      mockBuildAutoFillSpecs.mockReturnValue([{ field: 'surname', value: 'Doe' }]);
      mockBuildAutoFillScript.mockReturnValue('javascript:fillFields()');

      const { result, webViewRef } = renderAutoFill();

      act(() => {
        result.current.handleAutoFill();
      });

      expect(webViewRef.current.injectJavaScript).toHaveBeenCalledWith('javascript:fillFields()');
    });

    it('does not inject when schema is null', () => {
      const { result, webViewRef } = renderAutoFill({ schema: null });

      act(() => {
        result.current.handleAutoFill();
      });

      expect(webViewRef.current.injectJavaScript).not.toHaveBeenCalled();
    });

    it('does not inject when specs are empty', () => {
      mockBuildAutoFillSpecs.mockReturnValue([]);

      const { result, webViewRef } = renderAutoFill();

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

      expect(result.current.bannerState).toBeDefined();
      expect(result.current.bannerState?.filled).toBe(3);
      expect(result.current.bannerState?.total).toBe(5);
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
      expect(result.current.bannerState).not.toBeNull();

      // Dismiss
      act(() => {
        result.current.dismissBanner();
      });
      expect(result.current.bannerState).toBeNull();
    });
  });
});
