import React from 'react';

export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Usuário principal */}
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20c0-3.33 2.67-6 6-6s6 2.67 6 6" />

    {/* Usuário secundário esquerda */}
    <circle cx="5" cy="12" r="3" />
    <path d="M2 20c0-2 1.5-4 3-4s3 2 3 4" />

    {/* Usuário secundário direita */}
    <circle cx="19" cy="12" r="3" />
    <path d="M16 20c0-2 1.5-4 3-4s3 2 3 4" />
  </svg>
);
