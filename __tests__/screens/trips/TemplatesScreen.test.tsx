import { render, fireEvent } from '@testing-library/react-native';
import TemplatesScreen, { TemplateCard } from '@/screens/trips/TemplatesScreen/TemplatesScreen';
import { useTemplates } from '@/hooks/useTemplates';
import type { TripTemplate } from '@/types/trip';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/hooks/useTemplates', () => ({
  useTemplates: jest.fn(),
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    BookmarkPlus: () => <View testID="icon-bookmark-plus" />,
    Pencil: () => <View testID="icon-pencil" />,
    Trash2: () => <View testID="icon-trash" />,
  };
});

jest.mock('@/components/trips', () => {
  const { View } = require('react-native');
  return {
    CountryFlag: ({ countryCode }: any) => <View testID={`flag-${countryCode}`} />,
  };
});

jest.mock('@/components/ui', () => {
  const { View, Text } = require('react-native');
  return {
    ScreenContainer: ({ children }: any) => <View testID="screen-container">{children}</View>,
    Card: ({ children }: any) => <View testID="card">{children}</View>,
    EmptyState: ({ title, description }: any) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        <Text>{description}</Text>
      </View>
    ),
  };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockHandleDelete = jest.fn();
const mockHandleUseTemplate = jest.fn();
const mockHandleRenameConfirm = jest.fn();
const mockOpenRename = jest.fn();
const mockCloseRename = jest.fn();

function makeTemplate(overrides?: Partial<TripTemplate>): TripTemplate {
  return {
    id: 'tpl-001',
    name: 'Japan Loop',
    legs: [
      { countryCode: 'JPN', typicalDurationDays: 7, order: 0 },
      { countryCode: 'SGP', typicalDurationDays: 3, order: 1 },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupHook(templates: TripTemplate[] = [], renameTarget: TripTemplate | null = null) {
  (useTemplates as unknown as jest.Mock).mockReturnValue({
    templates,
    renameTarget,
    isRenaming: false,
    handleDelete: mockHandleDelete,
    handleUseTemplate: mockHandleUseTemplate,
    handleRenameConfirm: mockHandleRenameConfirm,
    openRename: mockOpenRename,
    closeRename: mockCloseRename,
  });
}

// RNTL query option to include elements hidden by accessibilityViewIsModal
// or accessibilityElementsHidden
const INCLUDE_HIDDEN = { includeHiddenElements: true };

// ---------------------------------------------------------------------------
// TemplatesScreen — empty state
// ---------------------------------------------------------------------------

describe('TemplatesScreen — empty state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook([]);
  });

  it('renders the screen header', () => {
    const { getByText } = render(<TemplatesScreen />);
    getByText('Trip Templates', INCLUDE_HIDDEN);
  });

  it('shows empty state when no templates exist', () => {
    const { getByTestId } = render(<TemplatesScreen />);
    getByTestId('empty-state', INCLUDE_HIDDEN);
  });

  it('shows "No templates yet" in empty state', () => {
    const { getByText } = render(<TemplatesScreen />);
    getByText('No templates yet', INCLUDE_HIDDEN);
  });

  it('shows subtitle "Saved templates appear here" when empty', () => {
    const { getByText } = render(<TemplatesScreen />);
    getByText('Saved templates appear here', INCLUDE_HIDDEN);
  });

  it('does not render templates list when empty', () => {
    const { queryByTestId } = render(<TemplatesScreen />);
    expect(queryByTestId('templates-list')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TemplatesScreen — with templates
// ---------------------------------------------------------------------------

describe('TemplatesScreen — with templates', () => {
  const tpl1 = makeTemplate();
  const tpl2 = makeTemplate({ id: 'tpl-002', name: 'SEA Trip' });

  beforeEach(() => {
    jest.clearAllMocks();
    setupHook([tpl1, tpl2]);
  });

  it('renders the templates list', () => {
    const { getByTestId } = render(<TemplatesScreen />);
    getByTestId('templates-list', INCLUDE_HIDDEN);
  });

  it('does not show empty state when templates exist', () => {
    const { queryByTestId } = render(<TemplatesScreen />);
    expect(queryByTestId('empty-state')).toBeNull();
  });

  it('shows template count in header', () => {
    const { getByText } = render(<TemplatesScreen />);
    getByText('2 saved templates', INCLUDE_HIDDEN);
  });

  it('shows singular "template" for count of 1', () => {
    setupHook([tpl1]);
    const { getByText } = render(<TemplatesScreen />);
    getByText('1 saved template', INCLUDE_HIDDEN);
  });
});

// ---------------------------------------------------------------------------
// TemplateCard — rendering
// ---------------------------------------------------------------------------

describe('TemplateCard — rendering', () => {
  const template = makeTemplate();
  const defaultProps = {
    template,
    onRename: jest.fn(),
    onDelete: jest.fn(),
    onUse: jest.fn(),
  };

  it('displays the template name', () => {
    const { getByText } = render(<TemplateCard {...defaultProps} />);
    getByText('Japan Loop');
  });

  it('shows the "Use This Template" button', () => {
    const { getByText } = render(<TemplateCard {...defaultProps} />);
    getByText('Use This Template');
  });

  it('shows leg count (hidden from a11y tree, visible in render)', () => {
    const { getByText } = render(<TemplateCard {...defaultProps} />);
    getByText('2 legs', INCLUDE_HIDDEN);
  });

  it('shows singular "leg" for single-leg template', () => {
    const singleLeg = makeTemplate({
      legs: [{ countryCode: 'JPN', typicalDurationDays: 7, order: 0 }],
    });
    const { getByText } = render(<TemplateCard {...defaultProps} template={singleLeg} />);
    getByText('1 leg', INCLUDE_HIDDEN);
  });

  it('renders country flags (hidden from a11y tree)', () => {
    const { getByTestId } = render(<TemplateCard {...defaultProps} />);
    getByTestId('flag-JPN', INCLUDE_HIDDEN);
    getByTestId('flag-SGP', INCLUDE_HIDDEN);
  });
});

// ---------------------------------------------------------------------------
// TemplateCard — interactions
// ---------------------------------------------------------------------------

describe('TemplateCard — interactions', () => {
  const template = makeTemplate();
  const onRename = jest.fn();
  const onDelete = jest.fn();
  const onUse = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onRename when rename button is pressed', () => {
    const { getByTestId } = render(
      <TemplateCard template={template} onRename={onRename} onDelete={onDelete} onUse={onUse} />,
    );
    fireEvent.press(getByTestId('rename-template-tpl-001'));
    expect(onRename).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is pressed', () => {
    const { getByTestId } = render(
      <TemplateCard template={template} onRename={onRename} onDelete={onDelete} onUse={onUse} />,
    );
    fireEvent.press(getByTestId('delete-template-tpl-001'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onUse when use template button is pressed', () => {
    const { getByTestId } = render(
      <TemplateCard template={template} onRename={onRename} onDelete={onDelete} onUse={onUse} />,
    );
    fireEvent.press(getByTestId('use-template-tpl-001'));
    expect(onUse).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// TemplatesScreen — rename modal
// ---------------------------------------------------------------------------

describe('TemplatesScreen — rename modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows rename modal when renameTarget is set', () => {
    const tpl = makeTemplate();
    setupHook([tpl], tpl);
    const { getByTestId } = render(<TemplatesScreen />);
    getByTestId('rename-template-modal');
  });

  it('rename modal has cancel button', () => {
    const tpl = makeTemplate();
    setupHook([tpl], tpl);
    const { getByTestId } = render(<TemplatesScreen />);
    getByTestId('rename-modal-cancel');
  });

  it('calls closeRename when cancel is pressed in rename modal', () => {
    const tpl = makeTemplate();
    setupHook([tpl], tpl);
    const { getByTestId } = render(<TemplatesScreen />);
    fireEvent.press(getByTestId('rename-modal-cancel'));
    expect(mockCloseRename).toHaveBeenCalledTimes(1);
  });
});
