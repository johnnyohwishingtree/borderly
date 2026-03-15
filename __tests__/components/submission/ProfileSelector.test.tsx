import { render, fireEvent } from '@testing-library/react-native';
import { ProfileSelector } from '../../../src/components/submission/ProfileSelector';
import type { ProfileOption } from '../../../src/components/submission/ProfileSelector';

jest.mock('lucide-react-native', () => ({
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  User: 'User',
}));

const profiles: ProfileOption[] = [
  { id: 'p1', name: 'Alice Smith', relationship: 'self' },
  { id: 'p2', name: 'Bob Smith', relationship: 'spouse' },
  { id: 'p3', name: 'Charlie Smith', relationship: 'child' },
];

describe('ProfileSelector', () => {
  it('renders with default testID', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    expect(getByTestId('profile-selector')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
        testID="my-selector"
      />,
    );
    expect(getByTestId('my-selector')).toBeTruthy();
  });

  it('shows the trigger button', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    expect(getByTestId('profile-selector-trigger')).toBeTruthy();
  });

  it('shows the selected profile name and relationship in the trigger', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    const label = getByTestId('profile-selector-label');
    expect(label.props.children).toContain('Alice Smith');
    expect(label.props.children).toContain('self');
  });

  it('shows "Select profile" label when selectedProfileId is not in profiles', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="unknown"
        onSelect={jest.fn()}
      />,
    );
    expect(getByTestId('profile-selector-label').props.children).toBe('Select profile');
  });

  it('dropdown is closed by default', () => {
    const { queryByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    expect(queryByTestId('profile-selector-dropdown')).toBeNull();
  });

  it('opens dropdown when trigger is pressed', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));
    expect(getByTestId('profile-selector-dropdown')).toBeTruthy();
  });

  it('closes dropdown when trigger is pressed a second time', () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));
    expect(getByTestId('profile-selector-dropdown')).toBeTruthy();

    fireEvent.press(getByTestId('profile-selector-trigger'));
    expect(queryByTestId('profile-selector-dropdown')).toBeNull();
  });

  it('renders all profiles in the dropdown', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));

    expect(getByTestId('profile-option-p1')).toBeTruthy();
    expect(getByTestId('profile-option-p2')).toBeTruthy();
    expect(getByTestId('profile-option-p3')).toBeTruthy();
  });

  it('renders each profile with name and relationship', () => {
    const { getByTestId, getAllByText } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));

    // "Alice Smith (self)" appears in both the trigger label and the dropdown option
    expect(getAllByText('Alice Smith (self)').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Bob Smith (spouse)').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Charlie Smith (child)').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onSelect with the profile id when an option is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));
    fireEvent.press(getByTestId('profile-option-p2'));
    expect(onSelect).toHaveBeenCalledWith('p2');
  });

  it('closes the dropdown after an option is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));
    expect(getByTestId('profile-selector-dropdown')).toBeTruthy();

    fireEvent.press(getByTestId('profile-option-p2'));
    expect(queryByTestId('profile-selector-dropdown')).toBeNull();
  });

  it('shows a selected dot for the currently selected profile', () => {
    const { getByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p2"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));

    // Selected profile has a dot indicator
    expect(getByTestId('profile-selected-dot-p2')).toBeTruthy();
  });

  it('does not show selected dot for non-selected profiles', () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p2"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));

    expect(queryByTestId('profile-selected-dot-p1')).toBeNull();
    expect(queryByTestId('profile-selected-dot-p3')).toBeNull();
  });

  it('trigger has correct accessibility label', () => {
    const { getByLabelText } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    expect(getByLabelText('Select profile for auto-fill')).toBeTruthy();
  });

  it('each profile option has correct accessibility label', () => {
    const { getByTestId, getByLabelText } = render(
      <ProfileSelector
        profiles={profiles}
        selectedProfileId="p1"
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('profile-selector-trigger'));

    expect(getByLabelText('Select Alice Smith')).toBeTruthy();
    expect(getByLabelText('Select Bob Smith')).toBeTruthy();
    expect(getByLabelText('Select Charlie Smith')).toBeTruthy();
  });
});
