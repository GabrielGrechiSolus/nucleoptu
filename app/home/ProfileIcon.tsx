import React from 'react';

export const ProfileIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Cabeça */}
    <circle cx="12" cy="8" r="4" />

    {/* Corpo */}
    <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
  </svg>
);
