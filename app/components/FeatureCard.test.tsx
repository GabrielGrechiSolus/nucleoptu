
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeatureCard } from './FeatureCard';

describe('FeatureCard', () => {
  it('should render the icon, title, and description', () => {
    const testIcon = '🚀';
    const testTitle = 'Test Title';
    const testDescription = 'Test Description';

    render(
      <FeatureCard
        icon={testIcon}
        title={testTitle}
        description={testDescription}
      />
    );

    // Check if the icon is rendered
    expect(screen.getByText(testIcon)).toBeInTheDocument();

    // Check if the title is rendered
    expect(screen.getByRole('heading', { name: testTitle })).toBeInTheDocument();

    // Check if the description is rendered
    expect(screen.getByText(testDescription)).toBeInTheDocument();
  });
});
