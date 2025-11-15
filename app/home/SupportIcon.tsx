import React from 'react';

export const SupportIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Headset */}
    <path d="M4 12a8 8 0 0 1 16 0" />
    <path d="M4 12v3a3 3 0 0 0 3 3h1" />
    <path d="M20 12v3a3 3 0 0 1-3 3h-1" />

    {/* Microfone */}
    <circle cx="12" cy="19" r="1" />
    <line x1="12" y1="18" x2="12" y2="16" />
  </svg>
);
