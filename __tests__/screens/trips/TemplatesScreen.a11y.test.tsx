/**
 * Accessibility tests for TemplatesScreen and TemplateCard.
 *
 * Covers:
 * - TemplatesScreen: FlatList list role, empty state
 * - TemplateCard: Rename / Delete / Use Template button roles, labels, hints
 * - TemplateCard: decorative elements hidden from screen readers
 *
 * TemplateCard is tested directly (it is exported from TemplatesScreen) to
 * avoid dealing with the FlatList mock's item-rendering behaviour.
 * TemplatesScreen-level tests cover the list label and empty state.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TemplatesScreen, {
  TemplateCard,
} from '../../../src/screens/trips/TemplatesScreen/TemplatesScreen';
import type { TripTemplate } from '../../../src/types/trip';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  // WeakMap prevents the infinite re-render loop: useFocusEffect's callback
  // calls setState → re-render → useFocusEffect(sameRef) → skip.
  // Each fresh render() creates a new component instance and therefore a new
  // useCallback reference, so the WeakMap entry is naturally per-render.
  const _tracker = new WeakMap<object, boolean>();
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      if (!_tracker.has(cb)) {
        _tracker.set(cb, true);
        cb();
      }
    },
  };
});

// Mock the tripTemplateService
const mockList = jest.fn<TripTemplate[], []>(() => []);
const mockDelete = jest.fn();
const mockRename = jest.fn();

jest.mock('../../../src/services/trips/tripTemplateService', () => ({
  tripTemplateService: {
    list: (...args: unknown[]) => mockList(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    rename: (...args: unknown[]) => mockRename(...args),
  },
}));

// Mock UI components
jest.mock('../../../src/components/ui', () => {
  const ReactModule = require('react');
  const { View, Text } = require('react-native');
  return {
    ScreenContainer: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, { testID: 'screen-container' }, children),
    Card: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, { testID: 'card' }, children),
    EmptyState: ({
      title,
      description,
    }: {
      title: string;
      description: string;
      icon?: React.ReactNode;
      variant?: string;
    }) =>
      ReactModule.createElement(
        View,
        { testID: 'empty-state' },
        ReactModule.createElement(Text, { testID: 'empty-state-title' }, title),
        ReactModule.createElement(Text, { testID: 'empty-state-description' }, description),
      ),
  };
});

// Mock CountryFlag — decorative
jest.mock('../../../src/components/trips', () => {
  const ReactModule = require('react');
  return {
    CountryFlag: () => ReactModule.createElement('View', { testID: 'country-flag' }),
  };
});

// Mock lucide icons — decorative
jest.mock('lucide-react-native', () => {
  const ReactModule = require('react');
  const Icon = () => ReactModule.createElement('View', { testID: 'lucide-icon' });
  return { BookmarkPlus: Icon, Pencil: Icon, Trash2: Icon };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTemplate(overrides: Partial<TripTemplate> = {}): TripTemplate {
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

const DEFAULT_CARD_PROPS = {
  template: makeTemplate(),
  onRename: jest.fn(),
  onDelete: jest.fn(),
  onUseTemplate: jest.fn(),
};

// ---------------------------------------------------------------------------
// Tree traversal helpers
// ---------------------------------------------------------------------------

/** Traverse the toJSON tree to find an element matching the predicate. */
function findInTree(
  node: unknown,
  predicate: (n: Record<string, unknown>) => boolean,
): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as Record<string, unknown>;
  if (predicate(n)) return n;
  const children = n.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

function hasTextInTree(node: unknown, text: string | RegExp): boolean {
  if (typeof node === 'string') {
    return typeof text === 'string' ? node.includes(text) : text.test(node);
  }
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  const children = n.children;
  if (Array.isArray(children)) return children.some(c => hasTextInTree(c, text));
  return false;
}

// ---------------------------------------------------------------------------
// TemplatesScreen — empty state
// ---------------------------------------------------------------------------

describe('TemplatesScreen — empty state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockReturnValue([]);
  });

  it('renders the empty state with "No templates yet" title', () => {
    render(<TemplatesScreen />);
    // Use UNSAFE_getAllByType to find Text elements (works with mocked react-native)
    const texts = screen.UNSAFE_getAllByType(require('react-native').Text);
    const titles = texts.map(t => t.props.children).flat();
    expect(titles.some(t => String(t).includes('No templates yet'))).toBe(true);
  });

  it('shows the empty state description about saving templates', () => {
    render(<TemplatesScreen />);
    const tree = screen.toJSON();
    expect(hasTextInTree(tree, /Save a trip as a template/)).toBe(true);
  });

  it('does not render the templates list when empty', () => {
    render(<TemplatesScreen />);
    // FlatList is not rendered when templates = []
    const list = findInTree(
      screen.toJSON(),
      n => (n.props as Record<string, unknown>)?.testID === 'templates-list',
    );
    expect(list).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TemplatesScreen — templates list accessible label
// ---------------------------------------------------------------------------

describe('TemplatesScreen — templates list accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockReturnValue([makeTemplate()]);
  });

  it('renders the FlatList when templates exist (no "No templates yet" shown)', () => {
    render(<TemplatesScreen />);
    // When templates are loaded, "No templates yet" text should NOT appear
    const texts = screen.UNSAFE_getAllByType(require('react-native').Text);
    const allText = texts.map(t => t.props.children).flat().join(' ');
    expect(allText).not.toContain('No templates yet');
  });

  it('FlatList has accessibilityLabel="List of saved trip templates"', () => {
    render(<TemplatesScreen />);
    // Find the FlatList element in the JSON tree by its testID
    const list = findInTree(
      screen.toJSON(),
      n => (n.props as Record<string, unknown>)?.testID === 'templates-list',
    );
    expect(list).toBeTruthy();
    expect((list!.props as Record<string, unknown>).accessibilityLabel).toBe(
      'List of saved trip templates',
    );
  });

  it('shows the template count in the header when templates are present', () => {
    render(<TemplatesScreen />);
    const tree = screen.toJSON();
    expect(hasTextInTree(tree, '1 saved template')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TemplateCard — Rename button
// ---------------------------------------------------------------------------

describe('TemplateCard — Rename button accessibility', () => {
  it('has accessible=true', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const rename = screen.getByTestId('rename-template-tpl-001');
    expect(rename.props.accessible).toBe(true);
  });

  it('has accessibilityRole="button"', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const rename = screen.getByTestId('rename-template-tpl-001');
    expect(rename.props.accessibilityRole).toBe('button');
  });

  it('label includes the template name', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const rename = screen.getByTestId('rename-template-tpl-001');
    expect(rename.props.accessibilityLabel).toMatch(/Japan Loop/);
  });

  it('label contains "Rename template"', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const rename = screen.getByTestId('rename-template-tpl-001');
    expect(rename.props.accessibilityLabel).toMatch(/Rename template/);
  });

  it('label reflects a different template name', () => {
    render(
      <TemplateCard
        {...DEFAULT_CARD_PROPS}
        template={makeTemplate({ id: 'tpl-002', name: 'SEA Trip' })}
      />,
    );
    expect(screen.getByTestId('rename-template-tpl-002').props.accessibilityLabel).toMatch(
      /SEA Trip/,
    );
  });
});

// ---------------------------------------------------------------------------
// TemplateCard — Delete button
// ---------------------------------------------------------------------------

describe('TemplateCard — Delete button accessibility', () => {
  it('has accessible=true', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const del = screen.getByTestId('delete-template-tpl-001');
    expect(del.props.accessible).toBe(true);
  });

  it('has accessibilityRole="button"', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const del = screen.getByTestId('delete-template-tpl-001');
    expect(del.props.accessibilityRole).toBe('button');
  });

  it('label includes the template name', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const del = screen.getByTestId('delete-template-tpl-001');
    expect(del.props.accessibilityLabel).toMatch(/Japan Loop/);
  });

  it('label contains "Delete template"', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const del = screen.getByTestId('delete-template-tpl-001');
    expect(del.props.accessibilityLabel).toMatch(/Delete template/);
  });

  it('label reflects a different template name', () => {
    render(
      <TemplateCard
        {...DEFAULT_CARD_PROPS}
        template={makeTemplate({ id: 'tpl-002', name: 'SEA Trip' })}
      />,
    );
    expect(screen.getByTestId('delete-template-tpl-002').props.accessibilityLabel).toMatch(
      /SEA Trip/,
    );
  });
});

// ---------------------------------------------------------------------------
// TemplateCard — Use Template button
// ---------------------------------------------------------------------------

describe('TemplateCard — Use Template button accessibility', () => {
  it('has accessible=true', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const useBtn = screen.getByTestId('use-template-tpl-001');
    expect(useBtn.props.accessible).toBe(true);
  });

  it('has accessibilityRole="button"', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const useBtn = screen.getByTestId('use-template-tpl-001');
    expect(useBtn.props.accessibilityRole).toBe('button');
  });

  it('label includes the template name', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const useBtn = screen.getByTestId('use-template-tpl-001');
    expect(useBtn.props.accessibilityLabel).toMatch(/Japan Loop/);
  });

  it('has an accessibilityHint describing navigation', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const useBtn = screen.getByTestId('use-template-tpl-001');
    expect(useBtn.props.accessibilityHint).toBeTruthy();
  });

  it('label reflects a different template name', () => {
    render(
      <TemplateCard
        {...DEFAULT_CARD_PROPS}
        template={makeTemplate({ id: 'tpl-002', name: 'SEA Trip' })}
      />,
    );
    expect(screen.getByTestId('use-template-tpl-002').props.accessibilityLabel).toMatch(/SEA Trip/);
  });

  it('shows "Use Template" text on the button', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    expect(screen.getByText('Use Template')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TemplateCard — decorative elements hidden from screen readers
// ---------------------------------------------------------------------------

describe('TemplateCard — decorative elements hidden', () => {
  it('flags and leg count row has accessibilityElementsHidden or importantForAccessibility', () => {
    render(<TemplateCard {...DEFAULT_CARD_PROPS} />);
    const tree = screen.toJSON();

    const findHidden = (node: unknown): boolean => {
      if (!node || typeof node !== 'object') return false;
      const n = node as Record<string, unknown>;
      const props = n.props as Record<string, unknown> | undefined;
      if (
        props?.accessibilityElementsHidden === true ||
        props?.importantForAccessibility === 'no-hide-descendants'
      ) {
        return true;
      }
      const children = n.children;
      if (Array.isArray(children)) return children.some(findHidden);
      return false;
    };

    expect(findHidden(tree)).toBe(true);
  });
});
