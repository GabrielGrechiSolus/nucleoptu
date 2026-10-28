import React from 'react';
import Sidebar from '../components/Sidebar';

export default function ChamadosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex mt-[60px] h-[calc(100vh-60px)] bg-black text-zinc-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
