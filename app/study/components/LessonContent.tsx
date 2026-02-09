"use client";

import React from 'react';

type Props = { text: string };

// Simple renderer: splits paragraphs and detects code-like blocks (lines starting with common keywords)
export default function LessonContent({ text }: Props) {
  const blocks = text.split(/\n\n+/g).map(b => b.trim());

  const isCodeBlock = (b: string) => {
    const codeIndicators = ['FROM ', 'CMD ', 'RUN ', 'COPY ', 'SELECT ', 'CREATE ', 'BEGIN', 'END;', 'function', 'procedure', 'package', '<', '</'];
    return b.split('\n').slice(0,3).some(line => codeIndicators.some(ind => line.trim().startsWith(ind) || line.includes(ind)));
  };

  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        isCodeBlock(b) ? (
          <pre key={i} className="bg-zinc-800 p-3 rounded text-sm overflow-x-auto font-mono leading-relaxed shadow-inner">
            <code>{b}</code>
          </pre>
        ) : (
          <p key={i} className="text-sm text-zinc-200 leading-relaxed">
            {b}
          </p>
        )
      ))}
    </div>
  );
}
