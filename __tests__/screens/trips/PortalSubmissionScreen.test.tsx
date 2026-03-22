/**
 * Unit tests for the form-completeness gating on PortalSubmissionScreen.
 *
 * Covers:
 * - isFormComplete / missingRequiredFields logic in usePortalAutoFill
 * - "Submit in App" button disabled (visual + a11y) when form incomplete
 * - Incomplete-form message shown on tap when fields are missing
 * - Button calls auto-fill when form is complete
 * - Message auto-dismisses after 3 seconds (timer)
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-native';

// ── Timer control ─────────────────────────────────────────────────────────────

jest.useFakeTimers();

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
  useRoute: jest.fn(() => ({
    params: {
      url: 'https://vjw-lp.digital.go.jp/en/',
      countryCode: 'JPN',
      tripId: 'trip-1',
      legId: 'leg-1',
    },
  })),
}));

jest.mock('@/services/submission/pageDetection', () => ({
  pageDetector: {
    isAuthPage: jest.fn(() => false),
    isCaptchaPage: jest.fn(() => false),
  },
}));

jest.mock('@/services/submission/credentialResolver', () => ({
  resolvePortalCredential: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/services/submission/autoLogin', () => ({
  buildLoginScript: jest.fn(() => 'login_script_stub'),
}));

jest.mock('@/components/submission/PortalWebView', () => {
  const { View } = require('react-native');
  return {
    PortalWebView: React.forwardRef((_props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn() }));
      return <View testID="portal-webview" />;
    }),
  };
});

jest.mock('@/components/submission/AutoFillBanner', () => {
  const { View } = require('react-native');
  return { AutoFillBanner: (props: any) => <View testID={props.testID ?? 'autofill-banner'} /> };
});

jest.mock('@/components/submission/QRSaveOverlay', () => {
  const { View } = require('react-native');
  return { QRSaveOverlay: () => <View testID="qr-save-overlay" /> };
});

jest.mock('@/components/submission/AutoFillPill', () => {
  const { View } = require('react-native');
  return { AutoFillPill: () => <View testID="autofill-pill" /> };
});

jest.mock('@/components/guide', () => {
  const { View } = require('react-native');
  return { CopyableField: () => <View /> };
});

jest.mock('@/utils/countryUtils', () => ({
  getPortalName: jest.fn(() => 'Visit Japan Web'),
}));

jest.mock('@/utils/fieldFormatters', () => ({
  formatFieldValue: jest.fn(() => ''),
}));

const mockSchema = {
  countryCode: 'JPN',
  portalName: 'Visit Japan Web',
  portalUrl: 'https://vjw-lp.digital.go.jp/en/',
  submissionGuide: [
    {
      title: 'Create account',
      automation: { url: 'https://vjw-lp.digital.go.jp/en/' },
      fieldsOnThisScreen: [],
    },
  ],
  portalFlow: {
    requiresAccount: true,
    familyPolicy: { type: 'companion', description: 'One account for all' },
    multiStep: true,
    canSaveProgress: true,
  },
};

jest.mock('@/services/schemas/schemaRegistry', () => ({
  getSchemaByCountryCode: jest.fn(() => mockSchema),
}));

// formEngine mock — controlled per test via generateFilledFormMock
const generateFilledFormMock = jest.fn();
jest.mock('@/services/forms/formEngine', () => ({
  generateFilledFormForTraveler: generateFilledFormMock,
}));

jest.mock('@/services/submission', () => ({
  automationScriptRegistry: { getScriptSync: jest.fn(() => null) },
  AutomationScriptUtils: { applyTransform: jest.fn() },
  formFiller: { isAutoFillSufficient: jest.fn(() => true) },
}));

jest.mock('@/services/automation/qrDetection', () => ({
  getQRDetectionScript: jest.fn(() => null),
}));

// submissionCoordinator mock — full manual mock so we control generateFilledForm
jest.mock('@/services/submission/submissionCoordinator', () => ({
  submissionCoordinator: {
    detectPageType: jest.fn(() => 'unknown'),
    detectStep: jest.fn(() => -1),
    getPageTypeCheckScript: jest.fn(() => 'page_type_script'),
    getQRDetectionScript: jest.fn(() => null),
    buildAutoFillSpecs: jest.fn(() => []),
    buildAutoFillScript: jest.fn(() => ''),
    isAutoFillSufficient: jest.fn(() => true),
    generateFilledForm: jest.fn(),
    resolveCredential: jest.fn(() => Promise.resolve(null)),
    buildLoginScript: jest.fn(() => 'login_script'),
    buildUsernameExtractionScript: jest.fn(() => 'extract_username_script'),
    storeCredential: jest.fn(() => Promise.resolve()),
  },
}));

// Store mocks — stable references to prevent re-render loops
jest.mock('@/stores', () => {
  const storeValue = {
    trips: [
      {
        id: 'trip-1',
        legs: [{ id: 'leg-1', destinationCountry: 'JPN', formData: { purposeOfVisit: 'tourism' } }],
      },
    ],
    addQRCode: jest.fn(),
    markLegAsSubmitted: jest.fn(),
  };
  return { useTripStore: jest.fn(() => storeValue) };
});

const mockProfile = { id: 'profile-1', givenNames: 'Alice', surname: 'Smith' };
const mockFamilyProfiles = { primaryProfileId: 'profile-1', profiles: new Map() };

jest.mock('@/stores/useProfileStore', () => {
  const storeValue = {
    profile: mockProfile,
    getAllProfiles: jest.fn(async () => new Map([['profile-1', mockProfile]])),
    familyProfiles: mockFamilyProfiles,
  };
  return { useProfileStore: jest.fn(() => storeValue) };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = () => <View />;
  return { ArrowLeft: Icon, ArrowRight: Icon, RefreshCw: Icon, X: Icon, ChevronDown: Icon, ChevronUp: Icon };
});

// Import after mocks
import { submissionCoordinator } from '@/services/submission/submissionCoordinator';
import PortalSubmissionScreen from '@/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen';
import { usePortalAutoFill } from '@/hooks/usePortalAutoFill';

// Typed mock helpers
const mockCoordinator = submissionCoordinator as unknown as {
  generateFilledForm: jest.Mock;
  buildAutoFillSpecs: jest.Mock;
  buildAutoFillScript: jest.Mock;
  isAutoFillSufficient: jest.Mock;
  detectPageType: jest.Mock;
  detectStep: jest.Mock;
  getPageTypeCheckScript: jest.Mock;
  getQRDetectionScript: jest.Mock;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal FilledForm where all required fields are filled. */
function makeCompleteFilledForm() {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    sections: [
      {
        id: 'section-1',
        title: 'Personal Info',
        fields: [
          { id: 'surname', label: 'Surname', required: true, source: 'auto', currentValue: 'Smith', type: 'text', countrySpecific: false },
          { id: 'purposeOfVisit', label: 'Purpose of Visit', required: true, source: 'user', currentValue: 'tourism', type: 'text', countrySpecific: true },
        ],
      },
    ],
    stats: { totalFields: 2, autoFilled: 1, userFilled: 1, remaining: 0, completionPercentage: 100 },
  };
}

/** Build a FilledForm where one required field is empty. */
function makeIncompleteFilledForm() {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    sections: [
      {
        id: 'section-1',
        title: 'Personal Info',
        fields: [
          { id: 'surname', label: 'Surname', required: true, source: 'auto', currentValue: 'Smith', type: 'text', countrySpecific: false },
          { id: 'purposeOfVisit', label: 'Purpose of Visit', required: true, source: 'empty', currentValue: '', type: 'text', countrySpecific: true },
          { id: 'departureCity', label: 'Departure City', required: true, source: 'empty', currentValue: '', type: 'text', countrySpecific: true },
        ],
      },
    ],
    stats: { totalFields: 3, autoFilled: 1, userFilled: 0, remaining: 2, completionPercentage: 33 },
  };
}

// ─── usePortalAutoFill — form completion logic ────────────────────────────────

describe('usePortalAutoFill — form completion check', () => {
  const baseOptions = {
    countryCode: 'JPN',
    schema: mockSchema as any,
    leg: { id: 'leg-1', destinationCountry: 'JPN', formData: {} } as any,
    effectiveProfile: mockProfile as any,
    selectedProfileId: 'profile-1',
    currentStep: 1,
    lastUsedProfileRef: { current: 'profile-1' } as any,
    webViewRef: { current: null } as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isFormComplete:false when schema is null', () => {
    const { result } = renderHook(() =>
      usePortalAutoFill({ ...baseOptions, schema: null }),
    );
    expect(result.current.isFormComplete).toBe(false);
    expect(result.current.missingRequiredFields).toEqual([]);
  });

  it('returns isFormComplete:false when leg is undefined', () => {
    const { result } = renderHook(() =>
      usePortalAutoFill({ ...baseOptions, leg: undefined }),
    );
    expect(result.current.isFormComplete).toBe(false);
  });

  it('returns isFormComplete:false when effectiveProfile is null', () => {
    const { result } = renderHook(() =>
      usePortalAutoFill({ ...baseOptions, effectiveProfile: null }),
    );
    expect(result.current.isFormComplete).toBe(false);
  });

  it('returns isFormComplete:false when generateFilledForm returns null', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(null);
    const { result } = renderHook(() => usePortalAutoFill(baseOptions));
    expect(result.current.isFormComplete).toBe(false);
    expect(result.current.missingRequiredFields).toEqual([]);
  });

  it('returns isFormComplete:true when all required fields are filled', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeCompleteFilledForm());
    const { result } = renderHook(() => usePortalAutoFill(baseOptions));
    expect(result.current.isFormComplete).toBe(true);
    expect(result.current.missingRequiredFields).toEqual([]);
  });

  it('returns isFormComplete:false when required fields have source:empty', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { result } = renderHook(() => usePortalAutoFill(baseOptions));
    expect(result.current.isFormComplete).toBe(false);
  });

  it('returns the labels of all missing required fields', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { result } = renderHook(() => usePortalAutoFill(baseOptions));
    expect(result.current.missingRequiredFields).toEqual([
      'Purpose of Visit',
      'Departure City',
    ]);
  });

  it('does NOT include optional fields with source:empty in missing list', () => {
    const formWithOptionalEmpty = {
      ...makeCompleteFilledForm(),
      sections: [
        {
          id: 'section-1',
          title: 'Personal Info',
          fields: [
            { id: 'surname', label: 'Surname', required: true, source: 'auto', currentValue: 'Smith', type: 'text', countrySpecific: false },
            { id: 'notes', label: 'Notes', required: false, source: 'empty', currentValue: '', type: 'text', countrySpecific: true },
          ],
        },
      ],
    };
    mockCoordinator.generateFilledForm.mockReturnValue(formWithOptionalEmpty);
    const { result } = renderHook(() => usePortalAutoFill(baseOptions));
    expect(result.current.isFormComplete).toBe(true);
    expect(result.current.missingRequiredFields).toEqual([]);
  });
});

// ─── PortalSubmissionScreen — Submit in App gating ───────────────────────────

describe('PortalSubmissionScreen — Submit in App button gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: form is complete
    mockCoordinator.generateFilledForm.mockReturnValue(makeCompleteFilledForm());
  });

  function renderScreen() {
    return render(<PortalSubmissionScreen />);
  }

  // ── Button presence & rendering ─────────────────────────────────────────

  it('renders the submit-in-app-button', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('submit-in-app-button')).toBeTruthy();
  });

  it('renders the submit-in-app-section container', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('submit-in-app-section')).toBeTruthy();
  });

  // ── Disabled state (form incomplete) ───────────────────────────────────

  it('button has accessibilityState.disabled=true when form is incomplete', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { getByTestId } = renderScreen();
    const btn = getByTestId('submit-in-app-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('button has accessibilityState.disabled=false when form is complete', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeCompleteFilledForm());
    const { getByTestId } = renderScreen();
    const btn = getByTestId('submit-in-app-button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  // ── Incomplete message on tap ───────────────────────────────────────────

  it('shows incomplete-form-message when disabled button is tapped', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { getByTestId, queryByTestId } = renderScreen();

    expect(queryByTestId('incomplete-form-message')).toBeNull();

    act(() => {
      fireEvent.press(getByTestId('submit-in-app-button'));
    });

    expect(getByTestId('incomplete-form-message')).toBeTruthy();
  });

  it('shows missing field names inside the incomplete message', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { getByTestId, queryByTestId } = renderScreen();

    act(() => {
      fireEvent.press(getByTestId('submit-in-app-button'));
    });

    const list = queryByTestId('missing-fields-list');
    expect(list).toBeTruthy();
    expect(list?.props.children).toContain('Purpose of Visit');
  });

  it('incomplete-form-message auto-dismisses after 3 seconds', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { getByTestId, queryByTestId } = renderScreen();

    act(() => {
      fireEvent.press(getByTestId('submit-in-app-button'));
    });

    expect(getByTestId('incomplete-form-message')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(queryByTestId('incomplete-form-message')).toBeNull();
  });

  it('does NOT show incomplete-form-message on initial render', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeIncompleteFilledForm());
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('incomplete-form-message')).toBeNull();
  });

  it('does NOT show incomplete-form-message when form is complete', () => {
    mockCoordinator.generateFilledForm.mockReturnValue(makeCompleteFilledForm());
    const { getByTestId, queryByTestId } = renderScreen();

    act(() => {
      fireEvent.press(getByTestId('submit-in-app-button'));
    });

    // Form is complete — no message, auto-fill triggered instead
    expect(queryByTestId('incomplete-form-message')).toBeNull();
  });
});
