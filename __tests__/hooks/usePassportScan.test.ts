import { renderHook, act } from '@testing-library/react-native';
import { usePassportScan } from '@/hooks/usePassportScan';
import { useProfileStore } from '@/stores/useProfileStore';

// Mock navigation
const mockNavigate = jest.fn();
const mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Mock error handling
jest.mock('@/services/error/errorHandler', () => ({
  handleStorageError: jest.fn().mockResolvedValue({ recovered: true }),
  handleCameraError: jest.fn().mockResolvedValue({ recovered: true }),
  errorHandler: { handleError: jest.fn().mockResolvedValue({ recovered: true }) },
}));
jest.mock('@/services/error/errorHandling', () => ({
  isStorageError: jest.fn(() => false),
  AppError: class extends Error {},
}));
jest.mock('@/utils/imageUtils', () => ({
  detectDevicePerformance: jest.fn(() => 'high'),
}));

// Mock storage services
jest.mock('@/services/storage', () => ({
  keychainService: {
    storeProfile: jest.fn(),
    getProfile: jest.fn(),
    deleteProfile: jest.fn(),
    storeProfileById: jest.fn(),
    getProfileById: jest.fn(),
    deleteProfileById: jest.fn(),
    getAllProfileIds: jest.fn(),
    profileExists: jest.fn(),
    migrateLegacyProfile: jest.fn(),
    generateEncryptionKey: jest.fn(),
    generateProfileEncryptionKey: jest.fn(),
    getEncryptionKey: jest.fn(),
    getProfileEncryptionKey: jest.fn(),
    deleteProfileEncryptionKey: jest.fn(),
    isAvailable: jest.fn(),
    clearSensitiveMemory: jest.fn(),
    secureCleanup: jest.fn(),
  },
  mmkvService: {
    getPreferences: jest.fn(() => ({ onboardingComplete: false })),
    setPreference: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  },
}));

describe('usePassportScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset route params
    Object.keys(mockRouteParams).forEach(k => delete mockRouteParams[k]);
    // Reset store
    useProfileStore.setState({
      familyProfiles: {
        profiles: new Map(),
        primaryProfileId: '',
        maxProfiles: 8,
        version: 1,
        lastModified: new Date().toISOString(),
      },
      currentProfile: null,
      currentProfileId: null,
      profile: null,
      isOnboardingComplete: false,
      isLoading: false,
      error: null,
    });
  });

  describe('saveProfileData', () => {
    it('calls saveProfile for primary user (non-family mode)', async () => {
      const saveSpy = jest.spyOn(useProfileStore.getState(), 'saveProfile').mockResolvedValue();

      const { result } = renderHook(() => usePassportScan());

      await act(async () => {
        await result.current.saveProfileData({
          passportNumber: 'L12345678',
          surname: 'SMITH',
          givenNames: 'JOHN',
          nationality: 'USA',
          dateOfBirth: '1985-06-15',
          gender: 'M',
          passportExpiry: '2032-03-20',
          issuingCountry: 'USA',
        });
      });

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('ConfirmProfile');
      saveSpy.mockRestore();
    });

    it('calls addProfile (not saveProfile) in family mode', async () => {
      // Set route params for family mode
      mockRouteParams.familyMode = true;
      mockRouteParams.relationship = 'spouse';
      mockRouteParams.returnTo = 'AddCompanions';

      const addSpy = jest.spyOn(useProfileStore.getState(), 'addProfile').mockResolvedValue();
      const saveSpy = jest.spyOn(useProfileStore.getState(), 'saveProfile').mockResolvedValue();

      const { result } = renderHook(() => usePassportScan());

      await act(async () => {
        await result.current.saveProfileData({
          passportNumber: 'M98765432',
          surname: 'SMITH',
          givenNames: 'JANE MARIE',
          nationality: 'USA',
          dateOfBirth: '1987-09-22',
          gender: 'F',
          passportExpiry: '2031-11-15',
          issuingCountry: 'USA',
        });
      });

      // Must call addProfile, NOT saveProfile
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).not.toHaveBeenCalled();

      // Verify metadata includes correct relationship
      const metadata = addSpy.mock.calls[0][1];
      expect(metadata.relationship).toBe('spouse');
      expect(metadata.isPrimary).toBe(false);

      // Should navigate back to AddCompanions
      expect(mockNavigate).toHaveBeenCalledWith('AddCompanions');

      addSpy.mockRestore();
      saveSpy.mockRestore();
    });

    it('calls updateProfileById when editing an existing profile', async () => {
      mockRouteParams.profileId = 'existing-id';
      mockRouteParams.familyMode = true;

      const updateSpy = jest.spyOn(useProfileStore.getState(), 'updateProfileById').mockResolvedValue();

      const { result } = renderHook(() => usePassportScan());

      await act(async () => {
        await result.current.saveProfileData({
          passportNumber: 'X11111111',
          surname: 'DOE',
          givenNames: 'JANE',
          nationality: 'GBR',
          dateOfBirth: '1990-01-01',
          gender: 'F',
          passportExpiry: '2030-01-01',
          issuingCountry: 'GBR',
        });
      });

      expect(updateSpy).toHaveBeenCalledWith('existing-id', expect.objectContaining({
        passportNumber: 'X11111111',
        surname: 'DOE',
      }));

      updateSpy.mockRestore();
    });
  });

  describe('demo scan', () => {
    it('handleDemoScan sets mode to preview with adult profile', () => {
      const { result } = renderHook(() => usePassportScan());

      act(() => {
        result.current.handleDemoScan('adult');
      });

      expect(result.current.mode).toBe('preview');
      expect(result.current.scannedProfile?.passportNumber).toBe('L12345678');
      expect(result.current.scannedProfile?.surname).toBe('SMITH');
      expect(result.current.scannedProfile?.givenNames).toBe('JOHN MICHAEL');
    });

    it('handleDemoScan loads spouse persona', () => {
      const { result } = renderHook(() => usePassportScan());

      act(() => {
        result.current.handleDemoScan('spouse');
      });

      expect(result.current.scannedProfile?.passportNumber).toBe('M98765432');
      expect(result.current.scannedProfile?.givenNames).toBe('JANE MARIE');
    });

    it('handleDemoScan loads child persona', () => {
      const { result } = renderHook(() => usePassportScan());

      act(() => {
        result.current.handleDemoScan('child');
      });

      expect(result.current.scannedProfile?.passportNumber).toBe('N55512345');
      expect(result.current.scannedProfile?.givenNames).toBe('EMMA');
    });
  });
});
