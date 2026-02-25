import React from 'react';

export const TicketsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 7.5V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7.5" />
    <path d="M2 7.5V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.5" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="16" y2="16" />
  </svg>
);
