import { render, screen } from '@testing-library/react-native';
import App from '@/app/App';

describe('App', () => {
  it('renders welcome message', () => {
    render(<App />);
    screen.getByText('Welcome to Borderly');
    screen.getByText('Your universal travel declaration app');
  });
});
