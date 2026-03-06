import { useProfileStore } from '@/stores/useProfileStore';
import { TravelerProfile } from '@/types/profile';

const mockProfile: TravelerProfile = {
  id: 'test-id',
  passportNumber: 'A12345678',
  givenNames: 'John',
  surname: 'Doe',
  nationality: 'USA',
  dateOfBirth: '1990-01-01',
  gender: 'M',
  passportExpiry: '2030-01-01',
  issuingCountry: 'USA',
  email: 'john@example.com',
  phoneNumber: '+1234567890',
  homeAddress: {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('useProfileStore', () => {
  beforeEach(async () => {
    // Reset store state
    const store = useProfileStore.getState();
    await store.clearProfile();
    store.setOnboardingComplete(false);
  });

  it('should have initial state', () => {
    const { profile, isOnboardingComplete, isLoading, error } = useProfileStore.getState();
    expect(profile).toBe(null);
    expect(isOnboardingComplete).toBe(false);
    expect(isLoading).toBe(false);
    expect(error).toBe(null);
  });

  it('should handle loading state', async () => {
    const store = useProfileStore.getState();
    
    // Start loading
    const loadPromise = store.loadProfile();
    
    // Should be loading immediately (sets loading: true synchronously)
    expect(useProfileStore.getState().isLoading).toBe(true);
    
    // Wait for load to complete
    await loadPromise;
    
    // Should be done loading
    expect(useProfileStore.getState().isLoading).toBe(false);
  });

  it('should save and load profile', async () => {
    const store = useProfileStore.getState();
    
    // Save profile
    await store.saveProfile(mockProfile);
    
    // Profile should be set in state
    const savedState = useProfileStore.getState();
    expect(savedState.profile).toMatchObject({
      ...mockProfile,
      updatedAt: expect.any(String),
    });
  });

  it('should handle onboarding complete', () => {
    const store = useProfileStore.getState();
    
    store.setOnboardingComplete(true);
    expect(useProfileStore.getState().isOnboardingComplete).toBe(true);
    
    store.setOnboardingComplete(false);
    expect(useProfileStore.getState().isOnboardingComplete).toBe(false);
  });

  it('should update profile', async () => {
    const store = useProfileStore.getState();
    
    // First save the profile
    await store.saveProfile(mockProfile);
    
    // Update the profile
    const updates = { email: 'newemail@example.com' };
    await store.updateProfile(updates);
    
    // Profile should be updated
    const updatedState = useProfileStore.getState();
    expect(updatedState.profile?.email).toBe('newemail@example.com');
    expect(updatedState.profile?.updatedAt).not.toBe(mockProfile.updatedAt);
  });
});