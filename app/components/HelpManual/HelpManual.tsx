"use client";

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { HelpCircle } from "lucide-react";

interface HelpManualProps {
  title: string;
  content: React.ReactNode;
}

export default function HelpManual({ title, content }: HelpManualProps) {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setHelpModalOpen(true)}
        className="p-2 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors"
        title="Ajuda / Manual"
      >
        <HelpCircle size={20} />
      </button>

      <Dialog
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-bold text-sky-400 mb-4 flex items-center gap-2">
              <HelpCircle className="w-6 h-6" />
              {title}
            </Dialog.Title>
            <div className="prose prose-invert">{content}</div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-700">
              <button
                className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white"
                onClick={() => setHelpModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
