import Clipboard from '@react-native-clipboard/clipboard';

/** Duration (ms) after which clipboard is automatically cleared. */
export const CLIPBOARD_CLEAR_DELAY_MS = 60_000;

/**
 * Copy a string to the clipboard and schedule automatic clearing after
 * {@link CLIPBOARD_CLEAR_DELAY_MS} milliseconds (60 seconds).
 *
 * Returns a cleanup function that cancels the scheduled clear — useful in
 * tests or when the component unmounts before the timeout fires.
 */
export function copyWithTimeout(value: string): () => void {
  Clipboard.setString(value);

  const handle = setTimeout(() => {
    Clipboard.setString('');
  }, CLIPBOARD_CLEAR_DELAY_MS);

  return () => clearTimeout(handle);
}
