import { render } from '@testing-library/react-native';
import PrivacyPolicyScreen from '@/screens/settings/PrivacyPolicyScreen/PrivacyPolicyScreen';

describe('PrivacyPolicyScreen', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<PrivacyPolicyScreen />);
    getByTestId('privacy-policy-screen');
  });

  it('contains key privacy sections', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    getByText('1. Data Storage');
    getByText('2. Data Sharing');
    getByText('3. Clipboard Protection');
    getByText('4. App Lock');
    getByText('5. Government Portals');
    getByText('6. Family Profiles');
    getByText('7. Your Rights');
  });

  it('mentions the 60-second clipboard clear', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    getByText(/automatically clears the clipboard after 60 seconds/i);
  });

  it('mentions the 5-minute inactivity lock', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    getByText(/After 5 minutes of inactivity/i);
  });
});
