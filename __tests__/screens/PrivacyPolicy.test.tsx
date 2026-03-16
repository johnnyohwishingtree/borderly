import { render } from '@testing-library/react-native';
import PrivacyPolicyScreen from '@/screens/settings/PrivacyPolicy';

describe('PrivacyPolicyScreen', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<PrivacyPolicyScreen />);
    expect(getByTestId('privacy-policy-screen')).toBeTruthy();
  });

  it('displays the Privacy Policy heading', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('contains key privacy sections', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(getByText('1. Data Storage')).toBeTruthy();
    expect(getByText('2. Data Sharing')).toBeTruthy();
    expect(getByText('3. Clipboard Protection')).toBeTruthy();
    expect(getByText('4. App Lock')).toBeTruthy();
    expect(getByText('5. Government Portals')).toBeTruthy();
    expect(getByText('6. Family Profiles')).toBeTruthy();
    expect(getByText('7. Your Rights')).toBeTruthy();
  });

  it('mentions the 60-second clipboard clear', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(
      getByText(/automatically clears the clipboard after 60 seconds/i)
    ).toBeTruthy();
  });

  it('mentions the 5-minute inactivity lock', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(
      getByText(/After 5 minutes of inactivity/i)
    ).toBeTruthy();
  });
});
