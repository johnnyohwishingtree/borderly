/**
 * Accessibility tests for the ThemeSelector component.
 *
 * Verifies that the segmented control exposes correct accessibility roles,
 * labels, and state to screen readers (VoiceOver / TalkBack) for the
 * two theme options (Light, Dark).
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
    renderSelector('light');
    screen.getByTestId('theme-selector');
  });

  it('applies radiogroup accessibilityRole to the container', () => {
    renderSelector('light');
    const container = screen.getByTestId('theme-selector');
    expect(container.props.accessibilityRole).toBe('radiogroup');
  });

  it('labels the container as "Theme preference"', () => {
    renderSelector('light');
    const container = screen.getByTestId('theme-selector');
    expect(container.props.accessibilityLabel).toBe('Theme preference');
  });
});

// ---------------------------------------------------------------------------
// Individual option buttons
// ---------------------------------------------------------------------------

describe('ThemeSelector — option buttons render', () => {
  it('renders both option buttons', () => {
    renderSelector('light');
    screen.getByTestId('theme-selector-option-light');
    screen.getByTestId('theme-selector-option-dark');
  });

  it('each option has accessibilityRole="button"', () => {
    renderSelector('light');
    const ids = ['light', 'dark'] as const;
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

describe('ThemeSelector — accessibilityState.selected', () => {
  const themes: ThemePreference[] = ['light', 'dark'];

  it.each(themes)('sets selected state correctly when value is "%s"', (value) => {
    renderSelector(value);
    for (const theme of themes) {
      expect(
        screen.getByTestId(`theme-selector-option-${theme}`).props.accessibilityState,
      ).toMatchObject({ selected: theme === value });
    }
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

describe('ThemeSelector — interaction', () => {
  it('calls onValueChange with "light" when Light is pressed', () => {
    const onValueChange = jest.fn();
    renderSelector('dark', onValueChange);
    fireEvent.press(screen.getByTestId('theme-selector-option-light'));
    expect(onValueChange).toHaveBeenCalledWith('light');
  });

  it('calls onValueChange with "dark" when Dark is pressed', () => {
    const onValueChange = jest.fn();
    renderSelector('light', onValueChange);
    fireEvent.press(screen.getByTestId('theme-selector-option-dark'));
    expect(onValueChange).toHaveBeenCalledWith('dark');
  });
});

// ---------------------------------------------------------------------------
// Text labels visible on screen
// ---------------------------------------------------------------------------

describe('ThemeSelector — visible text labels', () => {
  it('shows "Light" and "Dark" labels', () => {
    renderSelector('light');
    screen.getByText('Light');
    screen.getByText('Dark');
  });

  it('does not show "System" option', () => {
    renderSelector('light');
    expect(screen.queryByText('System')).toBeNull();
  });
});
