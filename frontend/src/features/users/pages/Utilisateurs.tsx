// frontend/src/features/users/pages/Utilisateurs.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser, useReactivateUser, useAuditLogs } from '../hooks/useUsers';
import { useEleves } from '../../eleves/hooks/useEleves';
import { useAuthStore } from '@/shared/store/auth.store';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { MATIERES, User, CreateUserPayload, UpdateUserPayload } from '@/shared/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Power, Pencil, Clock } from 'lucide-react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Utilisateurs() {
  const location = useLocation();
  const isCadreUtilisateurs = location.pathname === '/cadre/utilisateurs';

  const { data: usersData, isLoading, isError } = useUsers();
  const { data: elevesPageData } = useEleves({ limit: 1000 });
  const allEleves = useMemo(() => (elevesPageData as any)?.data || elevesPageData || [], [elevesPageData]);
  const [selectedEleveIds, setSelectedEleveIds] = useState<string[]>([]);
  const [eleveSearch, setEleveSearch] = useState('');

  const [activeTab, setActiveTab] = useState<'TOUS' | 'ENSEIGNANT' | 'CADRE_ADMINISTRATIF' | 'ADMIN' | 'PARENT'>('TOUS');
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'ACTIFS' | 'INACTIFS'>('TOUS');

  const toggleMatiere = (matiere: string) => {
    setSelectedMatieres(prev => 
      prev.includes(matiere) ? prev.filter(m => m !== matiere) : [...prev, matiere]
    );
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [auditUser, setAuditUser] = useState<User | null>(null);
  const { data: auditLogsRaw = [], isLoading: isLoadingAudit } = useAuditLogs(auditUser?.id || null);
  const auditLogs = auditLogsRaw as any[];

  const [userForm, setUserForm] = useState<CreateUserPayload | UpdateUserPayload>({
    username: '', nom: '', prenom: '', password: '', role: 'ENSEIGNANT', matiere: '', poste: '', cin: '', contact: ''
  });
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; userId: string; action: 'deactivate' | 'reactivate' } | null>(null);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUserRole = useAuthStore(s => s.user?.role);

  const availableTabs = currentUserRole === 'ADMIN' 
    ? (['TOUS', 'ENSEIGNANT', 'CADRE_ADMINISTRATIF', 'ADMIN', 'PARENT'] as const)
    : currentUserRole === 'CADRE_ADMINISTRATIF'
    ? (['TOUS', 'ENSEIGNANT', 'PARENT'] as const)
    : (['TOUS', 'ENSEIGNANT'] as const);

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedUsers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUsers(next);
  };

  const handleBulkToggle = async (active: boolean) => {
    for (const id of Array.from(selectedUsers)) {
      if (active) {
        await reactivateUser.mutateAsync(id);
      } else {
        await deactivateUser.mutateAsync(id);
      }
    }
    setSelectedUsers(new Set());
  };

  const users: User[] = useMemo(() => {
    if (!usersData) return [];
    const dataList = (usersData as any).data ? (usersData as any).data : usersData;
    let list = Array.isArray(dataList) ? dataList : [];
    if (currentUserRole === 'CADRE_ADMINISTRATIF') {
        list = list.filter(u => u.role === 'ENSEIGNANT' || u.role === 'PARENT');
    } else if (currentUserRole !== 'ADMIN') {
        list = list.filter(u => u.role === 'ENSEIGNANT');
    }
    return list;
  }, [usersData, currentUserRole]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (activeTab !== 'TOUS') {
      result = result.filter(u => u.role === activeTab);
    }
    if (activeTab === 'ENSEIGNANT' && selectedMatieres.length > 0) {
      result = result.filter(u => u.matiere && selectedMatieres.includes(u.matiere));
    }
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(u => 
        (u.nom + ' ' + u.prenom).toLowerCase().includes(lowerSearch) ||
        u.username.toLowerCase().includes(lowerSearch) ||
        (u.cin && u.cin.toLowerCase().includes(lowerSearch)) ||
        (u.contact && u.contact.toLowerCase().includes(lowerSearch))
      );
    }
    if (statusFilter !== 'TOUS') {
      result = result.filter(u => statusFilter === 'ACTIFS' ? u.actif : !u.actif);
    }
    return result;
  }, [users, activeTab, debouncedSearchTerm, selectedMatieres, statusFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({ username: '', nom: '', prenom: '', password: '', role: 'ENSEIGNANT', matiere: '', poste: '', cin: '', contact: '' });
    setPasswordConfirm('');
    setPasswordError('');
    setSelectedEleveIds([]);
    setEleveSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      nom: user.nom,
      prenom: user.prenom,
      cin: user.cin || '',
      contact: user.contact || '',
      role: user.role,
      matiere: user.matiere || '',
      poste: user.role === 'ADMIN' ? 'Directeur' : (user.poste || ''),
      password: '',
      actif: user.actif
    });
    setPasswordConfirm('');
    setPasswordError('');
    const associatedIds = allEleves.filter((e: any) => e.parentId === user.id).map((e: any) => e.id);
    setSelectedEleveIds(associatedIds);
    setEleveSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userForm.password !== passwordConfirm) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    setPasswordError('');

    if (editingUser) {
      const payload: UpdateUserPayload = { ...userForm };
      if (!payload.password) delete payload.password;
      if (userForm.role === 'ADMIN') {
        payload.poste = 'Directeur';
      }
      if (userForm.role === 'PARENT') {
        payload.eleveIds = selectedEleveIds;
      }
      await updateUser.mutateAsync({ id: editingUser.id, payload });
    } else {
      const payload: CreateUserPayload = {
        ...userForm,
        eleveIds: userForm.role === 'PARENT' ? selectedEleveIds : []
      } as CreateUserPayload;
      if (userForm.role === 'ADMIN') {
        payload.poste = 'Directeur';
      }
      await createUser.mutateAsync(payload);
    }
    closeModal();
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    if (confirmDialog.action === 'deactivate') {
      await deactivateUser.mutateAsync(confirmDialog.userId);
    } else {
      await reactivateUser.mutateAsync(confirmDialog.userId);
    }
    setConfirmDialog(null);
  };

  if (isLoading) return <div className="flex justify-center items-center h-48"><div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>;
  if (isError) return <div className="p-8 text-center text-red-400">Erreur lors de la récupération des utilisateurs.</div>;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Utilisateurs</h1>
          {selectedUsers.size > 0 && (
            <div className="flex bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md overflow-hidden shadow-sm">
              <button
                onClick={() => handleBulkToggle(true)}
                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium transition-colors"
                disabled={deactivateUser.isPending || reactivateUser.isPending}
              >
                Activer
              </button>
              <div className="w-px bg-gray-200 dark:border-slate-700"></div>
              <button
                onClick={() => handleBulkToggle(false)}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
                disabled={deactivateUser.isPending || reactivateUser.isPending}
              >
                Désactiver
              </button>
            </div>
          )}
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
          + Nouvel utilisateur
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700 flex overflow-x-auto max-w-full whitespace-nowrap scrollbar-thin">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 shrink-0 ${
              activeTab === tab 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100/50 dark:hover:bg-slate-700'
            }`}
          >
            {tab === 'TOUS' ? 'Tous' : 
             tab === 'CADRE_ADMINISTRATIF' ? 'Cadres administratifs' : 
             tab === 'ADMIN' ? 'Administrateurs' : 
             tab === 'ENSEIGNANT' ? 'Enseignants' : 
             tab === 'PARENT' ? 'Parents' : tab}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeTab === 'ENSEIGNANT' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 overflow-hidden"
          >
            {MATIERES.map(matiere => (
              <label key={matiere} className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:bg-slate-700 transition">
                <input 
                  type="checkbox" 
                  checked={selectedMatieres.includes(matiere)}
                  onChange={() => toggleMatiere(matiere)}
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-slate-900"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300">{matiere}</span>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:max-w-md">
          <Input 
            placeholder="Rechercher par nom, prénom, username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
        <div className="shrink-0 flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1 max-w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <span className="text-sm text-gray-500 dark:text-slate-400 px-3 font-medium hidden sm:inline-block shrink-0">Statut:</span>
          {(['TOUS', 'ACTIFS', 'INACTIFS'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 shrink-0 ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100/50 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'TOUS' ? 'Tous' : status === 'ACTIFS' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 text-xs uppercase font-semibold shadow-sm">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                    onChange={() => {
                      if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set());
                      else setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">Nom d'utilisateur</th>
                <th className="px-6 py-4">CIN</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Nom & Prénom</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Matière / Poste</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Créé le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              <AnimatePresence>
                {filteredUsers.map(user => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: user.actif ? 1 : 0.6 }}
                    exit={{ opacity: 0 }}
                    className={`hover:bg-gray-100 dark:bg-slate-700/30 transition-colors ${!user.actif ? 'bg-gray-50 dark:bg-slate-900/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => toggleSelection(e as any, user.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-200">{user.username}</td>
                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-slate-300 uppercase">{user.cin || '-'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300 font-medium">{user.contact || '-'}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{user.nom} {user.prenom}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold 
                        ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                          user.role === 'CADRE_ADMINISTRATIF' ? 'bg-blue-500/20 text-blue-400' :
                          user.role === 'PARENT' ? 'bg-pink-500/20 text-pink-400' :
                          'bg-emerald-500/20 text-emerald-400'}`}>
                        {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'CADRE_ADMINISTRATIF' ? 'Cadre administratif' : user.role === 'PARENT' ? 'Parent' : 'Enseignant'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                      {user.role === 'ENSEIGNANT' ? user.matiere || '-' : user.poste || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${user.actif ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        {user.actif ? 'Actif' : 'Inactif'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                      {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isCadreUtilisateurs && (
                          <button
                            onClick={() => setAuditUser(user)}
                            className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Historique (Logs)"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => setConfirmDialog({ isOpen: true, userId: user.id, action: user.actif ? 'deactivate' : 'reactivate' })}
                            className={`p-1.5 rounded transition-colors ${
                              user.actif
                                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                                : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                            title={user.actif ? 'Désactiver' : 'Activer'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createPortal(
        <>
          <AnimatePresence>
            {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
                </h2>
                <button onClick={closeModal} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-200 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Nom" value={userForm.nom} onChange={e => setUserForm({...userForm, nom: e.target.value})} required />
                    <Input label="Prénom" value={userForm.prenom} onChange={e => setUserForm({...userForm, prenom: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Nom d'utilisateur" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required />
                    <Input label="CIN" value={(userForm as any).cin || ''} onChange={e => setUserForm({...userForm, cin: e.target.value.toUpperCase()})} required placeholder="Ex: AX1234" />
                  </div>
                  <div>
                    <Input label="Contact" value={(userForm as any).contact || ''} onChange={e => setUserForm({...userForm, contact: e.target.value})} placeholder="Ex: 0612345678" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <Input 
                      label={editingUser ? "Nouveau mot de passe (laisser vide si inchangé)" : "Mot de passe"} 
                      type="password" 
                      value={userForm.password} 
                      onChange={e => setUserForm({...userForm, password: e.target.value})} 
                      required={!editingUser} 
                      minLength={userForm.password ? 6 : undefined}
                    />
                    {(userForm.password || !editingUser) && (
                      <Input 
                        label="Confirmer le mot de passe" 
                        type="password" 
                        value={passwordConfirm} 
                        onChange={e => setPasswordConfirm(e.target.value)} 
                        required={!!userForm.password || !editingUser} 
                        minLength={userForm.password ? 6 : undefined}
                      />
                    )}
                  </div>
                  {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                  
                  {(!editingUser || editingUser.role !== 'ADMIN') ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Rôle</label>
                      <select 
                        value={userForm.role}
                        onChange={e => {
                          const newRole = e.target.value as CreateUserPayload['role'];
                          setUserForm({...userForm, role: newRole, poste: newRole === 'ADMIN' ? 'Directeur' : userForm.poste});
                        }}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-md p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ENSEIGNANT">Enseignant</option>
                        {currentUserRole === 'CADRE_ADMINISTRATIF' && (
                          <option value="PARENT">Parent</option>
                        )}
                        {currentUserRole === 'ADMIN' && (
                          <>
                            <option value="CADRE_ADMINISTRATIF">Cadre Administratif</option>
                            <option value="PARENT">Parent</option>
                            <option value="ADMIN">Administrateur</option>
                          </>
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Rôle</label>
                      <div className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded-md p-2.5">
                        {userForm.role === 'ADMIN' ? 'Administrateur' : userForm.role === 'CADRE_ADMINISTRATIF' ? 'Cadre Administratif' : 'Enseignant'}
                      </div>
                    </div>
                  )}

                  {userForm.role === 'ENSEIGNANT' && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Matière</label>
                      <select 
                        value={userForm.matiere || ''}
                        onChange={e => setUserForm({...userForm, matiere: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-md p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="" disabled>Sélectionnez une matière</option>
                        {MATIERES.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {userForm.role === 'CADRE_ADMINISTRATIF' && (
                    <Input label="Poste" value={userForm.poste || ''} onChange={e => setUserForm({...userForm, poste: e.target.value})} required/>
                  )}
                  {userForm.role === 'ADMIN' && (
                    <Input label="Poste" value="Directeur" disabled />
                  )}

                  {userForm.role === 'PARENT' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        Élèves associés ({selectedEleveIds.length} sélectionné(s))
                      </label>
                      <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-gray-50 dark:bg-slate-900/50">
                        <input
                          type="text"
                          placeholder="Rechercher un élève..."
                          value={eleveSearch}
                          onChange={(e) => setEleveSearch(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {allEleves
                            .filter((e: any) => {
                              if (!eleveSearch) return true;
                              const fullName = `${e.nom} ${e.prenom}`.toLowerCase();
                              return fullName.includes(eleveSearch.toLowerCase()) || e.codeMassar.toLowerCase().includes(eleveSearch.toLowerCase());
                            })
                            .map((e: any) => {
                              const isChecked = selectedEleveIds.includes(e.id);
                              return (
                                <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded transition-colors text-xs text-gray-700 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedEleveIds(prev => prev.filter(id => id !== e.id));
                                      } else {
                                        setSelectedEleveIds(prev => [...prev, e.id]);
                                      }
                                    }}
                                    className="rounded border-gray-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-900"
                                  />
                                  <span className="font-semibold text-gray-800 dark:text-slate-100">
                                    {e.nom} {e.prenom}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                    ({e.codeMassar})
                                  </span>
                                  {e.classe && (
                                    <span className="ml-auto text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-medium">
                                      {e.classe.libelle || `${e.classe.niveau}-${e.classe.numero}`}
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          {allEleves.length === 0 && (
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center py-2">Aucun élève enregistré.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-gray-200 dark:border-slate-700 shrink-0 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
                  <Button type="button" variant="ghost" onClick={closeModal}>Annuler</Button>
                  <Button type="submit" loading={createUser.isPending || updateUser.isPending} className="bg-blue-600 hover:bg-blue-700">
                    {editingUser ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {auditUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🕒 Historique:</span> <span className="text-blue-400">{auditUser?.username}</span>
                </h2>
                <button onClick={() => setAuditUser(null)} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-200 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {isLoadingAudit ? (
                   <div className="flex justify-center p-8"><div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>
                ) : auditLogs.length === 0 ? (
                   <p className="text-gray-500 dark:text-slate-400 text-center py-8">Aucun historique de modification trouvé.</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-start border-b border-gray-200 dark:border-slate-700 dark:border-gray-200 dark:border-slate-700/50 pb-2 mb-2">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                              {log.action === 'CREATE' ? 'Création' : 
                               log.action === 'UPDATE' ? 'Modification' : 
                               log.action === 'DEACTIVATE' ? 'Désactivation' : 
                               log.action === 'REACTIVATE' ? 'Réactivation' : 
                               log.action}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-slate-300">
                              Par <span className="font-semibold text-gray-800 dark:text-slate-200">{log.changedBy?.username || 'Système'}</span>
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 mt-3">
                          {Object.entries(log.changes || {}).map(([field, vals]: [string, any]) => {
                            const hasOldNew = vals && typeof vals === 'object' && ('old' in vals || 'new' in vals);
                            const oldVal = hasOldNew ? vals.old : '';
                            const newVal = hasOldNew ? vals.new : (vals !== undefined && vals !== null ? String(vals) : '');
                            return (
                              <li key={field} className="text-sm grid grid-cols-[100px_1fr] items-baseline gap-2">
                                <span className="text-gray-500 dark:text-slate-400 font-medium capitalize">{field}:</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {hasOldNew && (
                                    <>
                                      <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded border border-red-200 dark:border-red-800/50 line-through decoration-red-400/50">
                                        {oldVal !== null && oldVal !== undefined ? String(oldVal) : 'vide'}
                                      </span>
                                      <span className="text-gray-400 dark:text-slate-500">→</span>
                                    </>
                                  )}
                                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800/50 font-medium font-sans">
                                    {newVal !== null && newVal !== undefined ? String(newVal) : 'vide'}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:hover:bg-gray-100 dark:hover:bg-slate-800/50 shrink-0 flex justify-end">
                <Button onClick={() => setAuditUser(null)} variant="outline">Fermer</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Confirmer l'action</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6 font-normal">
                Êtes-vous sûr de vouloir {confirmDialog.action === 'deactivate' ? 'désactiver' : 'réactiver'} cet utilisateur ?
              </p>
              <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setConfirmDialog(null)}>Annuler</Button>
                  <Button type="button" onClick={handleConfirmAction} className={confirmDialog.action === 'deactivate' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} loading={deactivateUser.isPending || reactivateUser.isPending}>
                    Confirmer
                  </Button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>,
      document.body
      )}

    </div>
  );
}
