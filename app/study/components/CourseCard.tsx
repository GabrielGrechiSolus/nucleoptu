'use client';

import React from 'react';
import ProgressBar from './ProgressBar';

export default function CourseCard({
  title,
  description,
  minutes,
  percent,
  onOpen,
  onResume,
}: {
  title: string;
  description: string;
  minutes: number;
  percent: number;
  onOpen: () => void;
  onResume?: () => void;
}) {
  return (
    <div className="bg-zinc-900 rounded p-4 shadow hover:shadow-lg transition cursor-pointer">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-xs text-zinc-400 mt-1">{description}</p>
          <p className="text-xs text-zinc-500 mt-2">Duração estimada: {minutes} minutos</p>
        </div>
        <div className="w-24 text-right">
          <p className="text-sm font-bold">{percent}%</p>
          <p className="text-xs text-zinc-400">concluído</p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar percent={percent} />
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onOpen} className="px-3 py-2 bg-sky-500 rounded">Abrir curso</button>
        {onResume && (
          <button onClick={onResume} className="px-3 py-2 bg-green-600 rounded">Continuar</button>
        )}
      </div>
    </div>
  );
}
