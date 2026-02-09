'use client';

import React, { useState } from 'react';

type Question = {
  id: string;
  text: string;
  options: string[];
  answer: number; // index
};

export default function Quiz({
  questions,
  onFinish,
}: {
  questions: Question[];
  onFinish: (score: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});

  const handleSelect = (qId: string, idx: number) => {
    setAnswers((s) => ({ ...s, [qId]: idx }));
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.answer) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    onFinish(score);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="bg-zinc-900 p-4 rounded">
          <p className="font-semibold">{i + 1}. {q.text}</p>
          <div className="mt-2 grid gap-2">
            {q.options.map((opt, idx) => (
              <label key={idx} className={`p-2 rounded cursor-pointer border ${answers[q.id]===idx? 'border-sky-500 bg-sky-500/10':'border-zinc-800'}`}>
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id]===idx}
                  onChange={() => handleSelect(q.id, idx)}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button onClick={handleSubmit} className="px-4 py-2 bg-sky-500 rounded">Enviar prova</button>
      </div>
    </div>
  );
}
