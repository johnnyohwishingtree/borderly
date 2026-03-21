import { useEffect, useRef, useCallback } from 'react';
import { AccessibilityInfo, findNodeHandle, View } from 'react-native';

interface UseAccessibilityFocusOptions {
  /**
   * When true, focus will be moved to the target element after `delay` ms.
   * Set this to the boolean that controls visibility (e.g., `isModalVisible`).
   */
  shouldFocus?: boolean;
  /**
   * Delay in milliseconds before setting focus.
   * Allows modal open animations to complete before announcing.
   * Defaults to 300 ms.
   */
  delay?: number;
}

interface UseAccessibilityFocusResult {
  /** Attach this ref to the element that should receive VoiceOver/TalkBack focus. */
  ref: React.RefObject<View | null>;
  /** Imperatively move focus to the referenced element. */
  focusElement: () => void;
}

/**
 * Manages VoiceOver / TalkBack focus for modals and screen transitions.
 *
 * When `shouldFocus` becomes `true`, this hook calls
 * `AccessibilityInfo.setAccessibilityFocus()` on the attached `ref` after a
 * short delay so that the modal open animation can complete first.
 *
 * When the modal closes, call `focusElement()` on the trigger's ref to return
 * focus to the element that opened the modal.
 *
 * @example
 * ```tsx
 * const { ref: modalTitleRef } = useAccessibilityFocus({ shouldFocus: isModalVisible });
 *
 * <Modal visible={isModalVisible}>
 *   <Text ref={modalTitleRef} accessibilityRole="header">Modal Title</Text>
 * </Modal>
 * ```
 */
export function useAccessibilityFocus({
  shouldFocus = false,
  delay = 300,
}: UseAccessibilityFocusOptions = {}): UseAccessibilityFocusResult {
  const ref = useRef<View>(null);

  const focusElement = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    // findNodeHandle accepts React.Component<any, any> — View satisfies this.
    const reactTag = findNodeHandle(node as unknown as React.Component<unknown, unknown>);
    if (reactTag != null) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }, []);

  useEffect(() => {
    if (!shouldFocus) return;
    const timer = setTimeout(focusElement, delay);
    return () => clearTimeout(timer);
  }, [shouldFocus, delay, focusElement]);

  return { ref, focusElement };
}
