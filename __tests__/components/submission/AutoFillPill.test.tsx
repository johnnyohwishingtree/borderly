import { render, fireEvent } from '@testing-library/react-native';
import { AutoFillPill } from '../../../src/components/submission/AutoFillPill';
import type { ProfileOption } from '../../../src/components/submission/AutoFillPill';

jest.mock('lucide-react-native', () => ({
  Sparkles: 'Sparkles',
  X: 'X',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  User: 'User',
}));

// Mock ProfileSelector to simplify AutoFillPill tests
jest.mock('../../../src/components/submission/ProfileSelector', () => ({
  ProfileSelector: ({ profiles, selectedProfileId: _selectedProfileId, onSelect, testID }: {
    profiles: ProfileOption[];
    selectedProfileId: string;
    onSelect: (id: string) => void;
    testID?: string;
  }) => {
    const React = require('react');
    const { View, Pressable, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: testID ?? 'profile-selector' },
      profiles.map((p: ProfileOption) =>
        React.createElement(
          Pressable,
          {
            key: p.id,
            onPress: () => onSelect(p.id),
            testID: `profile-option-${p.id}`,
          },
          React.createElement(Text, null, `${p.name} (${p.relationship})`),
        ),
      ),
    );
  },
}));

const singleProfile: ProfileOption[] = [
  { id: 'p1', name: 'Alice Smith', relationship: 'self' },
];

const multipleProfiles: ProfileOption[] = [
  { id: 'p1', name: 'Alice Smith', relationship: 'self' },
  { id: 'p2', name: 'Bob Smith', relationship: 'spouse' },
  { id: 'p3', name: 'Charlie Smith', relationship: 'child' },
];

describe('AutoFillPill', () => {
  it('renders with default testID', () => {
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByTestId('autofill-pill')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
        testID="my-pill"
      />,
    );
    expect(getByTestId('my-pill')).toBeTruthy();
  });

  it('renders the Auto-fill Now button', () => {
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByTestId('autofill-pill-fill-button')).toBeTruthy();
  });

  it('renders the dismiss button', () => {
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByTestId('autofill-pill-dismiss')).toBeTruthy();
  });

  it('calls onAutoFill when Auto-fill Now button is pressed', () => {
    const onAutoFill = jest.fn();
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={onAutoFill}
        onDismiss={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('autofill-pill-fill-button'));
    expect(onAutoFill).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.press(getByTestId('autofill-pill-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button with correct accessibility label', () => {
    const { getByLabelText } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByLabelText('Dismiss auto-fill pill')).toBeTruthy();
  });

  it('shows Auto-fill Now button with correct accessibility label', () => {
    const { getByLabelText } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByLabelText('Auto-fill form fields now')).toBeTruthy();
  });

  // ─── Single profile ──────────────────────────────────────────────────────────

  it('does NOT render profile selector when only one profile is provided', () => {
    const { queryByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(queryByTestId('autofill-pill-profile-selector')).toBeNull();
  });

  it('shows single profile label when only one profile is provided', () => {
    const { getByTestId } = render(
      <AutoFillPill
        profiles={singleProfile}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    const label = getByTestId('autofill-pill-single-profile');
    expect(label.props.children).toContain('Alice Smith');
    expect(label.props.children).toContain('self');
  });

  // ─── Multiple profiles ───────────────────────────────────────────────────────

  it('renders the profile selector when multiple profiles are provided', () => {
    const { getByTestId } = render(
      <AutoFillPill
        profiles={multipleProfiles}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByTestId('autofill-pill-profile-selector')).toBeTruthy();
  });

  it('does NOT show single profile label when multiple profiles are provided', () => {
    const { queryByTestId } = render(
      <AutoFillPill
        profiles={multipleProfiles}
        selectedProfileId="p1"
        onProfileChange={jest.fn()}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(queryByTestId('autofill-pill-single-profile')).toBeNull();
  });

  it('calls onProfileChange when a profile is selected from the selector', () => {
    const onProfileChange = jest.fn();
    const { getByTestId } = render(
      <AutoFillPill
        profiles={multipleProfiles}
        selectedProfileId="p1"
        onProfileChange={onProfileChange}
        onAutoFill={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    // The mocked ProfileSelector exposes profile-option-{id} test IDs
    fireEvent.press(getByTestId('profile-option-p2'));
    expect(onProfileChange).toHaveBeenCalledWith('p2');
  });
});
