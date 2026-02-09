"use client";

import React, { useState } from "react";

type Props = {
  title?: string;
  instructions: string;
  expectedIncludes?: string[]; // substrings that must be present
  expectedRegexes?: string[]; // regex strings that must match
  onSuccess?: () => void;
};

export default function CommandTest({ title, instructions, expectedIncludes = [], expectedRegexes = [], onSuccess }: Props) {
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  const run = () => {
    const text = input.trim();
    if (!text) {
      setLastResult({ ok: false, message: "Insira o comando/exemplo no campo acima." });
      return;
    }

    // Check includes
    for (const token of expectedIncludes) {
      if (!text.includes(token)) {
        setLastResult({ ok: false, message: `Esperado conter: ${token}` });
        return;
      }
    }

    // Check regexes
    for (const r of expectedRegexes) {
      try {
        const re = new RegExp(r, "i");
        if (!re.test(text)) {
          setLastResult({ ok: false, message: `Não corresponde ao padrão: ${r}` });
          return;
        }
      } catch (e) {
        // invalid regex -> skip
      }
    }

    setLastResult({ ok: true, message: "Ok — exercício validado." });
    if (onSuccess) onSuccess();
  };

  return (
    <div className="border rounded p-3 bg-white">
      {title && <h4 className="font-semibold mb-2">{title}</h4>}
      <div className="text-sm text-zinc-600 mb-2">{instructions}</div>
      <textarea
        className="w-full border rounded p-2 mb-2 font-mono text-sm"
        rows={4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Digite o comando ou cole o trecho aqui..."
      />
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={run}>Executar / Validar</button>
      </div>
      {lastResult && (
        <div className={`mt-3 p-2 rounded ${lastResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {lastResult.message}
        </div>
      )}
    </div>
  );
}
