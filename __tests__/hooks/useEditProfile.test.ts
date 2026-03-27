/**
 * Unit tests for useEditProfile hook.
 *
 * Tests pure validation functions directly and hook behavior via renderHook.
 * Mocks stores at module level with stable references per test conventions.
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  useEditProfile,
} from '@/hooks/useEditProfile';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateProfile = jest.fn();
let mockProfile: Record<string, unknown> | null = null;
let mockIsLoading = false;

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    profile: mockProfile,
    updateProfile: mockUpdateProfile,
    isLoading: mockIsLoading,
  }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProfile(overrides?: Record<string, unknown>) {
  return {
    id: 'test-1',
    passportNumber: 'AB1234567',
    surname: 'Smith',
    givenNames: 'Alice',
    nationality: 'USA',
    dateOfBirth: '1985-03-15',
    gender: 'F',
    passportExpiry: '2030-03-15',
    issuingCountry: 'USA',
    email: 'alice@example.com',
    phoneNumber: '+1 555-123-4567',
    occupation: 'Engineer',
    maritalStatus: 'Single',
    homeAddress: {
      line1: '123 Main St',
      line2: '',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'USA',
    },
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = null;
  mockIsLoading = false;
  mockUpdateProfile.mockResolvedValue(undefined);
});

// ── useEditProfile hook ───────────────────────────────────────────────────────

describe('useEditProfile', () => {
  it('initializes with empty form data when no profile', () => {
    const { result } = renderHook(() => useEditProfile());

    expect(result.current.formData.email).toBe('');
    expect(result.current.formData.phoneNumber).toBe('');
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.profile).toBeNull();
  });

  it('populates form data from profile', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    expect(result.current.formData.email).toBe('alice@example.com');
    expect(result.current.formData.phoneNumber).toBe('+1 555-123-4567');
    expect(result.current.formData.occupation).toBe('Engineer');
    expect(result.current.formData.homeAddress.city).toBe('Springfield');
  });

  it('marks unsaved changes when updateFormData is called', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    act(() => {
      result.current.updateFormData('email', 'new@example.com');
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.formData.email).toBe('new@example.com');
  });

  it('clears field error when updateFormData is called', () => {
    mockProfile = makeProfile({ email: 'bad' });
    const { result } = renderHook(() => useEditProfile());

    // Trigger validation to set errors
    act(() => {
      result.current.updateFormData('email', 'bad');
    });
    act(() => {
      result.current.validateForm();
    });

    expect(result.current.errors.email).toBe('Please enter a valid email address');

    // Now update the field — error should clear
    act(() => {
      result.current.updateFormData('email', 'good@example.com');
    });

    expect(result.current.errors.email).toBe('');
  });

  it('updateAddress updates homeAddress and marks unsaved', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    const newAddress = {
      line1: '456 Oak Ave',
      line2: '',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'USA',
    };

    act(() => {
      result.current.updateAddress(newAddress);
    });

    expect(result.current.formData.homeAddress).toEqual(newAddress);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('validateForm returns true for valid data', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    let isValid = false;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(true);
    expect(Object.keys(result.current.errors).length).toBe(0);
  });

  it('validateForm returns false for invalid email', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    act(() => {
      result.current.updateFormData('email', 'not-an-email');
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.email).toBe('Please enter a valid email address');
  });

  it('validateForm catches missing city when address line1 is set', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    act(() => {
      result.current.updateAddress({
        line1: '123 Main St',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'USA',
      });
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.city).toBe('City is required when address is provided');
  });

  it('validateForm catches missing country when address line1 is set', () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());

    act(() => {
      result.current.updateAddress({
        line1: '123 Main St',
        line2: '',
        city: 'Portland',
        state: '',
        postalCode: '',
        country: '',
      });
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.country).toBe('Country is required when address is provided');
  });

  it('handleSave does nothing when no profile', async () => {
    mockProfile = null;
    const { result } = renderHook(() => useEditProfile());
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.handleSave(onSuccess);
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('handleSave shows validation error when form is invalid', async () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());
    const onSuccess = jest.fn();

    act(() => {
      result.current.updateFormData('email', 'invalid');
    });

    await act(async () => {
      await result.current.handleSave(onSuccess);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Validation Error',
      'Please correct the errors and try again.'
    );
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('handleSave calls updateProfile and shows success on valid data', async () => {
    mockProfile = makeProfile();
    const { result } = renderHook(() => useEditProfile());
    const onSuccess = jest.fn();

    // Mark as having unsaved changes
    act(() => {
      result.current.updateFormData('email', 'alice@example.com');
    });

    await act(async () => {
      await result.current.handleSave(onSuccess);
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        phoneNumber: '+1 555-123-4567',
      })
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'Profile updated successfully.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'OK' }),
      ])
    );
  });

  it('handleSave shows error alert when updateProfile throws', async () => {
    mockProfile = makeProfile();
    mockUpdateProfile.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useEditProfile());
    const onSuccess = jest.fn();

    act(() => {
      result.current.updateFormData('email', 'alice@example.com');
    });

    await act(async () => {
      await result.current.handleSave(onSuccess);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to update profile. Please try again.'
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
