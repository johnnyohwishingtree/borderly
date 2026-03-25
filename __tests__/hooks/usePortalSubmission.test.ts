/**
 * Unit tests for usePortalSubmission hook.
 *
 * Tests business logic via renderHook — no full React Native component rendering
 * needed. Since this hook has many dependencies, we focus on initial state,
 * simple state toggles, webViewRef method delegation, and navigation callbacks.
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePortalSubmission } from '@/hooks/usePortalSubmission';

// ── Navigation mock ──────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const ROUTE_PARAMS = {
  url: 'https://example.com',
  countryCode: 'JPN',
  tripId: 'trip_1',
  legId: 'leg_1',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: ROUTE_PARAMS,
  }),
}));

// ── Store mocks ──────────────────────────────────────────────────────────────

const mockAddQRCode = jest.fn().mockResolvedValue(undefined);
const mockMarkLegAsSubmitted = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/stores', () => ({
  useTripStore: () => ({
    trips: [
      {
        id: 'trip_1',
        name: 'Test Trip',
        legs: [
          {
            id: 'leg_1',
            tripId: 'trip_1',
            destinationCountry: 'JPN',
            arrivalDate: '2026-04-01',
            departureDate: '2026-04-10',
            flightNumber: 'NH123',
            formStatus: 'not_started',
            submissionStatus: 'not_started',
            order: 0,
            assignedTravelers: ['profile_primary'],
            travelerFormsData: [],
          },
        ],
      },
    ],
    addQRCode: mockAddQRCode,
    markLegAsSubmitted: mockMarkLegAsSubmitted,
  }),
}));

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    profile: {
      givenNames: 'John',
      surname: 'Doe',
      email: 'john@example.com',
    },
    familyProfiles: {
      primaryProfileId: 'profile_primary',
    },
  }),
}));

// ── Service mocks ────────────────────────────────────────────────────────────

jest.mock('../../src/services/schemas/schemaRegistry', () => ({
  getSchemaByCountryCode: () => ({
    countryCode: 'JPN',
    submissionGuide: [
      { title: 'Step 1', fieldsOnThisScreen: [] },
      { title: 'Step 2', fieldsOnThisScreen: [] },
    ],
  }),
}));

jest.mock('../../src/services/submission/submissionCoordinator', () => ({
  submissionCoordinator: {
    generateFilledForm: jest.fn(() => null),
    detectStep: jest.fn(() => -1),
    detectPageType: jest.fn(() => 'unknown'),
    getPageTypeCheckScript: jest.fn(() => ''),
    getQRDetectionScript: jest.fn(() => null),
  },
}));

jest.mock('../../src/utils/countryUtils', () => ({
  getPortalName: jest.fn((code: string) => `${code} Portal`),
}));

jest.mock('../../src/utils/fieldFormatters', () => ({
  formatFieldValue: jest.fn((val: string) => val),
}));

jest.mock('../../src/services/forms/formEngine', () => ({}));

jest.mock('../../src/app/navigation/types', () => ({}));

// ── Sub-hook mocks ───────────────────────────────────────────────────────────

const mockResetForNewPage = jest.fn();
const mockAttemptAutoLogin = jest.fn();
const mockHandleAutoLoginResult = jest.fn();
const mockHandleExtractedUsername = jest.fn();
const mockCheckAuthToFormTransition = jest.fn();

jest.mock('../../src/hooks/usePortalProfiles', () => ({
  usePortalProfiles: () => ({
    availableProfiles: [],
    selectedProfileId: 'profile_primary',
    effectiveProfile: null,
    lastUsedProfileRef: { current: null },
    handleProfileChange: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/useLoadTimeout', () => ({
  useLoadTimeout: () => ({
    loadError: null,
    startTimer: jest.fn(),
    onLoadComplete: jest.fn(),
    onWebViewError: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/usePortalAutoLogin', () => ({
  usePortalAutoLogin: () => ({
    resetForNewPage: mockResetForNewPage,
    attemptAutoLogin: mockAttemptAutoLogin,
    handleAutoLoginResult: mockHandleAutoLoginResult,
    handleExtractedUsername: mockHandleExtractedUsername,
    checkAuthToFormTransition: mockCheckAuthToFormTransition,
    prevPageTypeRef: { current: 'unknown' },
  }),
}));

const mockHandleAutoFill = jest.fn();
const mockHandleAutoFillResult = jest.fn();

jest.mock('../../src/hooks/usePortalAutoFill', () => ({
  usePortalAutoFill: () => ({
    isFormComplete: false,
    handleAutoFill: mockHandleAutoFill,
    handleAutoFillResult: mockHandleAutoFillResult,
  }),
}));

// ── Component mock (PortalWebView types) ─────────────────────────────────────

jest.mock('../../src/components/submission/PortalWebView', () => ({}));
jest.mock('../../src/components/submission/QRSaveOverlay', () => ({}));

// ── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Initial state ────────────────────────────────────────────────────────────

describe('usePortalSubmission — initial state', () => {
  it('returns route params from navigation', () => {
    const { result } = renderHook(() => usePortalSubmission());

    expect(result.current.url).toBe('https://example.com');
    expect(result.current.countryCode).toBe('JPN');
    expect(result.current.tripId).toBe('trip_1');
    expect(result.current.legId).toBe('leg_1');
  });

  it('initialises navState with url from route and loading true', () => {
    const { result } = renderHook(() => usePortalSubmission());

    expect(result.current.navState).toEqual({
      url: 'https://example.com',
      loading: true,
      canGoBack: false,
      canGoForward: false,
    });
  });

  it('initialises currentStep to 1', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.currentStep).toBe(1);
  });

  it('initialises isPanelOpen to false', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.isPanelOpen).toBe(false);
  });

  it('initialises showIncompleteMessage to false', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.showIncompleteMessage).toBe(false);
  });

  it('initialises qrPayload to null', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.qrPayload).toBeNull();
  });

  it('initialises pageType to unknown', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.pageType).toBe('unknown');
  });

  it('initialises pillDismissed to false', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.pillDismissed).toBe(false);
  });

  it('provides a webViewRef', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.webViewRef).toBeDefined();
    expect(result.current.webViewRef.current).toBeNull();
  });

  it('computes totalSteps from schema submissionGuide length', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.totalSteps).toBe(2);
  });

  it('computes progressPercent from currentStep and totalSteps', () => {
    const { result } = renderHook(() => usePortalSubmission());
    // currentStep=1, totalSteps=2 => 50%
    expect(result.current.progressPercent).toBe(50);
  });
});

// ── togglePanel ──────────────────────────────────────────────────────────────

describe('usePortalSubmission — togglePanel', () => {
  it('toggles isPanelOpen from false to true', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => {
      result.current.togglePanel();
    });

    expect(result.current.isPanelOpen).toBe(true);
  });

  it('toggles isPanelOpen back to false on second call', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => { result.current.togglePanel(); });
    act(() => { result.current.togglePanel(); });

    expect(result.current.isPanelOpen).toBe(false);
  });
});

// ── dismissPill ──────────────────────────────────────────────────────────────

describe('usePortalSubmission — dismissPill', () => {
  it('sets pillDismissed to true', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => {
      result.current.dismissPill();
    });

    expect(result.current.pillDismissed).toBe(true);
  });
});

// ── dismissQrPayload ─────────────────────────────────────────────────────────

describe('usePortalSubmission — dismissQrPayload', () => {
  it('sets qrPayload to null', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => {
      result.current.dismissQrPayload();
    });

    expect(result.current.qrPayload).toBeNull();
  });
});

// ── WebView navigation callbacks ─────────────────────────────────────────────

describe('usePortalSubmission — webview controls', () => {
  it('handleGoBack injects history.back script', () => {
    const { result } = renderHook(() => usePortalSubmission());
    const mockInjectJS = jest.fn();

    // Attach mock to webViewRef
    (result.current.webViewRef as React.MutableRefObject<any>).current = {
      injectJavaScript: mockInjectJS,
    };

    act(() => {
      result.current.handleGoBack();
    });

    expect(mockInjectJS).toHaveBeenCalledWith('window.history.back(); true;');
  });

  it('handleGoForward injects history.forward script', () => {
    const { result } = renderHook(() => usePortalSubmission());
    const mockInjectJS = jest.fn();

    (result.current.webViewRef as React.MutableRefObject<any>).current = {
      injectJavaScript: mockInjectJS,
    };

    act(() => {
      result.current.handleGoForward();
    });

    expect(mockInjectJS).toHaveBeenCalledWith('window.history.forward(); true;');
  });

  it('handleRefresh injects location.reload script', () => {
    const { result } = renderHook(() => usePortalSubmission());
    const mockInjectJS = jest.fn();

    (result.current.webViewRef as React.MutableRefObject<any>).current = {
      injectJavaScript: mockInjectJS,
    };

    act(() => {
      result.current.handleRefresh();
    });

    expect(mockInjectJS).toHaveBeenCalledWith('window.location.reload(); true;');
  });

  it('handleGoBack does not throw when webViewRef is null', () => {
    const { result } = renderHook(() => usePortalSubmission());

    expect(() => {
      act(() => { result.current.handleGoBack(); });
    }).not.toThrow();
  });

  it('handleGoForward does not throw when webViewRef is null', () => {
    const { result } = renderHook(() => usePortalSubmission());

    expect(() => {
      act(() => { result.current.handleGoForward(); });
    }).not.toThrow();
  });

  it('handleRefresh does not throw when webViewRef is null', () => {
    const { result } = renderHook(() => usePortalSubmission());

    expect(() => {
      act(() => { result.current.handleRefresh(); });
    }).not.toThrow();
  });
});

// ── handleClose ──────────────────────────────────────────────────────────────

describe('usePortalSubmission — handleClose', () => {
  it('navigates to TripDetail with the current tripId', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => {
      result.current.handleClose();
    });

    expect(mockNavigate).toHaveBeenCalledWith('TripDetail', { tripId: 'trip_1' });
  });
});

// ── handleContinueManually ───────────────────────────────────────────────────

describe('usePortalSubmission — handleContinueManually', () => {
  it('navigates to SubmissionGuide with legId and tripId', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => {
      result.current.handleContinueManually();
    });

    expect(mockNavigate).toHaveBeenCalledWith('SubmissionGuide', {
      legId: 'leg_1',
      tripId: 'trip_1',
    });
  });
});

// ── handleNavigationChange ───────────────────────────────────────────────────

describe('usePortalSubmission — handleNavigationChange', () => {
  it('updates navState with the provided state', () => {
    const { result } = renderHook(() => usePortalSubmission());

    const newState = {
      url: 'https://example.com/page2',
      loading: false,
      canGoBack: true,
      canGoForward: false,
    };

    act(() => {
      result.current.handleNavigationChange(newState);
    });

    expect(result.current.navState).toEqual(newState);
  });

  it('resets pageType and pillDismissed when URL changes', () => {
    const { result } = renderHook(() => usePortalSubmission());

    // First, set pillDismissed to true
    act(() => { result.current.dismissPill(); });
    expect(result.current.pillDismissed).toBe(true);

    // Navigate to a new URL
    act(() => {
      result.current.handleNavigationChange({
        url: 'https://example.com/new-page',
        loading: false,
        canGoBack: true,
        canGoForward: false,
      });
    });

    expect(result.current.pillDismissed).toBe(false);
    expect(result.current.pageType).toBe('unknown');
    expect(mockResetForNewPage).toHaveBeenCalled();
  });

  it('does not reset when URL stays the same', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => { result.current.dismissPill(); });

    act(() => {
      result.current.handleNavigationChange({
        url: 'https://example.com',
        loading: false,
        canGoBack: false,
        canGoForward: false,
      });
    });

    // pillDismissed should remain true since URL did not change
    expect(result.current.pillDismissed).toBe(true);
  });
});

// ── handleOpenWallet ─────────────────────────────────────────────────────────

describe('usePortalSubmission — handleOpenWallet', () => {
  it('clears qrPayload and navigates to Wallet', () => {
    const { result } = renderHook(() => usePortalSubmission());

    act(() => {
      result.current.handleOpenWallet();
    });

    expect(result.current.qrPayload).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Wallet' });
  });
});

// ── Sub-hook values are exposed ──────────────────────────────────────────────

describe('usePortalSubmission — sub-hook exposure', () => {
  it('exposes availableProfiles from usePortalProfiles', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.availableProfiles).toEqual([]);
  });

  it('exposes selectedProfileId from usePortalProfiles', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.selectedProfileId).toBe('profile_primary');
  });

  it('exposes loadError from useLoadTimeout', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.loadError).toBeNull();
  });

  it('exposes schema from schemaRegistry', () => {
    const { result } = renderHook(() => usePortalSubmission());
    expect(result.current.schema).toBeDefined();
    expect(result.current.schema?.countryCode).toBe('JPN');
  });
});
