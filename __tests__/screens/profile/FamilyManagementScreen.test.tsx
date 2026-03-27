/**
 * Unit tests for FamilyManagementScreen.
 *
 * Covers rendering of family member list, add member button,
 * edit/remove actions, loading state, empty state, and removal Alert.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FamilyManagementScreen from '@/screens/profile/FamilyManagementScreen/FamilyManagementScreen';
import { useProfileStore } from '@/stores/useProfileStore';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

const mockFamilyMembers = [
  {
    id: 'primary-1',
    givenNames: 'JOHN',
    surname: 'SMITH',
    relationship: 'self' as const,
    nationality: 'USA',
    dateOfBirth: '1990-01-15',
    passportNumber: 'L12345678',
    gender: 'M',
    passportExpiry: '2030-06-20',
    issuingCountry: 'USA',
  },
  {
    id: 'family-2',
    givenNames: 'JANE',
    surname: 'SMITH',
    relationship: 'spouse' as const,
    nationality: 'USA',
    dateOfBirth: '1992-03-20',
    passportNumber: 'L87654321',
    gender: 'F',
    passportExpiry: '2031-01-10',
    issuingCountry: 'USA',
  },
];

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => { cb(); }, [cb]);
  },
}));

jest.mock('../../../src/utils/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#000', textSecondary: '#666', success: '#22c55e', accent: '#3b82f6' },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => {
  const RN = require('react');
  const Icon = ({ testID }: { testID?: string }) => RN.createElement('View', { testID });
  return { Users: Icon };
});

jest.mock('@/stores/useProfileStore');
const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

jest.mock('../../../src/components/ui', () => {
  const RN = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      RN.createElement('TouchableOpacity', { onPress, testID },
        RN.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      RN.createElement('View', props, children),
    EmptyState: ({ title, description, buttonProps }: any) =>
      RN.createElement('View', { testID: 'empty-state' },
        RN.createElement('Text', null, title),
        RN.createElement('Text', null, description),
        buttonProps && RN.createElement('TouchableOpacity', {
          onPress: buttonProps.onPress,
          testID: 'empty-state-button',
        }, RN.createElement('Text', null, buttonProps.title))),
    LoadingStates: ({ text }: any) =>
      RN.createElement('View', { testID: 'loading-state' },
        RN.createElement('Text', null, text)),
    ScreenContainer: ({ children, ...props }: any) =>
      RN.createElement('View', props, children),
  };
});

jest.mock('../../../src/components/profile', () => {
  const RN = require('react');
  return {
    FamilyMemberCard: ({ member, onEdit, onRemove, testID }: any) =>
      RN.createElement('View', { testID },
        RN.createElement('Text', null, `${member.givenNames} ${member.surname}`),
        RN.createElement('Text', null, member.relationship),
        onEdit && RN.createElement('TouchableOpacity', {
          onPress: onEdit,
          testID: `${testID}-edit`,
        }, RN.createElement('Text', null, 'Edit')),
        onRemove && RN.createElement('TouchableOpacity', {
          onPress: onRemove,
          testID: `${testID}-remove`,
        }, RN.createElement('Text', null, 'Remove'))),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupStore(opts: {
  members?: typeof mockFamilyMembers;
  loadFamilyProfiles?: jest.Mock;
  getAllFamilyProfiles?: jest.Mock;
  deleteProfile?: jest.Mock;
  primaryId?: string;
} = {}) {
  const storeValue = {
    familyProfiles: {
      primaryProfileId: opts.primaryId ?? 'primary-1',
      profiles: new Map(),
      maxProfiles: 8,
      version: 1,
      lastModified: '2024-01-01T00:00:00Z',
    },
    loadFamilyProfiles: opts.loadFamilyProfiles ?? jest.fn().mockResolvedValue(undefined),
    getAllFamilyProfiles: opts.getAllFamilyProfiles ?? jest.fn().mockResolvedValue(opts.members ?? mockFamilyMembers),
    deleteProfile: opts.deleteProfile ?? jest.fn().mockResolvedValue(undefined),
    profile: null,
    loadProfile: jest.fn().mockResolvedValue(undefined),
  };
  mockUseProfileStore.mockReturnValue(storeValue as any);
  (mockUseProfileStore as any).getState = () => storeValue;
  return storeValue;
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupStore();
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('FamilyManagementScreen — loading state', () => {
  it('shows loading indicator while loading family members', () => {
    setupStore({
      loadFamilyProfiles: jest.fn().mockReturnValue(new Promise(() => {})),
      getAllFamilyProfiles: jest.fn().mockReturnValue(new Promise(() => {})),
    });
    render(<FamilyManagementScreen />);
    screen.getByTestId('loading-state');
    screen.getByText('Loading family members...');
  });
});

// ── Family member list ────────────────────────────────────────────────────────

describe('FamilyManagementScreen — member list', () => {
  it('renders family member cards after loading', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByText('JOHN SMITH');
      screen.getByText('JANE SMITH');
    });
  });

  it('renders add member button', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('add-member-button');
    });
  });

  it('does not show remove button for primary profile', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByText('JOHN SMITH');
    });
    expect(screen.queryByTestId('family-member-card-primary-1-remove')).toBeNull();
  });

  it('shows remove button for non-primary family members', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('family-member-card-family-2-remove');
    });
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('FamilyManagementScreen — empty state', () => {
  it('shows empty state when no family members exist', async () => {
    setupStore({ members: [] });
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('empty-state');
      screen.getByText('No Family Members');
    });
  });

  it('renders "Add First Member" button in empty state', async () => {
    setupStore({ members: [] });
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByText('Add First Member');
    });
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('FamilyManagementScreen — navigation', () => {
  it('navigates to AddFamilyMember when Add Member is pressed', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('add-member-button');
    });

    fireEvent.press(screen.getByTestId('add-member-button'));
    expect(mockNavigate).toHaveBeenCalledWith('AddFamilyMember');
  });

  it('navigates to EditProfile when editing primary profile', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('family-member-card-primary-1-edit');
    });

    fireEvent.press(screen.getByTestId('family-member-card-primary-1-edit'));
    expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
  });

  it('navigates to PassportScan with familyMode when editing non-primary member', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('family-member-card-family-2-edit');
    });

    fireEvent.press(screen.getByTestId('family-member-card-family-2-edit'));
    expect(mockNavigate).toHaveBeenCalledWith('PassportScan', {
      familyMode: true,
      relationship: 'spouse',
      profileId: 'family-2',
    });
  });
});

// ── Remove member with Alert ──────────────────────────────────────────────────

describe('FamilyManagementScreen — remove member', () => {
  it('shows confirmation Alert when remove is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('family-member-card-family-2-remove');
    });

    fireEvent.press(screen.getByTestId('family-member-card-family-2-remove'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Remove Family Member',
      expect.stringContaining('JANE SMITH'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Remove', style: 'destructive' }),
      ]),
    );
  });

  it('calls deleteProfile when Remove is confirmed', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    setupStore({ deleteProfile: mockDelete });
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByTestId('family-member-card-family-2-remove');
    });

    fireEvent.press(screen.getByTestId('family-member-card-family-2-remove'));

    const alertButtons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => Promise<void> }>;
    const removeButton = alertButtons.find(b => b.text === 'Remove');
    await removeButton?.onPress?.();

    expect(mockDelete).toHaveBeenCalledWith('family-2');
  });
});

// ── Info card ─────────────────────────────────────────────────────────────────

describe('FamilyManagementScreen — info card', () => {
  it('renders About Family Profiles section', async () => {
    render(<FamilyManagementScreen />);

    await waitFor(() => {
      screen.getByText('About Family Profiles');
      screen.getByText(/Each family member gets their own secure profile/);
    });
  });
});
