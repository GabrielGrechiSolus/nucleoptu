'use client';

import React from 'react';

export default function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
      <div
        className="h-full bg-sky-500 transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
