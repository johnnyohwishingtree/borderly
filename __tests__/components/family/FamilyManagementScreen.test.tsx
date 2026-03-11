/**
 * FamilyManagementScreen Component Unit Tests
 *
 * Tests the family management screen functionality including family member
 * loading, display, navigation, and management operations.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FamilyManagementScreen from '@/screens/profile/FamilyManagementScreen';
import { useProfileStore } from '@/stores/useProfileStore';
import { FamilyMember } from '@/types/profile';

// Mock the profile store
jest.mock('@/stores/useProfileStore');
const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

// Helper to set up the store mock with getState support
function setupProfileStoreMock(profile: FamilyMember | null, loadProfile: jest.Mock) {
  const storeValue = { profile, loadProfile };
  mockUseProfileStore.mockReturnValue(storeValue);
  (mockUseProfileStore as any).getState = () => storeValue;
}

// Mock navigation fully to avoid NavigationContainer getConstants error
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Users: (props: any) => <View testID="users-icon" {...props} />,
  };
});

// Mock UI components using React Native primitives
jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress, testID }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID}><Text>{title}</Text></TouchableOpacity>
    ),
    Card: ({ children, className }: any) => (
      <View className={className}>{children}</View>
    ),
    EmptyState: ({ title, description, buttonProps, icon }: any) => (
      <View>
        {icon}
        <Text>{title}</Text>
        <Text>{description}</Text>
        {buttonProps && <TouchableOpacity onPress={buttonProps.onPress}><Text>{buttonProps.title}</Text></TouchableOpacity>}
      </View>
    ),
    LoadingSpinner: ({ text }: any) => <View><Text>{text}</Text></View>,
  };
});

// Mock family member card
jest.mock('@/components/profile', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    FamilyMemberCard: ({ member, onEdit, onRemove }: any) => (
      <View testID={`family-member-${member.id}`}>
        <Text>{member.givenNames} {member.surname}</Text>
        <Text>{member.relationship}</Text>
        {onEdit && <TouchableOpacity onPress={onEdit}><Text>Edit</Text></TouchableOpacity>}
        {onRemove && <TouchableOpacity onPress={onRemove}><Text>Remove</Text></TouchableOpacity>}
      </View>
    ),
  };
});

describe('FamilyManagementScreen', () => {
  const mockPrimaryProfile: FamilyMember = {
    id: 'primary-123',
    givenNames: 'Alice',
    surname: 'Johnson',
    passportNumber: 'US1234567',
    nationality: 'USA',
    dateOfBirth: '1985-03-15',
    gender: 'F',
    passportExpiry: '2030-12-31',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    relationship: 'self'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  describe('Loading State', () => {
    it('should show loading spinner while loading family members', () => {
      setupProfileStoreMock(null, jest.fn().mockReturnValue(new Promise(() => {}))); // Never resolves

      const { getByText } = render(<FamilyManagementScreen />);

      expect(getByText('Loading family members...')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no family members exist', async () => {
      setupProfileStoreMock(null, jest.fn().mockResolvedValue(undefined));

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('No Family Members')).toBeTruthy();
        expect(getByText('Add family members to manage multiple travel profiles and streamline form completion for everyone.')).toBeTruthy();
        expect(getByText('Add First Member')).toBeTruthy();
      });
    });

    it('should navigate to add family member from empty state', async () => {
      setupProfileStoreMock(null, jest.fn().mockResolvedValue(undefined));

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('Add First Member')).toBeTruthy();
      });

      fireEvent.press(getByText('Add First Member'));
      expect(mockNavigate).toHaveBeenCalledWith('AddFamilyMember');
    });
  });

  describe('Family Members Display', () => {
    it('should display primary profile as self relationship', async () => {
      setupProfileStoreMock(mockPrimaryProfile, jest.fn().mockResolvedValue(undefined));

      const { getByText, getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('family-member-primary-123')).toBeTruthy();
        expect(getByText('Alice Johnson')).toBeTruthy();
        expect(getByText('self')).toBeTruthy();
      });
    });

    it('should load family members on screen focus', () => {
      const mockLoadProfile = jest.fn().mockResolvedValue(undefined);
      setupProfileStoreMock(mockPrimaryProfile, mockLoadProfile);

      render(<FamilyManagementScreen />);

      expect(mockLoadProfile).toHaveBeenCalled();
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to add family member screen when add button is pressed', async () => {
      setupProfileStoreMock(mockPrimaryProfile, jest.fn().mockResolvedValue(undefined));

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('Add Member')).toBeTruthy();
      });

      fireEvent.press(getByText('Add Member'));
      expect(mockNavigate).toHaveBeenCalledWith('AddFamilyMember');
    });

    it('should navigate to edit profile when editing primary member', async () => {
      setupProfileStoreMock(mockPrimaryProfile, jest.fn().mockResolvedValue(undefined));

      const { getAllByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        const editButtons = getAllByText('Edit');
        expect(editButtons.length).toBeGreaterThan(0);
      });

      const editButtons = getAllByText('Edit');
      fireEvent.press(editButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });
  });

  describe('Family Member Removal', () => {
    it('should not show remove button for primary profile', async () => {
      setupProfileStoreMock(mockPrimaryProfile, jest.fn().mockResolvedValue(undefined));

      const { queryByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        // Primary profile mock only renders Edit, not Remove
        // (the mock renders Remove only when onRemove is provided)
        expect(queryByText('Remove')).toBeFalsy();
      });
    });
  });

  describe('Information Section', () => {
    it('should display family profiles information card', async () => {
      setupProfileStoreMock(mockPrimaryProfile, jest.fn().mockResolvedValue(undefined));

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('About Family Profiles')).toBeTruthy();
        expect(getByText('• Each family member gets their own secure profile')).toBeTruthy();
        expect(getByText('• All data is stored locally on your device')).toBeTruthy();
        expect(getByText('• Scan multiple passports for quick setup')).toBeTruthy();
        expect(getByText('• Forms can be auto-filled for each family member')).toBeTruthy();
      });
    });
  });

  describe('Screen Header', () => {
    it('should display correct header information', async () => {
      setupProfileStoreMock(mockPrimaryProfile, jest.fn().mockResolvedValue(undefined));

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('Family Members')).toBeTruthy();
        expect(getByText('Manage your family travel profiles')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle profile loading errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      setupProfileStoreMock(null, jest.fn().mockRejectedValue(new Error('Loading failed')));

      render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load family members:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should stop loading state after error', async () => {
      setupProfileStoreMock(null, jest.fn().mockRejectedValue(new Error('Loading failed')));

      const { queryByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(queryByText('Loading family members...')).toBeFalsy();
      });
    });
  });
});
