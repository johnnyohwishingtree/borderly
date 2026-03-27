/**
 * Unit tests for useQRDetail hook.
 *
 * Tests pure utility functions directly and hook behavior via renderHook.
 * Mocks databaseService at module level.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert, Share, Platform } from 'react-native';
import {
  useQRDetail,
  getTypeColor,
  getTypeLabel,
} from '@/hooks/useQRDetail';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFind = jest.fn();
const mockWrite = jest.fn();
const mockDestroyPermanently = jest.fn();

jest.mock('../../src/services/storage', () => ({
  databaseService: {
    getDatabase: jest.fn(() =>
      Promise.resolve({
        collections: {
          get: () => ({
            find: mockFind,
          }),
        },
        write: mockWrite,
      }),
    ),
  },
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});
jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeQRCode(overrides?: Record<string, unknown>) {
  return {
    id: 'qr-1',
    label: 'Japan Immigration',
    type: 'immigration' as const,
    imageBase64: 'iVBORw0KGgoAAAA==',
    savedAt: new Date('2026-01-15T10:30:00Z'),
    legId: 'leg-1',
    travelerId: 'traveler-1',
    destroyPermanently: mockDestroyPermanently,
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockResolvedValue(makeQRCode());
  mockWrite.mockImplementation(async (fn: () => Promise<void>) => fn());
  mockDestroyPermanently.mockResolvedValue(undefined);
});

// ── getTypeColor ──────────────────────────────────────────────────────────────

describe('getTypeColor', () => {
  it('returns blue classes for immigration', () => {
    expect(getTypeColor('immigration')).toContain('bg-blue-100');
  });

  it('returns green classes for customs', () => {
    expect(getTypeColor('customs')).toContain('bg-green-100');
  });

  it('returns red classes for health', () => {
    expect(getTypeColor('health')).toContain('bg-red-100');
  });

  it('returns purple classes for combined', () => {
    expect(getTypeColor('combined')).toContain('bg-purple-100');
  });

  it('returns gray classes for unknown type', () => {
    expect(getTypeColor('other' as any)).toContain('bg-gray-100');
  });
});

// ── getTypeLabel ──────────────────────────────────────────────────────────────

describe('getTypeLabel', () => {
  it('returns "Immigration" for immigration', () => {
    expect(getTypeLabel('immigration')).toBe('Immigration');
  });

  it('returns "Customs" for customs', () => {
    expect(getTypeLabel('customs')).toBe('Customs');
  });

  it('returns "Health" for health', () => {
    expect(getTypeLabel('health')).toBe('Health');
  });

  it('returns "Combined" for combined', () => {
    expect(getTypeLabel('combined')).toBe('Combined');
  });

  it('returns "Unknown" for unknown type', () => {
    expect(getTypeLabel('other' as any)).toBe('Unknown');
  });
});

// ── useQRDetail hook ──────────────────────────────────────────────────────────

describe('useQRDetail', () => {
  async function renderAndWaitForLoad(options?: { qrCodeId?: string; onLoadError?: jest.Mock }) {
    const onLoadError = options?.onLoadError ?? jest.fn();
    const qrCodeId = options?.qrCodeId ?? 'qr-1';
    const hook = renderHook(() => useQRDetail({ qrCodeId, onLoadError }));
    await waitFor(() => {
      expect(hook.result.current.isLoading).toBe(false);
    });
    return hook;
  }

  it('loads QR code on mount', async () => {
    const { result } = await renderAndWaitForLoad();

    expect(result.current.qrCode).toMatchObject({ label: 'Japan Immigration' });
  });

  it('shows error alert when loading fails', async () => {
    mockFind.mockRejectedValueOnce(new Error('Not found'));
    const onLoadError = jest.fn();

    const { result } = await renderAndWaitForLoad({ qrCodeId: 'bad-id', onLoadError });

    expect(result.current.qrCode).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to load QR code details.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Go Back' }),
      ]),
    );
  });

  it('handleViewFullScreen sets fullScreenVisible to true', async () => {
    const { result } = await renderAndWaitForLoad();

    act(() => {
      result.current.handleViewFullScreen();
    });
    expect(result.current.fullScreenVisible).toBe(true);
  });

  it('handleCloseFullScreen sets fullScreenVisible to false', async () => {
    const { result } = await renderAndWaitForLoad();

    act(() => {
      result.current.handleViewFullScreen();
    });
    expect(result.current.fullScreenVisible).toBe(true);

    act(() => {
      result.current.handleCloseFullScreen();
    });
    expect(result.current.fullScreenVisible).toBe(false);
  });

  it('handleShare shows error when no QR code image', async () => {
    mockFind.mockResolvedValueOnce(makeQRCode({ imageBase64: '' }));

    const { result } = await renderAndWaitForLoad();

    await act(async () => {
      await result.current.handleShare();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'No QR code image to share');
  });

  it('handleShare calls Share.share on Android', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'android';

    const { result } = await renderAndWaitForLoad();

    await act(async () => {
      await result.current.handleShare();
    });

    expect(Share.share).toHaveBeenCalledWith({
      message: 'QR Code: Japan Immigration',
      title: 'Share QR Code',
    });

    (Platform as any).OS = originalOS;
  });

  it('handleShare calls Share.share with URL on iOS', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'ios';

    const { result } = await renderAndWaitForLoad();

    await act(async () => {
      await result.current.handleShare();
    });

    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('data:image/png;base64,'),
        message: 'QR Code: Japan Immigration',
      }),
    );

    (Platform as any).OS = originalOS;
  });

  it('handleDelete shows confirmation alert', async () => {
    const { result } = await renderAndWaitForLoad();

    const onSuccess = jest.fn();
    act(() => {
      result.current.handleDelete(onSuccess);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete QR Code',
      expect.stringContaining('Japan Immigration'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
  });

  it('handleDelete deletes QR code when confirmed', async () => {
    const { result } = await renderAndWaitForLoad();

    const onSuccess = jest.fn();
    act(() => {
      result.current.handleDelete(onSuccess);
    });

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const deleteButton = alertButtons.find((b: any) => b.text === 'Delete');

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(mockDestroyPermanently).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'QR code deleted successfully',
      expect.any(Array),
    );
  });

  it('handleDelete shows error when deletion fails', async () => {
    mockDestroyPermanently.mockRejectedValueOnce(new Error('DB error'));

    const { result } = await renderAndWaitForLoad();

    const onSuccess = jest.fn();
    act(() => {
      result.current.handleDelete(onSuccess);
    });

    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const deleteButton = alertButtons.find((b: any) => b.text === 'Delete');

    await act(async () => {
      await deleteButton.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to delete QR code. Please try again.',
    );
  });

  it('handleDelete does nothing when no QR code', async () => {
    mockFind.mockRejectedValueOnce(new Error('Not found'));

    const { result } = await renderAndWaitForLoad({ qrCodeId: 'bad-id' });

    jest.clearAllMocks();
    const onSuccess = jest.fn();
    act(() => {
      result.current.handleDelete(onSuccess);
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
