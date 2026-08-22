import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-brand-dark font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
