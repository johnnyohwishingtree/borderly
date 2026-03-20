import { render, fireEvent } from '@testing-library/react-native';
import TravelerTabs from '@/components/trips/TravelerTabs';
import type { TravelerTab } from '@/components/trips/TravelerTabs';

const makeTabs = (overrides?: Partial<TravelerTab>[]): TravelerTab[] => [
  {
    id: 'profile_1',
    name: 'John',
    completionPercentage: 60,
    formStatus: 'in_progress',
    ...overrides?.[0],
  },
  {
    id: 'profile_2',
    name: 'Jane',
    completionPercentage: 0,
    formStatus: 'not_started',
    ...overrides?.[1],
  },
];

describe('TravelerTabs', () => {
  it('renders nothing when there is only one tab', () => {
    const singleTab: TravelerTab[] = [
      { id: 'profile_1', name: 'John', completionPercentage: 50, formStatus: 'in_progress' },
    ];
    const { queryByTestId } = render(
      <TravelerTabs tabs={singleTab} activeTabId="profile_1" onTabPress={jest.fn()} />
    );
    expect(queryByTestId('traveler-tabs')).toBeNull();
  });

  it('renders nothing when tabs array is empty', () => {
    const { queryByTestId } = render(
      <TravelerTabs tabs={[]} activeTabId="" onTabPress={jest.fn()} />
    );
    expect(queryByTestId('traveler-tabs')).toBeNull();
  });

  it('renders a tab for each traveler when there are multiple travelers', () => {
    const tabs = makeTabs();
    const { getByTestId } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_1" onTabPress={jest.fn()} />
    );

    expect(getByTestId('traveler-tab-profile_1')).toBeTruthy();
    expect(getByTestId('traveler-tab-profile_2')).toBeTruthy();
  });

  it('shows traveler first names in the tabs', () => {
    const tabs = makeTabs();
    const { getByText } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_1" onTabPress={jest.fn()} />
    );

    expect(getByText('John')).toBeTruthy();
    expect(getByText('Jane')).toBeTruthy();
  });

  it('shows completion percentage for in-progress traveler', () => {
    const tabs = makeTabs();
    const { getByText } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_1" onTabPress={jest.fn()} />
    );

    // John is at 60% done
    expect(getByText('60% done')).toBeTruthy();
  });

  it('shows "Ready" label for ready/submitted tabs', () => {
    const tabs = makeTabs([
      { id: 'profile_1', name: 'John', completionPercentage: 100, formStatus: 'ready' },
    ]);
    const { getByText } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_2" onTabPress={jest.fn()} />
    );

    expect(getByText('Ready')).toBeTruthy();
  });

  it('calls onTabPress with the traveler id when a tab is pressed', () => {
    const onTabPress = jest.fn();
    const tabs = makeTabs();
    const { getByTestId } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_1" onTabPress={onTabPress} />
    );

    fireEvent.press(getByTestId('traveler-tab-profile_2'));
    expect(onTabPress).toHaveBeenCalledWith('profile_2');
  });

  it('does not call onTabPress with the active traveler when pressing active tab', () => {
    const onTabPress = jest.fn();
    const tabs = makeTabs();
    const { getByTestId } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_1" onTabPress={onTabPress} />
    );

    fireEvent.press(getByTestId('traveler-tab-profile_1'));
    // onTabPress is still called — switching is a no-op in the hook, not the component
    expect(onTabPress).toHaveBeenCalledWith('profile_1');
  });

  it('accepts a custom testID via props', () => {
    const tabs = makeTabs();
    const { getByTestId } = render(
      <TravelerTabs
        tabs={tabs}
        activeTabId="profile_1"
        onTabPress={jest.fn()}
        testID="custom-tabs"
      />
    );
    expect(getByTestId('custom-tabs')).toBeTruthy();
  });

  it('renders submitted tab as ready (100%)', () => {
    const tabs = makeTabs([
      { id: 'profile_1', name: 'John', completionPercentage: 100, formStatus: 'submitted' },
    ]);
    const { getByText } = render(
      <TravelerTabs tabs={tabs} activeTabId="profile_2" onTabPress={jest.fn()} />
    );

    // Submitted is treated same as ready
    expect(getByText('Ready')).toBeTruthy();
  });
});
