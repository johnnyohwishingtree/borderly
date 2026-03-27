/**
 * Unit tests for useTripDetailModals hook.
 *
 * Tests modal open/close, accessibility focus management, duplicate trip
 * confirmation, add destination flow, and save-as-template flow.
 * Mocks useAccessibilityFocus at module level with stable references.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useTripDetailModals } from '@/hooks/useTripDetailModals';

// -- Mocks --------------------------------------------------------------------

const mockFocusFns: Record<string, jest.Mock> = {};

function getMockFocus(key: string): jest.Mock {
  if (!mockFocusFns[key]) {
    mockFocusFns[key] = jest.fn();
  }
  return mockFocusFns[key];
}

/**
 * Track which call index we're on within each render cycle.
 * The hook calls useAccessibilityFocus 5 times in a stable order:
 *   0: editTrigger (no opts)
 *   1: addTrigger (no opts)
 *   2: duplicateTrigger (no opts)
 *   3: editModalTitle (shouldFocus=showEditModal)
 *   4: addModalTitle (shouldFocus=showAddModal)
 *
 * We use a per-render counter reset via useRef-like tracking.
 */
let renderCallIndex = 0;
const callKeys = [
  'editTrigger',
  'addTrigger',
  'duplicateTrigger',
  'editModalTitle',
  'addModalTitle',
];

jest.mock('../../src/hooks/useAccessibilityFocus', () => ({
  useAccessibilityFocus: () => {
    const key = callKeys[renderCallIndex % callKeys.length];
    renderCallIndex++;
    return {
      ref: { current: null },
      focusElement: getMockFocus(key),
    };
  },
}));

// -- Fixtures -----------------------------------------------------------------

interface MockOptions {
  editHook: {
    legEdit: { cancelEditLeg: jest.Mock };
    addDestination: {
      startAddDestination: jest.Mock;
      cancelAddDestination: jest.Mock;
      handleAddDestination: jest.Mock;
    };
  };
  resetDuplicateError: jest.Mock;
  handleConfirmDuplicate: jest.Mock;
  handleSaveAsTemplate: jest.Mock;
  navigateToTrip: jest.Mock;
}

function makeOptions(): MockOptions {
  return {
    editHook: {
      legEdit: { cancelEditLeg: jest.fn() },
      addDestination: {
        startAddDestination: jest.fn(),
        cancelAddDestination: jest.fn(),
        handleAddDestination: jest.fn().mockResolvedValue(true),
      },
    },
    resetDuplicateError: jest.fn(),
    handleConfirmDuplicate: jest.fn().mockResolvedValue({ id: 'new-trip-1' }),
    handleSaveAsTemplate: jest.fn().mockResolvedValue(true),
    navigateToTrip: jest.fn(),
  };
}

// -- Setup --------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  renderCallIndex = 0;
  // Clear per-key mocks
  for (const key of Object.keys(mockFocusFns)) {
    mockFocusFns[key].mockClear();
  }
});

afterEach(() => {
  jest.useRealTimers();
});

// -- Tests --------------------------------------------------------------------

describe('useTripDetailModals', () => {
  it('initializes with all modals closed', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    expect(result.current.showEditModal).toBe(false);
    expect(result.current.showAddModal).toBe(false);
    expect(result.current.showSaveTemplateModal).toBe(false);
    expect(result.current.showDuplicateModal).toBe(false);
  });

  // -- Edit modal -------------------------------------------------------------

  it('opens edit modal via setShowEditModal', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.setShowEditModal(true);
    });

    expect(result.current.showEditModal).toBe(true);
  });

  it('closes edit modal and restores focus', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.setShowEditModal(true);
    });

    act(() => {
      result.current.handleCloseEditModal();
    });

    expect(result.current.showEditModal).toBe(false);
    expect(opts.editHook.legEdit.cancelEditLeg).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getMockFocus('editTrigger')).toHaveBeenCalled();
  });

  // -- Add destination modal --------------------------------------------------

  it('opens add destination modal and calls startAddDestination', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenAddDestination();
    });

    expect(opts.editHook.addDestination.startAddDestination).toHaveBeenCalled();
    expect(result.current.showAddModal).toBe(true);
  });

  it('closes add destination modal and restores focus', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenAddDestination();
    });

    act(() => {
      result.current.handleCloseAddModal();
    });

    expect(result.current.showAddModal).toBe(false);
    expect(opts.editHook.addDestination.cancelAddDestination).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getMockFocus('addTrigger')).toHaveBeenCalled();
  });

  it('handleConfirmAddDestination closes modal on success', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenAddDestination();
    });

    await act(async () => {
      await result.current.handleConfirmAddDestination();
    });

    expect(opts.editHook.addDestination.handleAddDestination).toHaveBeenCalled();
    expect(result.current.showAddModal).toBe(false);
  });

  it('handleConfirmAddDestination keeps modal open on failure', async () => {
    const opts = makeOptions();
    opts.editHook.addDestination.handleAddDestination.mockResolvedValue(false);
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenAddDestination();
    });

    await act(async () => {
      await result.current.handleConfirmAddDestination();
    });

    expect(result.current.showAddModal).toBe(true);
  });

  // -- Duplicate modal --------------------------------------------------------

  it('opens duplicate modal and resets error', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenDuplicateModal();
    });

    expect(result.current.showDuplicateModal).toBe(true);
    expect(opts.resetDuplicateError).toHaveBeenCalled();
  });

  it('closes duplicate modal, resets error, and restores focus', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenDuplicateModal();
    });

    act(() => {
      result.current.handleCloseDuplicateModal();
    });

    expect(result.current.showDuplicateModal).toBe(false);
    expect(opts.resetDuplicateError).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getMockFocus('duplicateTrigger')).toHaveBeenCalled();
  });

  it('handleDuplicateConfirm navigates on success', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenDuplicateModal();
    });

    await act(async () => {
      await result.current.handleDuplicateConfirm('2026-06-01');
    });

    expect(opts.handleConfirmDuplicate).toHaveBeenCalledWith('2026-06-01');
    expect(result.current.showDuplicateModal).toBe(false);
    expect(opts.navigateToTrip).toHaveBeenCalledWith('new-trip-1');
  });

  it('handleDuplicateConfirm keeps modal open on failure', async () => {
    const opts = makeOptions();
    opts.handleConfirmDuplicate.mockResolvedValue(null);
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.handleOpenDuplicateModal();
    });

    await act(async () => {
      await result.current.handleDuplicateConfirm('2026-06-01');
    });

    expect(result.current.showDuplicateModal).toBe(true);
    expect(opts.navigateToTrip).not.toHaveBeenCalled();
  });

  // -- Save as template modal -------------------------------------------------

  it('opens save template modal via setShowSaveTemplateModal', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.setShowSaveTemplateModal(true);
    });

    expect(result.current.showSaveTemplateModal).toBe(true);
  });

  it('onSaveAsTemplate closes modal on success', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.setShowSaveTemplateModal(true);
    });

    await act(async () => {
      await result.current.onSaveAsTemplate('My Template');
    });

    expect(opts.handleSaveAsTemplate).toHaveBeenCalledWith('My Template');
    expect(result.current.showSaveTemplateModal).toBe(false);
  });

  it('onSaveAsTemplate keeps modal open on failure', async () => {
    const opts = makeOptions();
    opts.handleSaveAsTemplate.mockResolvedValue(false);
    const { result } = renderHook(() => useTripDetailModals(opts));

    act(() => {
      result.current.setShowSaveTemplateModal(true);
    });

    await act(async () => {
      await result.current.onSaveAsTemplate('My Template');
    });

    expect(result.current.showSaveTemplateModal).toBe(true);
  });

  // -- Refs exposed -----------------------------------------------------------

  it('exposes accessibility refs for trigger elements', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useTripDetailModals(opts));

    expect(result.current.editTriggerRef).toBeDefined();
    expect(result.current.addTriggerRef).toBeDefined();
    expect(result.current.duplicateTriggerRef).toBeDefined();
    expect(result.current.editModalTitleRef).toBeDefined();
    expect(result.current.addModalTitleRef).toBeDefined();
  });
});
