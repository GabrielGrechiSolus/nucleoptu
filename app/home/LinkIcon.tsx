import React from 'react';

export const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Corrente de link */}
    <path d="M10 14a5 5 0 0 1 7.07 0l2.83 2.83a5 5 0 0 1-7.07 7.07l-2.83-2.83a5 5 0 0 1 0-7.07z" />
    <path d="M14 10a5 5 0 0 1-7.07 0L4.1 7.07a5 5 0 0 1 7.07-7.07L14 2.93a5 5 0 0 1 0 7.07z" />
  </svg>
);
