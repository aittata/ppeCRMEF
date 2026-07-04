// frontend/src/features/auth/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/shared/store/auth.store';
import { authApi } from '../auth.api';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [globalError, setGlobalError] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const validate = () => {
    let isValid = true;
    setUsernameError('');
    setPasswordError('');
    setGlobalError(null);

    if (username.length < 3) {
      setUsernameError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      isValid = false;
    }
    if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      setGlobalError({ message: 'Vérifiez votre connexion internet', type: 'error' });
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      // client.post is mapped to return data if success
      const payload = res as any; // Axios interceptor returns response.data.data
      setAuth(payload.user, payload.access_token, payload.refresh_token);

      // Redirect by role
      switch (payload.user.role) {
        case 'ADMIN':
          navigate('/admin/dashboard');
          break;
        case 'CADRE_ADMINISTRATIF':
        case 'CADRE_ADMIN':
          navigate('/cadre/dashboard');
          break;
        case 'ENSEIGNANT':
          navigate('/enseignant/classes');
          break;
        case 'PARENT':
          navigate('/parent/edt');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      const status = err.response?.status || err.statusCode;
      if (status === 401) {
        setGlobalError({ message: 'Identifiants incorrects', type: 'error' });
      } else if (status === 403) {
        setGlobalError({ message: "Compte désactivé. Contactez l'administration.", type: 'warning' });
      } else {
        const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Une erreur inattendue est survenue';
        setGlobalError({ message: msg, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 relative"
    >
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-20 p-2.5 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Background layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-50 dark:opacity-30" 
        style={{ backgroundImage: 'url(/arrierePlan.png)' }}
      />
      {/* Content wrapper */}
      <div className="z-10 w-full flex items-center justify-center mb-12">
        <motion.div

        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏫</div>
          <h1 className="text-[34px] font-bold text-blue-900 dark:text-blue-400">Gestion des Absences</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm">Veuillez vous connecter pour continuer</p>
        </div>

        {globalError && (
          <div
            className={`mb-6 p-4 rounded-md border text-sm font-medium ${
              globalError.type === 'warning'
                ? 'bg-amber-900/40 border-amber-700/60 text-amber-300'
                : 'bg-red-900/40 border-red-700/60 text-red-300'
            }`}
          >
            {globalError.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nom d'utilisateur"
            placeholder="Saisissez votre identifiant"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={usernameError}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <Input
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Saisissez votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none hover:text-gray-700 dark:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            }
          />

          <Button type="submit" loading={loading} className="mt-2 w-full shadow-lg shadow-blue-500/20">
            Se connecter
          </Button>
        </form>
      </motion.div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 py-4 px-6 text-xs text-gray-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 bg-gradient-to-t from-gray-50/80 dark:from-slate-900/80 to-transparent backdrop-blur-[1px]">
        <span>© 2025 - 2026. Tous droits réservés.</span>
        <span>Developed with ❤️</span>
      </footer>
    </div>
  );
}
