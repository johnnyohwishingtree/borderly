/**
 * Accessibility tests for the ThemeSelector component.
 *
 * Verifies that the segmented control exposes correct accessibility roles,
 * labels, and state to screen readers (VoiceOver / TalkBack) for all three
 * theme options (System, Light, Dark).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import ThemeSelector from '../../../src/components/settings/ThemeSelector';
import type { ThemePreference } from '../../../src/utils/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSelector(value: ThemePreference, onValueChange = jest.fn()) {
  return render(
    <ThemeSelector
      value={value}
      onValueChange={onValueChange}
      testID="theme-selector"
    />,
  );
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

describe('ThemeSelector — container', () => {
  it('renders the root container with testID', () => {
    renderSelector('system');
    expect(screen.getByTestId('theme-selector')).toBeTruthy();
  });

  it('applies radiogroup accessibilityRole to the container', () => {
    renderSelector('system');
    const container = screen.getByTestId('theme-selector');
    expect(container.props.accessibilityRole).toBe('radiogroup');
  });

  it('labels the container as "Theme preference"', () => {
    renderSelector('system');
    const container = screen.getByTestId('theme-selector');
    expect(container.props.accessibilityLabel).toBe('Theme preference');
  });
});

// ---------------------------------------------------------------------------
// Individual option buttons
// ---------------------------------------------------------------------------

describe('ThemeSelector — option buttons render', () => {
  it('renders all three option buttons', () => {
    renderSelector('system');
    expect(screen.getByTestId('theme-selector-option-system')).toBeTruthy();
    expect(screen.getByTestId('theme-selector-option-light')).toBeTruthy();
    expect(screen.getByTestId('theme-selector-option-dark')).toBeTruthy();
  });

  it('each option has accessibilityRole="button"', () => {
    renderSelector('system');
    const ids = ['system', 'light', 'dark'] as const;
    ids.forEach(id => {
      const btn = screen.getByTestId(`theme-selector-option-${id}`);
      expect(btn.props.accessibilityRole).toBe('button');
    });
  });
});

// ---------------------------------------------------------------------------
// accessibilityLabel
// ---------------------------------------------------------------------------

describe('ThemeSelector — accessibilityLabel', () => {
  it('System button has descriptive accessibilityLabel', () => {
    renderSelector('system');
    const btn = screen.getByTestId('theme-selector-option-system');
    expect(btn.props.accessibilityLabel).toBe('Use system default theme');
  });

  it('Light button has descriptive accessibilityLabel', () => {
    renderSelector('light');
    const btn = screen.getByTestId('theme-selector-option-light');
    expect(btn.props.accessibilityLabel).toBe('Use light theme');
  });

  it('Dark button has descriptive accessibilityLabel', () => {
    renderSelector('dark');
    const btn = screen.getByTestId('theme-selector-option-dark');
    expect(btn.props.accessibilityLabel).toBe('Use dark theme');
  });
});

// ---------------------------------------------------------------------------
// accessibilityState.selected
// ---------------------------------------------------------------------------

describe('ThemeSelector — accessibilityState.selected when value="system"', () => {
  it('System option is selected', () => {
    renderSelector('system');
    const btn = screen.getByTestId('theme-selector-option-system');
    expect(btn.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('Light option is NOT selected', () => {
    renderSelector('system');
    const btn = screen.getByTestId('theme-selector-option-light');
    expect(btn.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('Dark option is NOT selected', () => {
    renderSelector('system');
    const btn = screen.getByTestId('theme-selector-option-dark');
    expect(btn.props.accessibilityState).toMatchObject({ selected: false });
  });
});

describe('ThemeSelector — accessibilityState.selected when value="light"', () => {
  it('Light option is selected', () => {
    renderSelector('light');
    const btn = screen.getByTestId('theme-selector-option-light');
    expect(btn.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('System option is NOT selected', () => {
    renderSelector('light');
    const btn = screen.getByTestId('theme-selector-option-system');
    expect(btn.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('Dark option is NOT selected', () => {
    renderSelector('light');
    const btn = screen.getByTestId('theme-selector-option-dark');
    expect(btn.props.accessibilityState).toMatchObject({ selected: false });
  });
});

describe('ThemeSelector — accessibilityState.selected when value="dark"', () => {
  it('Dark option is selected', () => {
    renderSelector('dark');
    const btn = screen.getByTestId('theme-selector-option-dark');
    expect(btn.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('System option is NOT selected', () => {
    renderSelector('dark');
    const btn = screen.getByTestId('theme-selector-option-system');
    expect(btn.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('Light option is NOT selected', () => {
    renderSelector('dark');
    const btn = screen.getByTestId('theme-selector-option-light');
    expect(btn.props.accessibilityState).toMatchObject({ selected: false });
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

describe('ThemeSelector — interaction', () => {
  it('calls onValueChange with "light" when Light is pressed', () => {
    const onValueChange = jest.fn();
    renderSelector('system', onValueChange);
    fireEvent.press(screen.getByTestId('theme-selector-option-light'));
    expect(onValueChange).toHaveBeenCalledWith('light');
  });

  it('calls onValueChange with "dark" when Dark is pressed', () => {
    const onValueChange = jest.fn();
    renderSelector('system', onValueChange);
    fireEvent.press(screen.getByTestId('theme-selector-option-dark'));
    expect(onValueChange).toHaveBeenCalledWith('dark');
  });

  it('calls onValueChange with "system" when System is pressed', () => {
    const onValueChange = jest.fn();
    renderSelector('light', onValueChange);
    fireEvent.press(screen.getByTestId('theme-selector-option-system'));
    expect(onValueChange).toHaveBeenCalledWith('system');
  });
});

// ---------------------------------------------------------------------------
// Text labels visible on screen
// ---------------------------------------------------------------------------

describe('ThemeSelector — visible text labels', () => {
  it('shows "System", "Light", and "Dark" labels', () => {
    renderSelector('system');
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
  });
});
