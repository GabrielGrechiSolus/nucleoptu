import React, { Suspense } from 'react';
import Sidebar from './Sidebar';

export default function LayoutComSidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex mt-[60px] h-[calc(100dvh-60px)] bg-black text-zinc-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 sm:p-8 lg:pb-8">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
