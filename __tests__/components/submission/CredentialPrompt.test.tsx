import { render, fireEvent } from '@testing-library/react-native';
import { CredentialPrompt } from '../../../src/components/submission/CredentialPrompt';

describe('CredentialPrompt', () => {
  const baseProps = {
    visible: true,
    portalName: 'Visit Japan Web',
    onSave: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when visible is true', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);
    expect(getByTestId('credential-prompt-modal')).toBeTruthy();
  });

  it('renders with a custom testID', () => {
    const { getByTestId } = render(
      <CredentialPrompt {...baseProps} testID="my-cred-prompt" />
    );
    expect(getByTestId('my-cred-prompt')).toBeTruthy();
  });

  it('renders default title when no title prop is provided', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);
    expect(getByTestId('credential-prompt-title').props.children).toBe(
      'Save login credentials?'
    );
  });

  it('renders custom title when provided', () => {
    const { getByTestId } = render(
      <CredentialPrompt {...baseProps} title="Account created!" />
    );
    expect(getByTestId('credential-prompt-title').props.children).toBe('Account created!');
  });

  it('renders subtitle with portal name by default', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);
    const text = getByTestId('credential-prompt-subtitle').props.children;
    expect(text).toContain('Visit Japan Web');
  });

  it('renders custom subtitle when provided', () => {
    const { getByTestId } = render(
      <CredentialPrompt {...baseProps} subtitle="Custom subtitle text" />
    );
    expect(getByTestId('credential-prompt-subtitle').props.children).toBe('Custom subtitle text');
  });

  it('pre-fills username from initialUsername prop', () => {
    const { getByTestId } = render(
      <CredentialPrompt {...baseProps} initialUsername="alice@example.com" />
    );
    expect(getByTestId('credential-prompt-username').props.value).toBe('alice@example.com');
  });

  it('renders username and password inputs', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);
    expect(getByTestId('credential-prompt-username')).toBeTruthy();
    expect(getByTestId('credential-prompt-password')).toBeTruthy();
  });

  it('password field starts with secureTextEntry', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);
    expect(getByTestId('credential-prompt-password').props.secureTextEntry).toBe(true);
  });

  it('toggles password visibility when toggle button is pressed', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);

    // Initially hidden
    expect(getByTestId('credential-prompt-password').props.secureTextEntry).toBe(true);

    // Tap toggle
    fireEvent.press(getByTestId('credential-prompt-toggle-password'));

    // Now visible
    expect(getByTestId('credential-prompt-password').props.secureTextEntry).toBe(false);
  });

  it('calls onSkip when Skip button is pressed', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<CredentialPrompt {...baseProps} onSkip={onSkip} />);
    fireEvent.press(getByTestId('credential-prompt-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when backdrop is pressed', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<CredentialPrompt {...baseProps} onSkip={onSkip} />);
    fireEvent.press(getByTestId('credential-prompt-backdrop'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when username and password are empty', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<CredentialPrompt {...baseProps} onSave={onSave} />);
    fireEvent.press(getByTestId('credential-prompt-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when only username is filled', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<CredentialPrompt {...baseProps} onSave={onSave} />);
    fireEvent.changeText(getByTestId('credential-prompt-username'), 'alice@example.com');
    fireEvent.press(getByTestId('credential-prompt-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when only password is filled', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<CredentialPrompt {...baseProps} onSave={onSave} />);
    fireEvent.changeText(getByTestId('credential-prompt-password'), 'secret123');
    fireEvent.press(getByTestId('credential-prompt-save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with trimmed username and password when both are filled', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<CredentialPrompt {...baseProps} onSave={onSave} />);

    fireEvent.changeText(getByTestId('credential-prompt-username'), '  alice@example.com  ');
    fireEvent.changeText(getByTestId('credential-prompt-password'), 'secret123');
    fireEvent.press(getByTestId('credential-prompt-save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('alice@example.com', 'secret123');
  });

  it('calls onSave with initialUsername when only password is added', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <CredentialPrompt
        {...baseProps}
        initialUsername="alice@example.com"
        onSave={onSave}
      />
    );
    fireEvent.changeText(getByTestId('credential-prompt-password'), 'mypassword');
    fireEvent.press(getByTestId('credential-prompt-save'));
    expect(onSave).toHaveBeenCalledWith('alice@example.com', 'mypassword');
  });

  it('renders both Skip and Save buttons', () => {
    const { getByTestId } = render(<CredentialPrompt {...baseProps} />);
    expect(getByTestId('credential-prompt-skip')).toBeTruthy();
    expect(getByTestId('credential-prompt-save')).toBeTruthy();
  });

  it('has correct accessibility labels', () => {
    const { getByLabelText } = render(<CredentialPrompt {...baseProps} />);
    expect(getByLabelText('Email or username')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByLabelText('Skip saving credentials')).toBeTruthy();
    expect(getByLabelText('Save credentials securely')).toBeTruthy();
    expect(getByLabelText('Show password')).toBeTruthy();
  });
});
