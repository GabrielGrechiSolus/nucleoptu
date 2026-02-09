"use client";

import React, { useState, useEffect } from "react";

type Props = {
  title?: string;
  instructions: string;
  requiredSnippets?: string[]; // substrings that must appear
  requiredRegexes?: string[];
  language?: string;
  onSuccess?: () => void;
};

export default function CodeTest({ title, instructions, requiredSnippets = [], requiredRegexes = [], language = "sql", onSuccess }: Props) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [EditorComp, setEditorComp] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;
    (async () => {
      try {
        // use eval import to avoid bundler static resolution when package is missing
        // eslint-disable-next-line no-eval
        const mod = await eval("import('@uiw/react-codemirror')");
        if (!mounted) return;
        setEditorComp(() => mod.default || null);
      } catch (err) {
        setEditorComp(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const run = () => {
    const text = code.trim();
    if (!text) { setResult({ ok: false, message: "Cole o código no editor." }); return; }

    for (const s of requiredSnippets) {
      if (!text.includes(s)) { setResult({ ok: false, message: `Falta: ${s}` }); return; }
    }

    for (const r of requiredRegexes) {
      try { const re = new RegExp(r, "i"); if (!re.test(text)) { setResult({ ok: false, message: `Não corresponde: ${r}` }); return; } }
      catch { /* ignore */ }
    }

    setResult({ ok: true, message: "Exercício válido." });
    if (onSuccess) onSuccess();
  };

  return (
    <div className="border rounded p-3 bg-white">
      {title && <h4 className="font-semibold mb-2">{title}</h4>}
      <div className="text-sm text-zinc-600 mb-2">{instructions}</div>
      <div className="w-full mb-2">
        {EditorComp ? (
          // @ts-ignore
          <EditorComp
            value={code}
            height="220px"
            options={{ readOnly: false }}
            onChange={(value: string) => setCode(value)}
          />
        ) : (
          <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={8} className="w-full font-mono p-2 border rounded mb-2" placeholder={`Escreva o código ${language} aqui...`} />
        )}
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-sky-600 text-white rounded hover:scale-[1.02] transition-transform" onClick={run}>Validar código</button>
      </div>
      {result && <div className={`mt-3 p-2 rounded ${result.ok ? 'bg-green-100 text-green-800 animate-pulse' : 'bg-red-100 text-red-800'}`}>{result.message}</div>}
    </div>
  );
}
