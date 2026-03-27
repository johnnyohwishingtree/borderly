/**
 * Unit tests for useTemplates hook.
 *
 * Tests business logic via renderHook — no full React Native component rendering
 * needed. Each section verifies one concern: template loading, delete confirmation,
 * use-template navigation, rename flow, and rename target management.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTemplates } from '@/hooks/useTemplates';
import type { TripTemplate } from '@/types/trip';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // useFocusEffect behaves like useEffect — run the callback once on mount
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, [callback]);
  },
}));

const mockList = jest.fn<TripTemplate[], []>(() => []);
const mockDelete = jest.fn();
const mockRename = jest.fn();

jest.mock('../../src/services/trips/tripTemplateService', () => ({
  tripTemplateService: {
    list: (...args: unknown[]) => mockList(...(args as [])),
    delete: (...args: unknown[]) => mockDelete(...(args as [string])),
    rename: (...args: unknown[]) => mockRename(...(args as [string, string])),
  },
}));

jest.spyOn(Alert, 'alert');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTemplate = (overrides: Partial<TripTemplate> = {}): TripTemplate => ({
  id: 'tpl_1',
  name: 'Test Template',
  legs: [{ countryCode: 'JPN', typicalDurationDays: 7, order: 0 }],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockReturnValue([]);
});

// ── Initial state / loading ───────────────────────────────────────────────────

describe('useTemplates — initial state', () => {
  it('loads templates from service on mount', () => {
    const templates = [makeTemplate(), makeTemplate({ id: 'tpl_2', name: 'Second' })];
    mockList.mockReturnValue(templates);

    const { result } = renderHook(() => useTemplates());

    expect(mockList).toHaveBeenCalled();
    expect(result.current.templates).toEqual(templates);
  });

  it('initialises renameTarget as null and isRenaming as false', () => {
    const { result } = renderHook(() => useTemplates());

    expect(result.current.renameTarget).toBeNull();
    expect(result.current.isRenaming).toBe(false);
  });
});

// ── handleDelete ──────────────────────────────────────────────────────────────

describe('useTemplates — handleDelete', () => {
  it('shows an Alert with correct title and message', () => {
    const template = makeTemplate({ name: 'Japan Trip' });
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.handleDelete(template);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Template',
      'Are you sure you want to delete "Japan Trip"? This cannot be undone.',
      expect.any(Array),
    );
  });

  it('pressing Cancel does not call service.delete', () => {
    const template = makeTemplate();
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.handleDelete(template);
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const cancelButton = buttons.find((b) => b.text === 'Cancel');
    expect(cancelButton).toEqual(expect.objectContaining({ text: 'Cancel' }));

    // Cancel button has no onPress or calling it does nothing destructive
    if (cancelButton?.onPress) {
      cancelButton.onPress();
    }
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('pressing Delete calls service.delete and refreshes list', () => {
    const template = makeTemplate({ id: 'tpl_42' });
    const updatedList = [makeTemplate({ id: 'tpl_99', name: 'Remaining' })];
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.handleDelete(template);
    });

    // Set up the list mock to return updated data after deletion
    mockList.mockReturnValue(updatedList);

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const deleteButton = buttons.find((b) => b.text === 'Delete');
    expect(deleteButton).toEqual(expect.objectContaining({ text: 'Delete' }));

    act(() => {
      deleteButton!.onPress!();
    });

    expect(mockDelete).toHaveBeenCalledWith('tpl_42');
    // list is called on mount + after delete
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(result.current.templates).toEqual(updatedList);
  });
});

// ── handleUseTemplate ─────────────────────────────────────────────────────────

describe('useTemplates — handleUseTemplate', () => {
  it('navigates to CreateTrip with the templateId', () => {
    const template = makeTemplate({ id: 'tpl_abc' });
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.handleUseTemplate(template);
    });

    expect(mockNavigate).toHaveBeenCalledWith('CreateTrip', { templateId: 'tpl_abc' });
  });
});

// ── handleRenameConfirm ───────────────────────────────────────────────────────

describe('useTemplates — handleRenameConfirm', () => {
  it('calls service.rename, refreshes list, and clears renameTarget', () => {
    const template = makeTemplate({ id: 'tpl_5', name: 'Old Name' });
    const updatedList = [makeTemplate({ id: 'tpl_5', name: 'New Name' })];
    const { result } = renderHook(() => useTemplates());

    // Open rename first to set renameTarget
    act(() => {
      result.current.openRename(template);
    });
    expect(result.current.renameTarget).toEqual(template);

    mockList.mockReturnValue(updatedList);

    act(() => {
      result.current.handleRenameConfirm('New Name');
    });

    expect(mockRename).toHaveBeenCalledWith('tpl_5', 'New Name');
    expect(mockList).toHaveBeenCalled();
    expect(result.current.templates).toEqual(updatedList);
    expect(result.current.renameTarget).toBeNull();
    expect(result.current.isRenaming).toBe(false);
  });

  it('does nothing when renameTarget is null', () => {
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.handleRenameConfirm('New Name');
    });

    expect(mockRename).not.toHaveBeenCalled();
    expect(result.current.renameTarget).toBeNull();
  });
});

// ── openRename / closeRename ──────────────────────────────────────────────────

describe('useTemplates — openRename / closeRename', () => {
  it('openRename sets renameTarget to the given template', () => {
    const template = makeTemplate({ id: 'tpl_7', name: 'My Template' });
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.openRename(template);
    });

    expect(result.current.renameTarget).toEqual(template);
  });

  it('closeRename clears renameTarget to null', () => {
    const template = makeTemplate();
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.openRename(template);
    });
    expect(result.current.renameTarget).toEqual(template);

    act(() => {
      result.current.closeRename();
    });
    expect(result.current.renameTarget).toBeNull();
  });
});
