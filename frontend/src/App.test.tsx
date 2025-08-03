import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders video translate app', () => {
  render(<App />);
  const linkElement = screen.getByText(/video translate app/i);
  expect(linkElement).toBeInTheDocument();
});
