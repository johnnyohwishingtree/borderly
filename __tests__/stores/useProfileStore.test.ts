import { useProfileStore } from '@/stores/useProfileStore';
import { TravelProfile } from '@/types/profile';

const mockProfile: TravelProfile = {
  passport: {
    number: 'A12345678',
    givenNames: 'John',
    surname: 'Doe',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    expiryDate: '2030-01-01',
    issuingCountry: 'USA',
  },
  contactInfo: {
    email: 'john@example.com',
    phone: '+1234567890',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    },
  },
};

describe('useProfileStore', () => {
  beforeEach(() => {
    useProfileStore.getState().clearProfile();
    useProfileStore.getState().setOnboardingComplete(false);
  });

  it('should have initial state', () => {
    const { profile, isOnboardingComplete } = useProfileStore.getState();
    expect(profile).toBe(null);
    expect(isOnboardingComplete).toBe(false);
  });

  it('should set and clear profile', () => {
    useProfileStore.getState().setProfile(mockProfile);
    expect(useProfileStore.getState().profile).toEqual(mockProfile);

    useProfileStore.getState().clearProfile();
    expect(useProfileStore.getState().profile).toBe(null);
  });

  it('should toggle onboarding complete', () => {
    useProfileStore.getState().setOnboardingComplete(true);
    expect(useProfileStore.getState().isOnboardingComplete).toBe(true);

    useProfileStore.getState().setOnboardingComplete(false);
    expect(useProfileStore.getState().isOnboardingComplete).toBe(false);
  });
});
