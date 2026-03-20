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
import { FamilyProfileCollection } from '@/types/family';

// Mock the profile store
jest.mock('@/stores/useProfileStore');
const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

const makeFamilyProfiles = (primaryId: string): FamilyProfileCollection => ({
  profiles: new Map([
    [primaryId, {
      id: primaryId,
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }],
  ]),
  primaryProfileId: primaryId,
  maxProfiles: 8,
  version: 1,
  lastModified: '2024-01-01T00:00:00Z',
});

// Helper to set up the store mock with the new multi-profile API
function setupProfileStoreMock(
  members: FamilyMember[],
  opts: {
    loadFamilyProfiles?: jest.Mock;
    getAllFamilyProfiles?: jest.Mock;
    deleteProfile?: jest.Mock;
    primaryId?: string;
  } = {}
) {
  const primaryId = opts.primaryId || (members[0]?.id ?? 'primary-123');
  const storeValue = {
    familyProfiles: makeFamilyProfiles(primaryId),
    loadFamilyProfiles: opts.loadFamilyProfiles ?? jest.fn().mockResolvedValue(undefined),
    getAllFamilyProfiles: opts.getAllFamilyProfiles ?? jest.fn().mockResolvedValue(members),
    deleteProfile: opts.deleteProfile ?? jest.fn().mockResolvedValue(undefined),
    // Legacy
    profile: members[0] ?? null,
    loadProfile: jest.fn().mockResolvedValue(undefined),
  };
  mockUseProfileStore.mockReturnValue(storeValue as any);
  (mockUseProfileStore as any).getState = () => storeValue;
  return storeValue;
}

// Mock navigation fully to avoid NavigationContainer getConstants error
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useFocusEffect: (callback: () => void) => {
    React.useEffect(() => { callback(); }, [callback]);
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
    LoadingStates: ({ text }: any) => <View><Text>{text}</Text></View>,
    LoadingState: ({ text }: any) => <View><Text>{text}</Text></View>,
  };
});

// Mock family member card
jest.mock('@/components/profile', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    FamilyMemberCard: ({ member, onEdit, onRemove, testID }: any) => (
      <View testID={testID ?? `family-member-${member.id}`}>
        <Text>{member.givenNames} {member.surname}</Text>
        <Text>{member.relationship}</Text>
        {onEdit && <TouchableOpacity onPress={onEdit} testID={`edit-${member.id}`}><Text>Edit</Text></TouchableOpacity>}
        {onRemove && <TouchableOpacity onPress={onRemove} testID={`remove-${member.id}`}><Text>Remove</Text></TouchableOpacity>}
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
      carryingCommercialGoods: false,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    relationship: 'self',
  };

  const mockSpouseProfile: FamilyMember = {
    id: 'spouse-456',
    givenNames: 'Bob',
    surname: 'Johnson',
    passportNumber: 'US9876543',
    nationality: 'USA',
    dateOfBirth: '1983-07-20',
    gender: 'M',
    passportExpiry: '2029-05-15',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    relationship: 'spouse',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  describe('Loading State', () => {
    it('should show loading spinner while loading family members', () => {
      setupProfileStoreMock([], {
        loadFamilyProfiles: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        getAllFamilyProfiles: jest.fn().mockReturnValue(new Promise(() => {})),
      });

      const { getByText } = render(<FamilyManagementScreen />);

      expect(getByText('Loading family members...')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no family members exist', async () => {
      setupProfileStoreMock([]);

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('No Family Members')).toBeTruthy();
        expect(getByText('Add family members to manage multiple travel profiles and streamline form completion for everyone.')).toBeTruthy();
        expect(getByText('Add First Member')).toBeTruthy();
      });
    });

    it('should navigate to add family member from empty state', async () => {
      setupProfileStoreMock([]);

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
      setupProfileStoreMock([mockPrimaryProfile]);

      const { getByText, getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('family-member-card-primary-123')).toBeTruthy();
        expect(getByText('Alice Johnson')).toBeTruthy();
        expect(getByText('self')).toBeTruthy();
      });
    });

    it('should display all family members including non-primary', async () => {
      setupProfileStoreMock([mockPrimaryProfile, mockSpouseProfile]);

      const { getByText, getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('family-member-card-primary-123')).toBeTruthy();
        expect(getByTestId('family-member-card-spouse-456')).toBeTruthy();
        expect(getByText('Alice Johnson')).toBeTruthy();
        expect(getByText('Bob Johnson')).toBeTruthy();
      });
    });

    it('should load family members on screen focus using loadFamilyProfiles', () => {
      const mockLoadFamilyProfiles = jest.fn().mockResolvedValue(undefined);
      setupProfileStoreMock([mockPrimaryProfile], { loadFamilyProfiles: mockLoadFamilyProfiles });

      render(<FamilyManagementScreen />);

      expect(mockLoadFamilyProfiles).toHaveBeenCalled();
    });

    it('should call getAllFamilyProfiles to get all members', async () => {
      const mockGetAll = jest.fn().mockResolvedValue([mockPrimaryProfile]);
      setupProfileStoreMock([mockPrimaryProfile], { getAllFamilyProfiles: mockGetAll });

      render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(mockGetAll).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to add family member screen when add button is pressed', async () => {
      setupProfileStoreMock([mockPrimaryProfile]);

      const { getByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByText('Add Member')).toBeTruthy();
      });

      fireEvent.press(getByText('Add Member'));
      expect(mockNavigate).toHaveBeenCalledWith('AddFamilyMember');
    });

    it('should navigate to EditProfile when editing primary (self) member', async () => {
      setupProfileStoreMock([mockPrimaryProfile]);

      const { getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('edit-primary-123')).toBeTruthy();
      });

      fireEvent.press(getByTestId('edit-primary-123'));
      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });

    it('should navigate to PassportScan with familyMode and profileId when editing non-self member', async () => {
      setupProfileStoreMock([mockPrimaryProfile, mockSpouseProfile]);

      const { getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('edit-spouse-456')).toBeTruthy();
      });

      fireEvent.press(getByTestId('edit-spouse-456'));
      expect(mockNavigate).toHaveBeenCalledWith('PassportScan', {
        familyMode: true,
        relationship: 'spouse',
        profileId: 'spouse-456',
      });
    });
  });

  describe('Family Member Removal', () => {
    it('should not show remove button for primary profile', async () => {
      setupProfileStoreMock([mockPrimaryProfile], { primaryId: 'primary-123' });

      const { queryByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(queryByTestId('remove-primary-123')).toBeFalsy();
      });
    });

    it('should show remove button for non-primary members', async () => {
      setupProfileStoreMock([mockPrimaryProfile, mockSpouseProfile], { primaryId: 'primary-123' });

      const { getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('remove-spouse-456')).toBeTruthy();
      });
    });

    it('should call deleteProfile after confirming removal of a non-primary member', async () => {
      const mockDeleteProfile = jest.fn().mockResolvedValue(undefined);
      const mockGetAll = jest.fn()
        .mockResolvedValueOnce([mockPrimaryProfile, mockSpouseProfile])
        .mockResolvedValueOnce([mockPrimaryProfile]);

      setupProfileStoreMock([mockPrimaryProfile, mockSpouseProfile], {
        primaryId: 'primary-123',
        deleteProfile: mockDeleteProfile,
        getAllFamilyProfiles: mockGetAll,
      });

      const { Alert } = require('react-native');
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
        ((...args: unknown[]) => {
          const buttons = args[2] as any[];
          // Simulate pressing "Remove" (destructive button)
          const destructive = buttons.find((b: any) => b.style === 'destructive');
          if (destructive?.onPress) destructive.onPress();
        }) as (...args: unknown[]) => any
      );

      const { getByTestId } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(getByTestId('remove-spouse-456')).toBeTruthy();
      });

      fireEvent.press(getByTestId('remove-spouse-456'));

      await waitFor(() => {
        expect(mockDeleteProfile).toHaveBeenCalledWith('spouse-456');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Information Section', () => {
    it('should display family profiles information card', async () => {
      setupProfileStoreMock([mockPrimaryProfile]);

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
      setupProfileStoreMock([mockPrimaryProfile]);

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
      setupProfileStoreMock([], {
        loadFamilyProfiles: jest.fn().mockRejectedValue(new Error('Loading failed')),
      });

      render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load family members:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should stop loading state after error', async () => {
      setupProfileStoreMock([], {
        loadFamilyProfiles: jest.fn().mockRejectedValue(new Error('Loading failed')),
      });

      const { queryByText } = render(<FamilyManagementScreen />);

      await waitFor(() => {
        expect(queryByText('Loading family members...')).toBeFalsy();
      });
    });
  });
});
