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
    const state = useProfileStore.getState();
    
    state.setProfile(mockProfile);
    // Get fresh state after setting
    const updatedState = useProfileStore.getState();
    expect(updatedState.profile).toEqual(mockProfile);
    
    state.clearProfile();
    // Get fresh state after clearing
    const clearedState = useProfileStore.getState();
    expect(clearedState.profile).toBe(null);
  });

  it('should toggle onboarding complete', () => {
    const state = useProfileStore.getState();
    
    state.setOnboardingComplete(true);
    // Get fresh state after setting
    const updatedState = useProfileStore.getState();
    expect(updatedState.isOnboardingComplete).toBe(true);
    
    state.setOnboardingComplete(false);
    // Get fresh state after setting
    const finalState = useProfileStore.getState();
    expect(finalState.isOnboardingComplete).toBe(false);
  });
});