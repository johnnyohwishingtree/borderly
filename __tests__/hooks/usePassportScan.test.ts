/**
 * Unit tests for usePassportScan hook.
 *
 * Tests mode transitions, form validation (Zod schema), scan success/error,
 * demo scan, storage error handling, and family mode. Store and service
 * dependencies are fully mocked with module-level stable references.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ── Stable mock references ────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

const mockRouteParams: {
  familyMode?: boolean;
  relationship?: string;
  profileId?: string;
} = {};
const mockRoute = { params: mockRouteParams };

const mockSaveProfile = jest.fn();
const mockAddProfile = jest.fn();
const mockGetProfile = jest.fn();
const mockUpdateProfileById = jest.fn();
const mockStoreState = {
  saveProfile: mockSaveProfile,
  addProfile: mockAddProfile,
  getProfile: mockGetProfile,
  updateProfileById: mockUpdateProfileById,
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

jest.mock('@react-navigation/native-stack', () => ({}));

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => mockStoreState,
}));

jest.mock('../../src/utils/imageUtils', () => ({
  detectDevicePerformance: () => ({ tier: 'medium', recommendedSettings: {} }),
}));

jest.mock('../../src/services/error/errorHandler', () => ({
  handleStorageError: jest.fn().mockResolvedValue({ recovered: false, error: 'Storage failed' }),
  handleCameraError: jest.fn().mockResolvedValue({ recovered: false, error: 'Camera failed' }),
  errorHandler: {
    handleError: jest.fn().mockResolvedValue({ recovered: false, error: 'General error' }),
  },
}));

jest.mock('../../src/services/error/errorHandling', () => ({
  isStorageError: jest.fn().mockReturnValue(false),
}));

import { usePassportScan, type PassportFormData } from '../../src/hooks/usePassportScan';
import { handleCameraError } from '../../src/services/error/errorHandler';
import { isStorageError } from '../../src/services/error/errorHandling';

// ── Zod schema validation (tested directly without renderHook) ────────────────

// Import the schema indirectly by testing form validation through the hook's form
// The passportSchema is not exported, so we test validation through the form.

const validPassportData: PassportFormData = {
  passportNumber: 'L12345678',
  surname: 'SMITH',
  givenNames: 'JOHN',
  nationality: 'USA',
  dateOfBirth: '1985-06-15',
  gender: 'M',
  passportExpiry: '2032-03-20',
  issuingCountry: 'USA',
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  delete mockRouteParams.familyMode;
  delete mockRouteParams.relationship;
  delete mockRouteParams.profileId;
  delete mockRouteParams.returnTo;
  mockSaveProfile.mockResolvedValue(undefined);
  mockAddProfile.mockResolvedValue(undefined);
  mockGetProfile.mockResolvedValue(null);
  mockUpdateProfileById.mockResolvedValue(undefined);
});

// ── Mode transitions ──────────────────────────────────────────────────────────

describe('usePassportScan — mode transitions', () => {
  it('starts in method mode', () => {
    const { result } = renderHook(() => usePassportScan());
    expect(result.current.scan.mode).toBe('method');
  });

  it('transitions from method to scanning via handleStartScanning', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleStart();
    });

    expect(result.current.scan.mode).toBe('scanning');
  });

  it('transitions from method to manual via handleManualEntry', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleManualEntry();
    });

    expect(result.current.scan.mode).toBe('manual');
  });

  it('transitions from scanning to preview on scan success', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleStart();
    });
    expect(result.current.scan.mode).toBe('scanning');

    act(() => {
      result.current.scan.handleSuccess({
        success: true,
        errors: [],
        confidence: 0.95,
        profile: validPassportData,
      });
    });

    expect(result.current.scan.mode).toBe('preview');
  });

  it('transitions from preview to method via handleBack (rescan)', () => {
    const { result } = renderHook(() => usePassportScan());

    // Go to preview via scan success
    act(() => {
      result.current.scan.handleSuccess({
        success: true,
        errors: [],
        confidence: 0.95,
        profile: validPassportData,
      });
    });
    expect(result.current.scan.mode).toBe('preview');

    act(() => {
      result.current.navigation.handleBack();
    });

    expect(result.current.scan.mode).toBe('method');
    expect(result.current.scan.result).toBeNull();
    expect(result.current.profile.scanned).toBeNull();
  });

  it('navigates goBack when handleBack is called in method mode', () => {
    const { result } = renderHook(() => usePassportScan());
    expect(result.current.scan.mode).toBe('method');

    act(() => {
      result.current.navigation.handleBack();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('transitions to scanning via handleRescan', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleSuccess({
        success: true,
        errors: [],
        confidence: 0.95,
        profile: validPassportData,
      });
    });
    expect(result.current.scan.mode).toBe('preview');

    act(() => {
      result.current.profile.rescan();
    });

    expect(result.current.scan.mode).toBe('scanning');
    expect(result.current.scan.result).toBeNull();
    expect(result.current.profile.scanned).toBeNull();
  });

  it('transitions back to method via handleScanCancel', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleStart();
    });
    expect(result.current.scan.mode).toBe('scanning');

    act(() => {
      result.current.scan.handleCancel();
    });

    expect(result.current.scan.mode).toBe('method');
  });
});

// ── Form validation via hook ──────────────────────────────────────────────────

describe('usePassportScan — form validation', () => {
  it('accepts valid passport data', async () => {
    const { result } = renderHook(() => usePassportScan());

    // Set valid data into the form
    act(() => {
      Object.entries(validPassportData).forEach(([key, value]) => {
        result.current.form.setValue(key as keyof PassportFormData, value);
      });
    });

    let isValid = false;
    await act(async () => {
      isValid = await result.current.form.trigger();
    });

    expect(isValid).toBe(true);
    expect(Object.keys(result.current.form.formState.errors)).toHaveLength(0);
  });

  it('rejects passport number shorter than 6 characters', async () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      Object.entries(validPassportData).forEach(([key, value]) => {
        result.current.form.setValue(key as keyof PassportFormData, value);
      });
      result.current.form.setValue('passportNumber', 'AB12');
    });

    let isValid = false;
    await act(async () => {
      isValid = await result.current.form.trigger();
    });

    expect(isValid).toBe(false);
  });

  it('rejects invalid date format for dateOfBirth', async () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      Object.entries(validPassportData).forEach(([key, value]) => {
        result.current.form.setValue(key as keyof PassportFormData, value);
      });
      result.current.form.setValue('dateOfBirth', '15-06-1985');
    });

    let isValid = false;
    await act(async () => {
      isValid = await result.current.form.trigger();
    });

    expect(isValid).toBe(false);
  });

  it('rejects missing required fields', async () => {
    const { result } = renderHook(() => usePassportScan());

    // Only set gender (default), leave others empty
    let isValid = false;
    await act(async () => {
      isValid = await result.current.form.trigger();
    });

    expect(isValid).toBe(false);
  });

  it('rejects invalid passport expiry date format', async () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      Object.entries(validPassportData).forEach(([key, value]) => {
        result.current.form.setValue(key as keyof PassportFormData, value);
      });
      result.current.form.setValue('passportExpiry', '03/2032');
    });

    let isValid = false;
    await act(async () => {
      isValid = await result.current.form.trigger();
    });

    expect(isValid).toBe(false);
  });
});

// ── Scan success ──────────────────────────────────────────────────────────────

describe('usePassportScan — scan success', () => {
  it('populates scanResult and scannedProfile on success', () => {
    const { result } = renderHook(() => usePassportScan());

    const mrzResult = {
      success: true,
      errors: [],
      confidence: 0.95,
      profile: { passportNumber: 'X99887766', surname: 'DOE', givenNames: 'JANE' },
    };

    act(() => {
      result.current.scan.handleSuccess(mrzResult);
    });

    expect(result.current.scan.result).toBe(mrzResult);
    expect(result.current.profile.scanned).toEqual(mrzResult.profile);
    expect(result.current.scan.mode).toBe('preview');
  });

  it('clears scanError on scan success', () => {
    const { result } = renderHook(() => usePassportScan());

    // Trigger a scan success after being in a state
    act(() => {
      result.current.scan.handleSuccess({
        success: true,
        errors: [],
        confidence: 0.95,
        profile: validPassportData,
      });
    });

    expect(result.current.scan.error).toBeNull();
  });
});

// ── Scan error ────────────────────────────────────────────────────────────────

describe('usePassportScan — scan error', () => {
  it('calls handleCameraError on scan error', async () => {
    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.scan.handleError(new Error('Camera unavailable'));
    });

    expect(handleCameraError).toHaveBeenCalledTimes(1);
    expect(handleCameraError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ screen: 'PassportScan', action: 'mrzScanning' }),
      expect.objectContaining({ showUserFeedback: false, enableRetry: true }),
    );
  });

  it('sets scanError when recovery fails', async () => {
    (handleCameraError as jest.Mock).mockResolvedValue({
      recovered: false,
      error: 'Camera failed',
    });

    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.scan.handleError(new Error('Camera unavailable'));
    });

    expect(result.current.scan.error).toBe('Camera failed');
  });
});

// ── Storage error ─────────────────────────────────────────────────────────────

describe('usePassportScan — storage error on save', () => {
  it('sets storageError when save fails', async () => {
    mockSaveProfile.mockRejectedValue(new Error('Write failed'));
    (isStorageError as unknown as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.profile.save({ passportNumber: 'X123' });
    });

    expect(result.current.ui.storageError).toBe('General error');
    expect(result.current.profile.isSubmitting).toBe(false);
  });

  it('retrySave calls saveProfileData again with last failed data', async () => {
    mockSaveProfile
      .mockRejectedValueOnce(new Error('Write failed'))
      .mockResolvedValueOnce(undefined);
    (isStorageError as unknown as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => usePassportScan());

    const profileData = { passportNumber: 'X123', surname: 'RETRY' };

    await act(async () => {
      await result.current.profile.save(profileData);
    });

    expect(result.current.ui.storageError).toBe('General error');

    // Now retry
    await act(async () => {
      await result.current.profile.retrySave();
    });

    // saveProfile called twice (once original, once retry)
    expect(mockSaveProfile).toHaveBeenCalledTimes(2);
  });

  it('allows retry and fallback to manual on scan error', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.retry();
    });

    expect(result.current.scan.mode).toBe('scanning');
    expect(result.current.scan.error).toBeNull();

    act(() => {
      result.current.scan.fallbackToManual();
    });

    expect(result.current.scan.mode).toBe('manual');
    expect(result.current.scan.error).toBeNull();
  });
});

// ── Demo scan ─────────────────────────────────────────────────────────────────

describe('usePassportScan — handleDemoScan', () => {
  it('populates form with adult demo profile data by default', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleDemo();
    });

    expect(result.current.scan.mode).toBe('preview');
    expect(result.current.profile.scanned).toEqual({
      passportNumber: 'L12345678',
      surname: 'SMITH',
      givenNames: 'JOHN MICHAEL',
      nationality: 'USA',
      dateOfBirth: '1985-06-15',
      gender: 'M',
      passportExpiry: '2032-03-20',
      issuingCountry: 'USA',
    });
  });

  it('populates form with child demo profile when specified', () => {
    const { result } = renderHook(() => usePassportScan());

    act(() => {
      result.current.scan.handleDemo('child');
    });

    expect(result.current.profile.scanned).toEqual(
      expect.objectContaining({
        passportNumber: 'N55512345',
        surname: 'SMITH',
        givenNames: 'EMMA',
      }),
    );
  });
});

// ── Family mode ───────────────────────────────────────────────────────────────

describe('usePassportScan — family mode', () => {
  it('reads familyMode and relationship from route params', () => {
    mockRouteParams.familyMode = true;
    mockRouteParams.relationship = 'spouse';

    const { result } = renderHook(() => usePassportScan());

    expect(result.current.family.mode).toBe(true);
    expect(result.current.family.relationship).toBe('spouse');
  });

  it('defaults familyMode to false and relationship to self', () => {
    const { result } = renderHook(() => usePassportScan());

    expect(result.current.family.mode).toBe(false);
    expect(result.current.family.relationship).toBe('self');
  });

  it('calls addProfile instead of saveProfile when in family mode', async () => {
    mockRouteParams.familyMode = true;
    mockRouteParams.relationship = 'child';

    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.profile.save(validPassportData);
    });

    expect(mockAddProfile).toHaveBeenCalledTimes(1);
    expect(mockSaveProfile).not.toHaveBeenCalled();
    expect(mockAddProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'child',
      }),
      expect.objectContaining({
        relationship: 'child',
        isPrimary: false,
      }),
    );
  });

  it('navigates to ConfirmProfile when not in family mode', async () => {
    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.profile.save(validPassportData);
    });

    expect(mockNavigate).toHaveBeenCalledWith('ConfirmProfile');
  });

  it('navigates to FamilyManagement when in family mode (no returnTo)', async () => {
    mockRouteParams.familyMode = true;
    mockRouteParams.relationship = 'spouse';

    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.profile.save(validPassportData);
    });

    expect(mockNavigate).toHaveBeenCalledWith('FamilyManagement');
  });

});

// ── Device performance ────────────────────────────────────────────────────────

describe('usePassportScan — device performance', () => {
  it('detects device performance on mount', () => {
    const { result } = renderHook(() => usePassportScan());
    expect(result.current.ui.devicePerformance).toBe('medium');
  });
});

// ── Edit scanned profile ──────────────────────────────────────────────────────

describe('usePassportScan — handleEditScanned', () => {
  it('populates form with scanned data and switches to manual mode', () => {
    const { result } = renderHook(() => usePassportScan());

    // First scan
    act(() => {
      result.current.scan.handleSuccess({
        success: true,
        errors: [],
        confidence: 0.95,
        profile: {
          passportNumber: 'EDIT1234',
          surname: 'EDIT',
          givenNames: 'TEST',
          nationality: 'GBR',
          dateOfBirth: '1990-01-01',
          gender: 'F',
          passportExpiry: '2030-01-01',
          issuingCountry: 'GBR',
        },
      });
    });

    expect(result.current.scan.mode).toBe('preview');

    act(() => {
      result.current.profile.edit();
    });

    expect(result.current.scan.mode).toBe('manual');
    expect(result.current.form.getValues('passportNumber')).toBe('EDIT1234');
    expect(result.current.form.getValues('surname')).toBe('EDIT');
    expect(result.current.form.getValues('nationality')).toBe('GBR');
  });
});

// ── Existing profile editing ──────────────────────────────────────────────────

describe('usePassportScan — editing existing profile', () => {
  it('loads existing profile and switches to manual mode', async () => {
    mockRouteParams.profileId = 'existing_123';
    mockGetProfile.mockResolvedValue({
      id: 'existing_123',
      passportNumber: 'OLD12345',
      surname: 'EXISTING',
      givenNames: 'USER',
      nationality: 'JPN',
      dateOfBirth: '1992-05-20',
      gender: 'M',
      passportExpiry: '2029-05-20',
      issuingCountry: 'JPN',
    });

    const { result } = renderHook(() => usePassportScan());

    await waitFor(() => {
      expect(result.current.scan.mode).toBe('manual');
    });

    expect(result.current.form.getValues('passportNumber')).toBe('OLD12345');
    expect(result.current.form.getValues('surname')).toBe('EXISTING');
    expect(mockGetProfile).toHaveBeenCalledWith('existing_123');
  });

  it('calls updateProfileById when saving with a profileId', async () => {
    mockRouteParams.profileId = 'existing_123';
    mockGetProfile.mockResolvedValue(null);

    const { result } = renderHook(() => usePassportScan());

    await act(async () => {
      await result.current.profile.save(validPassportData);
    });

    expect(mockUpdateProfileById).toHaveBeenCalledWith(
      'existing_123',
      expect.objectContaining({ passportNumber: 'L12345678' }),
    );
    expect(mockSaveProfile).not.toHaveBeenCalled();
    expect(mockAddProfile).not.toHaveBeenCalled();
  });
});
