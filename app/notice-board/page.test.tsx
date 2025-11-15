import React from 'react';
import { render, screen } from '@testing-library/react';
import NoticeBoardPage from './page';

// Mock the withAuth HOC
jest.mock('../components/withAuth', () => (Component) => Component);

describe('NoticeBoardPage', () => {
  it('renders the page title', () => {
    render(<NoticeBoardPage />);
    const titleElement = screen.getByText(/Mural de Avisos/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<NoticeBoardPage />);
    const descriptionElement = screen.getByText(/Aqui você encontrará os últimos avisos e atualizações./i);
    expect(descriptionElement).toBeInTheDocument();
  });
});
