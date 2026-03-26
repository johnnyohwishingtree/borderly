import {
  ACCESSIBILITY_CONSTANTS,
  ScreenReaderUtils,
  AccessibilityStateHelpers,
  TouchTargetUtils,
  SemanticUtils,
  HighContrastUtils,
} from '../../src/utils/accessibility';
import { AccessibilityInfo } from 'react-native';

// ── Factories ──────────────────────────────────────────────────────────────

function createBaseStyles(overrides: Record<string, unknown> = {}) {
  return { color: '#333', backgroundColor: '#eee', borderWidth: 1, ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ACCESSIBILITY_CONSTANTS', () => {
  it('exposes expected constant values', () => {
    expect(ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET).toBe(44);
    expect(ACCESSIBILITY_CONSTANTS.MIN_COLOR_CONTRAST).toBe(4.5);
    expect(ACCESSIBILITY_CONSTANTS.MIN_COLOR_CONTRAST_LARGE).toBe(3);
    expect(ACCESSIBILITY_CONSTANTS.TIMEOUT_DURATION).toBe(300000);
  });
});

describe('ScreenReaderUtils', () => {
  describe('announce', () => {
    it('calls AccessibilityInfo.announceForAccessibility with the message', () => {
      ScreenReaderUtils.announce('Hello');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Hello');
    });

    it('does nothing for empty string', () => {
      (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear();
      ScreenReaderUtils.announce('');
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('does nothing for whitespace-only string', () => {
      (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear();
      ScreenReaderUtils.announce('   ');
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('schedules a timeout when options.timeout is provided', () => {
      jest.useFakeTimers();
      ScreenReaderUtils.announce('msg', { timeout: 1000 });
      expect(jest.getTimerCount()).toBe(1);
      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe('isScreenReaderEnabled', () => {
    it('returns true when screen reader is enabled', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      await expect(ScreenReaderUtils.isScreenReaderEnabled()).resolves.toBe(true);
    });

    it('returns false on error', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(ScreenReaderUtils.isScreenReaderEnabled()).resolves.toBe(false);
    });
  });

  describe('isReduceMotionEnabled', () => {
    it('returns true when reduce motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      await expect(ScreenReaderUtils.isReduceMotionEnabled()).resolves.toBe(true);
    });

    it('returns false on error', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(ScreenReaderUtils.isReduceMotionEnabled()).resolves.toBe(false);
    });
  });
});

describe('AccessibilityStateHelpers', () => {
  describe('createFormFieldState', () => {
    it('returns disabled: false by default', () => {
      expect(AccessibilityStateHelpers.createFormFieldState()).toEqual({ disabled: false });
    });

    it('returns disabled: true when isDisabled is true', () => {
      expect(AccessibilityStateHelpers.createFormFieldState(false, false, true)).toEqual({ disabled: true });
    });
  });

  describe('createButtonState', () => {
    it('returns correct defaults', () => {
      expect(AccessibilityStateHelpers.createButtonState()).toEqual({
        disabled: false,
        busy: false,
        selected: false,
      });
    });

    it('sets all fields correctly', () => {
      expect(AccessibilityStateHelpers.createButtonState(true, true, true)).toEqual({
        disabled: true,
        busy: true,
        selected: true,
      });
    });
  });

  describe('createToggleState', () => {
    it('sets checked and disabled', () => {
      expect(AccessibilityStateHelpers.createToggleState(true, false)).toEqual({
        checked: true,
        disabled: false,
      });
    });
  });
});

describe('TouchTargetUtils', () => {
  describe('ensureMinimumTouchTarget', () => {
    it('keeps dimensions at minimum when below threshold', () => {
      const result = TouchTargetUtils.ensureMinimumTouchTarget(20, 20);
      expect(result.width).toBe(44);
      expect(result.height).toBe(44);
    });

    it('keeps original dimensions when above threshold', () => {
      const result = TouchTargetUtils.ensureMinimumTouchTarget(60, 80);
      expect(result.width).toBe(60);
      expect(result.height).toBe(80);
    });
  });

  describe('getHitSlop', () => {
    it('returns zero slop when element is large enough', () => {
      const result = TouchTargetUtils.getHitSlop(44, 44);
      expect(result).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    });

    it('returns positive slop for small elements', () => {
      const result = TouchTargetUtils.getHitSlop(20, 30);
      expect(result.left).toBe(12);
      expect(result.right).toBe(12);
      expect(result.top).toBe(7);
      expect(result.bottom).toBe(7);
    });
  });
});

describe('SemanticUtils', () => {
  describe('generateFieldLabel', () => {
    it('returns just the label by default', () => {
      expect(SemanticUtils.generateFieldLabel('Name')).toBe('Name');
    });

    it('appends required when isRequired', () => {
      expect(SemanticUtils.generateFieldLabel('Name', true)).toBe('Name, required');
    });

    it('appends error message when hasError with message', () => {
      expect(SemanticUtils.generateFieldLabel('Name', false, true, 'Too short')).toBe(
        'Name, error: Too short',
      );
    });

    it('does not append error when no errorMessage provided', () => {
      expect(SemanticUtils.generateFieldLabel('Name', false, true)).toBe('Name');
    });
  });

  describe('generateNavigationLabel', () => {
    it('returns title only', () => {
      expect(SemanticUtils.generateNavigationLabel('Home')).toBe('Home');
    });

    it('appends position', () => {
      expect(SemanticUtils.generateNavigationLabel('Tab', { current: 1, total: 3 })).toBe(
        'Tab, 1 of 3',
      );
    });

    it('appends selected when active', () => {
      expect(SemanticUtils.generateNavigationLabel('Tab', undefined, true)).toBe('Tab, selected');
    });
  });

  describe('generateContentLabel', () => {
    it('heading with level', () => {
      expect(SemanticUtils.generateContentLabel('Title', 'heading', 2)).toBe(
        'Title, heading level 2',
      );
    });

    it('heading without level', () => {
      expect(SemanticUtils.generateContentLabel('Title', 'heading')).toBe('Title, heading');
    });

    it('list-item', () => {
      expect(SemanticUtils.generateContentLabel('Item', 'list-item')).toBe('Item, list item');
    });

    it('text returns content only', () => {
      expect(SemanticUtils.generateContentLabel('Hello', 'text')).toBe('Hello');
    });

    it('button', () => {
      expect(SemanticUtils.generateContentLabel('Submit', 'button')).toBe('Submit, button');
    });

    it('link', () => {
      expect(SemanticUtils.generateContentLabel('Docs', 'link')).toBe('Docs, link');
    });
  });
});

describe('HighContrastUtils', () => {
  describe('getHighContrastTextColor', () => {
    it('returns white for dark mode', () => {
      expect(HighContrastUtils.getHighContrastTextColor(true)).toBe('#FFFFFF');
    });

    it('returns black for light mode', () => {
      expect(HighContrastUtils.getHighContrastTextColor(false)).toBe('#000000');
    });
  });

  describe('applyHighContrastStyles', () => {
    it('returns base styles when high contrast is disabled', () => {
      const base = createBaseStyles();
      expect(HighContrastUtils.applyHighContrastStyles(base, false)).toBe(base);
    });

    it('overrides colors and ensures borderWidth >= 2 when enabled', () => {
      const base = createBaseStyles({ borderWidth: 1 });
      const result = HighContrastUtils.applyHighContrastStyles(base, true, false);
      expect(result.color).toBe('#000000');
      expect(result.backgroundColor).toBe('#FFFFFF');
      expect(result.borderColor).toBe('#000000');
      expect(result.borderWidth).toBe(2);
    });

    it('keeps borderWidth when already >= 2', () => {
      const base = createBaseStyles({ borderWidth: 4 });
      const result = HighContrastUtils.applyHighContrastStyles(base, true);
      expect(result.borderWidth).toBe(4);
    });
  });
});

