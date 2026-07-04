// frontend/src/pages/NotFound.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../shared/store/auth.store';
import { Button } from '../shared/ui/Button';

export function NotFound() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const handleReturn = () => {
    if (!user) navigate('/login');
    else if (user.role === 'ADMIN') navigate('/admin/utilisateurs');
    else if (user.role === 'CADRE_ADMINISTRATIF') navigate('/cadre/dashboard');
    else navigate('/enseignant/classes');
  };

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-6 relative overflow-hidden">
      {/* Background layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-15 dark:opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'url(/arrierePlan.png)' }}
      />
      <div className="text-center relative z-10">
        <div className="text-7xl mb-6">🏫</div>
        <h1 className="text-6xl font-bold text-gray-400 dark:text-slate-400 dark:text-slate-500 mb-4 opacity-50">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page introuvable</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-md">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Button onClick={handleReturn} variant="primary" size="lg">
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}
