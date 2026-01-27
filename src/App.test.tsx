import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders app title', () => {
    render(<App />);
    expect(screen.getByText('React Context API Example')).toBeInTheDocument();
  });

  test('renders parent component', () => {
    render(<App />);
    expect(screen.getByText('Parent Component')).toBeInTheDocument();
  });
});

