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

// Mock UI components
jest.mock('@/components/ui', () => ({
  Button: ({ title, onPress, testID }: any) => (
    <button onPress={onPress} testID={testID}>{title}</button>
  ),
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  EmptyState: ({ title, description, buttonProps, icon }: any) => (
    <div>
      {icon}
      <div>{title}</div>
      <div>{description}</div>
      {buttonProps && <button onPress={buttonProps.onPress}>{buttonProps.title}</button>}
    </div>
  ),
  LoadingSpinner: ({ text }: any) => <div>{text}</div>,
}));

// Mock family member card
jest.mock('@/components/profile', () => ({
  FamilyMemberCard: ({ member, onEdit, onRemove }: any) => (
    <div testID={`family-member-${member.id}`}>
      <span>{member.givenNames} {member.surname}</span>
      <span>{member.relationship}</span>
      {onEdit && <button onPress={onEdit}>Edit</button>}
      {onRemove && <button onPress={onRemove}>Remove</button>}
    </div>
  ),
}));

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
    placeOfBirth: 'New York',
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

      const { getByTestId } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const familyMemberCard = getByTestId('family-member-primary-123');
        const editButton = familyMemberCard.querySelector('button');
        if (editButton) {
          fireEvent.press(editButton);
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

      const { getByTestId } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const familyMemberCard = getByTestId('family-member-spouse-456');
        const editButton = familyMemberCard.querySelector('button');
        if (editButton) {
          fireEvent.press(editButton);
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

      const { getByTestId } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const familyMemberCard = getByTestId('family-member-child-789');
        const removeButton = Array.from(familyMemberCard.querySelectorAll('button'))
          .find(button => button.textContent === 'Remove');
        if (removeButton) {
          fireEvent.press(removeButton);
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

      const { getByTestId } = render(
        <TestWrapper>
          <FamilyManagementScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const familyMemberCard = getByTestId('family-member-primary-123');
        const removeButton = Array.from(familyMemberCard.querySelectorAll('button'))
          .find(button => button.textContent === 'Remove');
        expect(removeButton).toBeFalsy();
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

      const { getByText } = render(
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