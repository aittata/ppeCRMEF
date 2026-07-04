// frontend/src/shared/layout/AppLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-slate-900 overflow-hidden relative">
      {/* Background layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-15 dark:opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'url(/arrierePlan.png)' }}
      />
      
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden bg-transparent">
        <TopNav />
        <main className="flex-1 overflow-y-auto relative flex flex-col items-center bg-transparent">
          <div className="w-full max-w-none flex-1 flex flex-col bg-transparent border-t border-gray-200/50 dark:border-slate-700/50">
            <Outlet />
          </div>
          <footer className="w-full py-4 px-6 border-t border-gray-100 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xs text-xs text-gray-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
            <span>© 2025 - 2026. Tous droits réservés.</span>
            <span>Developed with ❤️</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
