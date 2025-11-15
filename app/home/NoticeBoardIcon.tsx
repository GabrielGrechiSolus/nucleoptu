import React from 'react';

export const NoticeBoardIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <rect x="3" y="3" width="18" height="14" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <circle cx="7" cy="15" r="1.5" />
    <circle cx="12" cy="15" r="1.5" />
    <circle cx="17" cy="15" r="1.5" />
  </svg>
);