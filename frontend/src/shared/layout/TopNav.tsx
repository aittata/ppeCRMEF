import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ROLE_LABELS } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon, Menu, X, LogOut, Key } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authApi } from '../../features/auth/auth.api';
import { useToast } from '../hooks/useToast';

export function TopNav() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // States for password modification
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwError, setPwError] = useState('');
  const toast = useToast();

  if (!user) return null;

  const handleLogout = () => {
    import('../api/queryClient').then(({ queryClient }) => queryClient.clear());
    clearAuth();
    navigate('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (passwordForm.newPassword.length < 8) {
      setPwError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    const pwdRegex = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
    if (!pwdRegex.test(passwordForm.newPassword)) {
      setPwError('Le mot de passe doit être fort (minuscule, majuscule, et chiffre/caractère spécial).');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (passwordForm.oldPassword === passwordForm.newPassword) {
      setPwError('Le nouveau mot de passe doit être différent de l\'ancien.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      toast.success('Mot de passe mis à jour avec succès! Veuillez vous reconnecter.');
      setIsPasswordModalOpen(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      // Log the user out since they changed password
      handleLogout();
    } catch (err: any) {
      console.error('Password change failed:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Une erreur est survenue lors de la modification du mot de passe.';
      setPwError(errMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const links = (() => {
    switch (user.role) {
      case 'ENSEIGNANT':
        return [
          { to: '/enseignant/classes', label: 'Mes classes' },
          { to: '/enseignant/eleves', label: 'Mes élèves' },
          { to: '/enseignant/absences', label: 'Absences' },
          { to: '/enseignant/edt-classes', label: 'Emplois du temps par classe' },
          { to: '/enseignant/edt', label: 'Mon emploi du temps' },
        ];
      case 'CADRE_ADMINISTRATIF':
        return [
          { to: '/cadre/dashboard', label: 'Tableau de bord' },
          { to: '/cadre/utilisateurs', label: 'Utilisateurs' },
          { to: '/cadre/eleves', label: 'Élèves' },
          { to: '/cadre/classes', label: 'Classes' },
          { to: '/cadre/edt/enseignants', label: 'Emplois par Enseignant' },
          { to: '/cadre/edt/classes', label: 'Emplois par Classes' },
          { to: '/cadre/absences', label: 'Absences' },
        ];
      case 'ADMIN':
        return [
          { to: '/admin/dashboard', label: 'Tableau de bord' },
          { to: '/admin/utilisateurs', label: 'Utilisateurs' },
          { to: '/admin/eleves', label: 'Élèves' },
          { to: '/admin/classes', label: 'Classes' },
          { to: '/admin/edt/enseignants', label: 'Emplois par Enseignant' },
          { to: '/admin/edt/classes', label: 'Emplois par Classes' },
          { to: '/admin/absences', label: 'Absences' },
          { to: '/admin/audit', label: 'Journal d\'audit' },
        ];
      case 'PARENT':
        return [
          { to: '/parent/edt', label: 'Emploi du temps' },
          { to: '/parent/absences', label: 'Absences de mes enfants' },
        ];
      default:
        return [];
    }
  })();

  const currentLink = links.find((link) => location.pathname.startsWith(link.to));
  const pageTitle = currentLink ? currentLink.label : 'Gestion des absences';

  const activeClass = "block px-4 py-3 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-medium rounded-lg";
  const inactiveClass = "block px-4 py-3 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors";

  return (
    <>
      <header className="flex h-16 w-full items-center justify-between bg-white dark:bg-slate-900 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 shrink-0 shadow-sm relative z-30">
        
        {/* L E F T : Menu Button + Logo */}
        <div className="flex items-center gap-3 md:gap-4 flex-1">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors md:hidden"
            title="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-label="School">🏫</span>
            <span className="mt-[11px] mb-[3px] text-2xl font-bold text-blue-900 dark:text-blue-300 tracking-tight hidden sm:block">
              Gestion des absences
            </span>
          </div>
        </div>

        {/* C E N T E R : Page Title (Hidden on tablet/desktop when links are visible) */}
        <div className="flex-1 flex justify-center hidden sm:flex md:hidden">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
            {pageTitle}
          </h1>
        </div>

        {/* R I G H T : User Info + Theme + Logout */}
        <div className="flex items-center justify-end gap-3 md:gap-6 flex-1">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-base font-bold text-gray-900 dark:text-white mb-0.5">
              {user.prenom} {user.nom}
            </span>
            <div className="flex gap-2 items-center mt-1 text-[10px] uppercase font-bold tracking-wider">
              <span className="px-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                {ROLE_LABELS[user.role]}
              </span>
              {user.role === 'ENSEIGNANT' && (user as any).matiere && (
                <span className="px-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                  {(user as any).matiere}
                </span>
              )}
              {(user.role === 'CADRE_ADMINISTRATIF' || user.role === 'ADMIN') && (user as any).poste && (
                <span className="px-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                  {(user as any).poste}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-700 pl-4">
            {(user.role === 'ENSEIGNANT' || user.role === 'PARENT') && (
              <button
                onClick={() => {
                  setPwError('');
                  setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setIsPasswordModalOpen(true);
                }}
                title="Modifier le mot de passe"
                className="p-2 text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                id="change-password-button"
              >
                <Key size={20} />
              </button>
            )}
            <button
              onClick={toggleTheme}
              title={`Basculer vers le mode ${theme === 'light' ? 'sombre' : 'clair'}`}
              className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* S E C O N D A R Y   H O R I Z O N T A L   N A V  (Desktop & Tablet) */}
      <nav className="hidden md:flex w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-6 overflow-x-auto shrink-0 z-20 justify-center">
        <ul className="flex items-center gap-2 relative py-2">
          {links.map((link) => (
            <li key={link.to} className="shrink-0">
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `block px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600' 
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* D R A W E R */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          
          {/* Sidebar Drawer */}
          <div className="relative flex flex-col w-72 max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto z-[100] animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏫</span>
                <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-1 flex-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => (isActive ? activeClass : inactiveClass)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Mobile User Info (visible when Drawer is open on small screens) */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 md:hidden">
              <p className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
                {user.prenom} {user.nom}
              </p>
              <div className="flex flex-wrap gap-2 items-center mt-1 text-[10px] uppercase font-bold tracking-wider">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                  {ROLE_LABELS[user.role]}
                </span>
                {user.role === 'ENSEIGNANT' && (user as any).matiere && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                    {(user as any).matiere}
                  </span>
                )}
                {(user.role === 'CADRE_ADMINISTRATIF' || user.role === 'ADMIN') && (user as any).poste && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                    {(user as any).poste}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION DU MOT DE PASSE */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Modifier mon mot de passe"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 rounded text-sm font-medium">
              {pwError}
            </div>
          )}

          <Input
            label="Ancien mot de passe"
            type="password"
            required
            value={passwordForm.oldPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
            placeholder="Entrez votre mot de passe actuel"
          />

          <Input
            label="Nouveau mot de passe"
            type="password"
            required
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="Entrez le nouveau mot de passe (min 8 caractères)"
          />

          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            required
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="Confirmez le nouveau mot de passe"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              disabled={isChangingPassword}
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isChangingPassword}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
