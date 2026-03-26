import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/stores/useProfileStore';
import AddCompanionsScreen from '@/screens/onboarding/AddCompanionsScreen/AddCompanionsScreen';
import { FamilyMember, FamilyRelationship } from '@/types/profile';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ScreenContainer: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Button: ({ title, onPress, testID }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    ProgressBar: ({ progress }: any) => (
      <View testID="progress-bar">
        <Text>{progress}%</Text>
      </View>
    ),
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockFamilyMember = (overrides: Partial<FamilyMember> = {}): FamilyMember => ({
  id: 'member-1',
  passportNumber: 'AB123456',
  surname: 'DOE',
  givenNames: 'JANE',
  nationality: 'GBR',
  dateOfBirth: '1990-01-01',
  gender: 'F',
  passportExpiry: '2030-01-01',
  issuingCountry: 'GBR',
  relationship: 'spouse',
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('AddCompanionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as unknown as jest.Mock).mockReturnValue(mockNavigation);
    (useProfileStore as unknown as jest.Mock).mockReturnValue({
      getAllFamilyProfiles: jest.fn().mockResolvedValue([]),
      familyProfiles: [],
    });
  });

  it('renders the screen correctly with no companions', async () => {
    const { getByTestId, getByText } = render(<AddCompanionsScreen />);

    expect(getByTestId('add-companions-title')).toBeTruthy();
    expect(getByText('Traveling with family?')).toBeTruthy();
    expect(getByTestId('add-companion-button')).toBeTruthy();
    expect(getByTestId('companions-continue-button')).toBeTruthy();
  });

  it('renders title and subtitle with testIDs', () => {
    const { getByTestId } = render(<AddCompanionsScreen />);

    const title = getByTestId('add-companions-title');
    expect(title).toBeTruthy();
    expect(title.props.children).toBe('Traveling with family?');

    const subtitle = getByTestId('add-companions-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle.props.children).toBe(
      'Scan their passports now so forms auto-fill for everyone',
    );
  });

  it('shows "Skip for now" when no companions added', async () => {
    const { getByText } = render(<AddCompanionsScreen />);

    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('shows benefits section when no companions added', async () => {
    const { getByTestId, getByText } = render(<AddCompanionsScreen />);

    expect(getByTestId('benefits-section')).toBeTruthy();
    expect(getByText('Fill forms once for your whole family')).toBeTruthy();
    expect(getByText('Save ~15 minutes per country per person')).toBeTruthy();
    expect(getByText('Securely stored on this device only')).toBeTruthy();
  });

  it('shows relationship picker options when Add a companion is tapped', async () => {
    const { getByTestId } = render(<AddCompanionsScreen />);

    // Tap add companion button
    fireEvent.press(getByTestId('add-companion-button'));

    // All relationship options should be available
    await waitFor(() => {
      expect(getByTestId('relationship-option-spouse')).toBeTruthy();
      expect(getByTestId('relationship-option-child')).toBeTruthy();
      expect(getByTestId('relationship-option-parent')).toBeTruthy();
      expect(getByTestId('relationship-option-sibling')).toBeTruthy();
      expect(getByTestId('relationship-option-other')).toBeTruthy();
    });
  });

  const relationships: FamilyRelationship[] = ['spouse', 'child', 'parent', 'sibling', 'other'];

  it.each(relationships)('navigates to PassportScan with relationship: %s when %s option is selected', async (relationship) => {
    const { getByTestId } = render(<AddCompanionsScreen />);

    fireEvent.press(getByTestId('add-companion-button'));

    await waitFor(() => {
      expect(getByTestId(`relationship-option-${relationship}`)).toBeTruthy();
    });

    fireEvent.press(getByTestId(`relationship-option-${relationship}`));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PassportScan', {
      familyMode: true,
      relationship,
      returnTo: 'AddCompanions',
    });
  });

  it('closes the picker when close button is tapped without navigating', async () => {
    const { getByTestId } = render(<AddCompanionsScreen />);

    fireEvent.press(getByTestId('add-companion-button'));

    await waitFor(() => {
      expect(getByTestId('relationship-picker-close')).toBeTruthy();
    });

    fireEvent.press(getByTestId('relationship-picker-close'));

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('displays companions with correct relationship labels', async () => {
    (useProfileStore as unknown as jest.Mock).mockReturnValue({
      getAllFamilyProfiles: jest.fn().mockResolvedValue([
        mockFamilyMember({ id: 'member-1', relationship: 'spouse' }),
        mockFamilyMember({ id: 'member-2', relationship: 'child', givenNames: 'TOMMY', surname: 'DOE' }),
        mockFamilyMember({ id: 'member-3', relationship: 'other', givenNames: 'ALEX', surname: 'DOE' }),
      ]),
      familyProfiles: [],
    });

    const { getByTestId, getAllByText } = render(<AddCompanionsScreen />);

    await waitFor(() => {
      expect(getByTestId('companion-item-member-1')).toBeTruthy();
      expect(getByTestId('companion-item-member-2')).toBeTruthy();
      expect(getByTestId('companion-item-member-3')).toBeTruthy();
    });

    // Each relationship has the correct label
    expect(getAllByText('Spouse').length).toBeGreaterThan(0);
    expect(getAllByText('Child').length).toBeGreaterThan(0);
    expect(getAllByText('Other').length).toBeGreaterThan(0);
  });

  it('hides benefits section when companions are added', async () => {
    (useProfileStore as unknown as jest.Mock).mockReturnValue({
      getAllFamilyProfiles: jest.fn().mockResolvedValue([
        mockFamilyMember({ id: 'member-1', relationship: 'spouse' }),
      ]),
      familyProfiles: [],
    });

    const { queryByTestId } = render(<AddCompanionsScreen />);

    await waitFor(() => {
      expect(queryByTestId('benefits-section')).toBeNull();
    });
  });

  it('navigates to BiometricSetup when Continue is pressed', async () => {
    const { getByTestId } = render(<AddCompanionsScreen />);

    fireEvent.press(getByTestId('companions-continue-button'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('BiometricSetup');
  });
});
