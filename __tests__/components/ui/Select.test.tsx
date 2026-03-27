/**
 * Tests for Select component.
 * Covers: rendering, label, disabled, selection display, accessibility.
 *
 * Note: Select's trigger Pressable is not discoverable by RNTL's standard
 * getByRole/getByLabelText due to the component's accessibility tree structure.
 * We use UNSAFE_getAllByProps to locate the trigger element.
 */
import { render } from '@testing-library/react-native';
import Select from '../../../src/components/ui/Select';

const options = [
  { label: 'Japan', value: 'JPN' },
  { label: 'Singapore', value: 'SGP' },
  { label: 'Malaysia', value: 'MYS' },
];

/** Find the Select trigger via its accessibility role and label pattern. */
function findTrigger(utils: ReturnType<typeof render>) {
  const elements = utils.UNSAFE_getAllByProps({ accessibilityRole: 'button' });
  return elements.find(
    (el) =>
      el.props.accessibilityLabel &&
      el.props.accessibilityLabel.includes('Collapsed'),
  );
}

describe('Select', () => {
  it('shows "No selection" in accessibility label when no value is selected', () => {
    const utils = render(
      <Select options={options} onValueChange={jest.fn()} />,
    );
    const trigger = findTrigger(utils)!;
    expect(trigger.props.accessibilityLabel).toContain('No selection');
    expect(trigger.props.accessibilityLabel).toContain('Collapsed');
    expect(trigger.props.accessibilityState?.expanded).toBe(false);
  });

  it('renders label text when provided', () => {
    const { getByText } = render(
      <Select options={options} onValueChange={jest.fn()} label="Country" />,
    );
    getByText('Country');
  });

  it('trigger shows "No selection" when value is empty', () => {
    const utils = render(
      <Select options={options} onValueChange={jest.fn()} />,
    );
    const trigger = findTrigger(utils)!;
    expect(trigger.props.accessibilityLabel).toContain('No selection');
  });

  it('trigger shows selected option name', () => {
    const utils = render(
      <Select options={options} value="SGP" onValueChange={jest.fn()} />,
    );
    const trigger = findTrigger(utils)!;
    expect(trigger.props.accessibilityLabel).toContain('Singapore');
  });

  it('trigger includes error in accessibility label', () => {
    const utils = render(
      <Select
        options={options}
        onValueChange={jest.fn()}
        error="Required"
      />,
    );
    const trigger = findTrigger(utils)!;
    expect(trigger.props.accessibilityLabel).toContain('Required');
  });

  it('trigger has expanded: false when closed', () => {
    const utils = render(
      <Select options={options} onValueChange={jest.fn()} />,
    );
    const trigger = findTrigger(utils)!;
    expect(trigger.props.accessibilityState?.expanded).toBe(false);
  });

  it('trigger is disabled when disabled prop is true', () => {
    const utils = render(
      <Select options={options} onValueChange={jest.fn()} disabled />,
    );
    const trigger = findTrigger(utils)!;
    expect(trigger.props.disabled).toBe(true);
    expect(trigger.props.accessibilityState?.disabled).toBe(true);
  });
});
