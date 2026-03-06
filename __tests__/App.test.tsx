import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from '@/app/App';

describe('App', () => {
  it('renders welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to Borderly')).toBeTruthy();
    expect(screen.getByText('Your universal travel declaration app')).toBeTruthy();
  });
});
