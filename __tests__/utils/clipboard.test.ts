import Clipboard from '@react-native-clipboard/clipboard';
import { copyWithTimeout, CLIPBOARD_CLEAR_DELAY_MS } from '@/utils/clipboard';

jest.useFakeTimers();

// Override the global clipboard mock with a proper default-export shape so
// `import Clipboard from '@react-native-clipboard/clipboard'` resolves correctly.
jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
    getString: jest.fn().mockResolvedValue(''),
    hasString: jest.fn().mockResolvedValue(false),
  },
}));

const mockedSetString = jest.mocked(Clipboard.setString);

describe('clipboard utils', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    mockedSetString.mockClear();
  });

  it('CLIPBOARD_CLEAR_DELAY_MS is 60 seconds', () => {
    expect(CLIPBOARD_CLEAR_DELAY_MS).toBe(60_000);
  });

  it('copies the value to the clipboard immediately', () => {
    copyWithTimeout('test-value');
    expect(mockedSetString).toHaveBeenCalledWith('test-value');
  });

  it('clears the clipboard after 60 seconds', () => {
    copyWithTimeout('sensitive-data');

    // Clipboard should still contain the value before the timeout.
    expect(mockedSetString).toHaveBeenCalledTimes(1);
    expect(mockedSetString).toHaveBeenLastCalledWith('sensitive-data');

    // Advance time past the timeout.
    jest.advanceTimersByTime(CLIPBOARD_CLEAR_DELAY_MS);

    // Should now have been called a second time with an empty string.
    expect(mockedSetString).toHaveBeenCalledTimes(2);
    expect(mockedSetString).toHaveBeenLastCalledWith('');
  });

  it('does NOT clear the clipboard before 60 seconds', () => {
    copyWithTimeout('sensitive-data');

    // Advance to just before the timeout.
    jest.advanceTimersByTime(CLIPBOARD_CLEAR_DELAY_MS - 1);

    // Only the initial copy, no clear yet.
    expect(mockedSetString).toHaveBeenCalledTimes(1);
    expect(mockedSetString).toHaveBeenLastCalledWith('sensitive-data');
  });

  it('returns a cancel function that prevents clearing', () => {
    const cancel = copyWithTimeout('sensitive-data');

    // Cancel before the timeout fires.
    cancel();

    jest.advanceTimersByTime(CLIPBOARD_CLEAR_DELAY_MS);

    // Still only one call — the clear was cancelled.
    expect(mockedSetString).toHaveBeenCalledTimes(1);
  });

  it('cancelling a second time after timeout is a no-op', () => {
    const cancel = copyWithTimeout('value');

    jest.advanceTimersByTime(CLIPBOARD_CLEAR_DELAY_MS);

    expect(mockedSetString).toHaveBeenCalledTimes(2);

    // Calling cancel after the timer already fired should not throw or error.
    expect(() => cancel()).not.toThrow();
  });
});
