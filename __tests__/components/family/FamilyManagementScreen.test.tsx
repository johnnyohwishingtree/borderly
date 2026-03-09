/**
 * FamilyManagementScreen Component Unit Tests
 * 
 * Tests the family management screen functionality including family member
 * loading, display, navigation, and management operations.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import FamilyManagementScreen from '@/screens/profile/FamilyManagementScreen';
import { useProfileStore } from '@/stores/useProfileStore';
import { FamilyMember } from '@/types/profile';

// Mock the profile store
jest.mock('@/stores/useProfileStore');
const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

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

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

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
      mockUseProfileStore.mockReturnValue({
        profile: null,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      expect(getByText('Loading family members...')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no family members exist', () => {
      mockUseProfileStore.mockReturnValue({
        profile: null,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      expect(getByText('No Family Members')).toBeTruthy();
      expect(getByText('Add family members to manage multiple travel profiles and streamline form completion for everyone.')).toBeTruthy();
      expect(getByText('Add First Member')).toBeTruthy();
    });

    it('should navigate to add family member from empty state', () => {
      mockUseProfileStore.mockReturnValue({
        profile: null,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      fireEvent.press(getByText('Add First Member'));
      expect(mockNavigate).toHaveBeenCalledWith('AddFamilyMember');
    });
  });

  describe('Family Members Display', () => {
    it('should display primary profile as self relationship', async () => {
      const mockLoadProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: mockLoadProfile,
      });

      const { getByText, getByTestId } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('family-member-primary-123')).toBeTruthy();
        expect(getByText('Alice Johnson')).toBeTruthy();
        expect(getByText('self')).toBeTruthy();
      });
    });

    it('should load family members on screen focus', () => {
      const mockLoadProfile = jest.fn().mockResolvedValue(undefined);
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: mockLoadProfile,
      });

      render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      expect(mockLoadProfile).toHaveBeenCalled();
    });

    it('should display multiple family members when available', async () => {
      const familyMembers = [
        mockPrimaryProfile,
        {
          id: 'spouse-456',
          givenNames: 'Bob',
          surname: 'Johnson',
          passportNumber: 'US1234568',
          nationality: 'USA',
          dateOfBirth: '1982-08-20',
          gender: 'M',
          passportExpiry: '2029-06-15',
          placeOfBirth: 'California',
          updatedAt: '2024-01-01T00:00:00Z',
          relationship: 'spouse'
        },
        {
          id: 'child-789',
          givenNames: 'Emma',
          surname: 'Johnson',
          passportNumber: 'US1234569',
          nationality: 'USA',
          dateOfBirth: '2015-12-03',
          gender: 'F',
          passportExpiry: '2025-12-03',
          placeOfBirth: 'Texas',
          updatedAt: '2024-01-01T00:00:00Z',
          relationship: 'child'
        }
      ];

      // Mock the expanded family state
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        familyMembers: familyMembers.slice(1), // Exclude primary profile
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText, getByTestId } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('family-member-primary-123')).toBeTruthy();
        expect(getByTestId('family-member-spouse-456')).toBeTruthy();
        expect(getByTestId('family-member-child-789')).toBeTruthy();
        expect(getByText('Alice Johnson')).toBeTruthy();
        expect(getByText('Bob Johnson')).toBeTruthy();
        expect(getByText('Emma Johnson')).toBeTruthy();
      });
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to add family member screen when add button is pressed', () => {
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      fireEvent.press(getByText('Add Member'));
      expect(mockNavigate).toHaveBeenCalledWith('AddFamilyMember');
    });

    it('should navigate to edit profile when editing primary member', async () => {
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getAllByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const editButtons = getAllByText('Edit');
        if (editButtons.length > 0) {
          fireEvent.press(editButtons[0]);
        }
      });

      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });

    it('should show alert for editing non-primary family members', async () => {
      const spouseMember = {
        ...mockPrimaryProfile,
        id: 'spouse-456',
        relationship: 'spouse'
      };

      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        familyMembers: [spouseMember],
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      // Mock Alert
      const mockAlert = jest.fn();
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Alert: {
          alert: mockAlert,
        },
      }));

      const { getAllByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const editButtons = getAllByText('Edit');
        if (editButtons.length > 1) {
          fireEvent.press(editButtons[1]); // Second edit button = spouse
        }
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Edit Family Member',
        'Family member editing coming soon!'
      );
    });
  });

  describe('Family Member Removal', () => {
    it('should show confirmation alert when removing family member', async () => {
      const childMember = {
        id: 'child-789',
        givenNames: 'Emma',
        surname: 'Johnson',
        passportNumber: 'US1234569',
        nationality: 'USA',
        dateOfBirth: '2015-12-03',
        gender: 'F' as const,
        passportExpiry: '2025-12-03',
        placeOfBirth: 'Texas',
        updatedAt: '2024-01-01T00:00:00Z',
        relationship: 'child' as const
      };

      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        familyMembers: [childMember],
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const mockAlert = jest.fn();
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Alert: {
          alert: mockAlert,
        },
      }));

      const { getAllByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const removeButtons = getAllByText('Remove');
        if (removeButtons.length > 0) {
          fireEvent.press(removeButtons[0]);
        }
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Remove Family Member',
        'Are you sure you want to remove Emma Johnson from your family profile? This action cannot be undone.',
        expect.arrayContaining([
          { text: 'Cancel', style: 'cancel' },
          expect.objectContaining({
            text: 'Remove',
            style: 'destructive'
          })
        ])
      );
    });

    it('should not show remove button for primary profile', async () => {
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { queryByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        // Primary profile mock only renders Edit, not Remove
        // (the mock renders Remove only when onRemove is provided)
        expect(queryByText('Remove')).toBeFalsy();
      });
    });
  });

  describe('Information Section', () => {
    it('should display family profiles information card', () => {
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      expect(getByText('About Family Profiles')).toBeTruthy();
      expect(getByText('• Each family member gets their own secure profile')).toBeTruthy();
      expect(getByText('• All data is stored locally on your device')).toBeTruthy();
      expect(getByText('• Scan multiple passports for quick setup')).toBeTruthy();
      expect(getByText('• Forms can be auto-filled for each family member')).toBeTruthy();
    });
  });

  describe('Screen Header', () => {
    it('should display correct header information', () => {
      mockUseProfileStore.mockReturnValue({
        profile: mockPrimaryProfile,
        loadProfile: jest.fn().mockResolvedValue(undefined),
      });

      const { getByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      expect(getByText('Family Members')).toBeTruthy();
      expect(getByText('Manage your family travel profiles')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle profile loading errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockLoadProfile = jest.fn().mockRejectedValue(new Error('Loading failed'));
      
      mockUseProfileStore.mockReturnValue({
        profile: null,
        loadProfile: mockLoadProfile,
      });

      render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load family members:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should stop loading state after error', async () => {
      const mockLoadProfile = jest.fn().mockRejectedValue(new Error('Loading failed'));
      
      mockUseProfileStore.mockReturnValue({
        profile: null,
        loadProfile: mockLoadProfile,
      });

      const { queryByText } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(queryByText('Loading family members...')).toBeFalsy();
      });
    });
  });
});