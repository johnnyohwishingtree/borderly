/**
 * Unit tests for CreateTripScreen.
 */

import { render, screen, waitFor } from '@testing-library/react-native';
import CreateTripScreen from '@/screens/trips/CreateTripScreen/CreateTripScreen';

// ── Navigation ────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
}));

// ── Stores ────────────────────────────────────────────────────────────────────

jest.mock('@/stores/useTripStore', () => ({
  useTripStore: () => ({
    createTrip: jest.fn().mockResolvedValue({ id: 'trip_new' }),
    addTripLeg: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: jest.fn().mockResolvedValue(new Map()),
    loadFamilyProfiles: jest.fn().mockResolvedValue(undefined),
    activeProfile: null,
  }),
}));

// ── Native modules & heavy components ────────────────────────────────────────

jest.mock('@/components/help', () => ({
  ContextualHelp: () => null,
  HelpContent: { tripManagement: {} },
}));

jest.mock('@/components/boarding', () => ({
  BoardingPassScanner: () => null,
}));

jest.mock('@/components/import', () => ({
  SmartImportSheet: () => null,
}));

jest.mock('@/hooks/usePassportValidity', () => ({
  usePassportValidity: () => null,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateTripScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Create New Trip" header', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      screen.getByText('Create New Trip');
    });
  });

  it('shows the default subtitle', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      screen.getByText('Plan your multi-country journey');
    });
  });
});

// ---------------------------------------------------------------------------
// Family empty state CTA
// ---------------------------------------------------------------------------

describe('CreateTripScreen — family empty state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Traveling with family?" CTA when no family members exist', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      screen.getByTestId('family-empty-state-card');
    });
    screen.getByText('Traveling with family?');
    screen.getByText('Add a travel companion');
  });

  it('CTA button has correct accessibility properties', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      screen.getByTestId('add-companion-cta-button');
    });
    const button = screen.getByTestId('add-companion-cta-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Add a travel companion');
  });
});
