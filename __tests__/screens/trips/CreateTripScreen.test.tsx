/**
 * Unit tests for CreateTripScreen — template pre-fill behaviour.
 *
 * Covers:
 *  - Without templateId: screen renders "Create New Trip" header
 *  - With templateId: screen renders "Trip from Template" header with
 *    subtitle indicating dates must be set
 *  - With templateId: destinations are pre-populated from template legs
 *  - With templateId that doesn't exist: screen falls back to empty state
 *  - User can add/remove legs after loading from template
 */

import { render, screen, waitFor } from '@testing-library/react-native';
import CreateTripScreen from '@/screens/trips/CreateTripScreen/CreateTripScreen';

// ── Navigation ────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockNavigate = jest.fn();

let mockRouteParams: { templateId?: string } | undefined = undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// ── tripTemplateService ───────────────────────────────────────────────────────

import type { TripTemplate } from '@/types/trip';

const TEMPLATE_JAPAN_SG: TripTemplate = {
  id: 'tpl_test_1',
  name: 'Japan–Singapore Loop',
  legs: [
    { countryCode: 'JPN', typicalDurationDays: 7, order: 0 },
    { countryCode: 'SGP', typicalDurationDays: 3, order: 1 },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

jest.mock('@/services/trips/tripTemplateService', () => ({
  tripTemplateService: {
    getById: jest.fn((id: string) => {
      if (id === 'tpl_test_1') return TEMPLATE_JAPAN_SG;
      return null;
    }),
  },
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

describe('CreateTripScreen — without template', () => {
  beforeEach(() => {
    mockRouteParams = undefined;
    jest.clearAllMocks();
  });

  it('renders "Create New Trip" header when no templateId is provided', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(screen.getByText('Create New Trip')).toBeTruthy();
    });
  });

  it('shows the default subtitle', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(screen.getByText('Plan your multi-country journey')).toBeTruthy();
    });
  });
});

describe('CreateTripScreen — with templateId', () => {
  beforeEach(() => {
    mockRouteParams = { templateId: 'tpl_test_1' };
    jest.clearAllMocks();
  });

  it('renders "Trip from Template" header when templateId is provided', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(screen.getByText('Trip from Template')).toBeTruthy();
    });
  });

  it('shows the template-specific subtitle prompting user to set dates', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(
        screen.getByText('Destinations pre-filled from template — set your dates to continue'),
      ).toBeTruthy();
    });
  });

  it('pre-fills the trip name from the template', async () => {
    render(<CreateTripScreen />);
    // The trip name input should be pre-filled with the template name
    await waitFor(() => {
      const nameInput = screen.getByTestId('trip-name-field');
      expect(nameInput.props.value).toBe('Japan–Singapore Loop');
    });
  });

  it('pre-populates country selects for each template leg', async () => {
    render(<CreateTripScreen />);
    // Two legs from the template → two country selects
    await waitFor(() => {
      expect(screen.getByTestId('country-select-0')).toBeTruthy();
      expect(screen.getByTestId('country-select-1')).toBeTruthy();
    });
  });
});

describe('CreateTripScreen — with unknown templateId', () => {
  beforeEach(() => {
    mockRouteParams = { templateId: 'tpl_does_not_exist' };
    jest.clearAllMocks();
  });

  it('renders "Trip from Template" header but shows empty destinations', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(screen.getByText('Trip from Template')).toBeTruthy();
    });
    // No country selects since template was not found → no legs pre-filled
    expect(screen.queryByTestId('country-select-0')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Family empty state CTA
// ---------------------------------------------------------------------------

describe('CreateTripScreen — family empty state', () => {
  beforeEach(() => {
    mockRouteParams = undefined;
    jest.clearAllMocks();
  });

  it('shows "Traveling with family?" CTA when no family members exist', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('family-empty-state-card')).toBeTruthy();
    });
    expect(screen.getByText('Traveling with family?')).toBeTruthy();
    expect(screen.getByText('Add a travel companion')).toBeTruthy();
  });

  it('CTA button has correct accessibility properties', async () => {
    render(<CreateTripScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('add-companion-cta-button')).toBeTruthy();
    });
    const button = screen.getByTestId('add-companion-cta-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Add a travel companion');
  });
});
