// frontend/src/features/absences/pages/Dashboard.tsx
import React, { useMemo } from 'react';
import { useDashboardStats } from '../hooks/useAbsences';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BellIcon, ActivityIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, UsersIcon, GraduationCapIcon, InfoIcon, CalendarIcon } from 'lucide-react';
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Dashboard: React.FC = () => {
  const { data: statsRaw, isLoading, isError } = useDashboardStats();
  const stats = statsRaw;
  
  const formattedStats = useMemo(() => {
     if (!stats) return null;
     return stats as Exclude<typeof stats, { success: true }>;
  }, [stats]);

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>;
  if (isError || !formattedStats) return <EmptyState title="Erreur de chargement des statistiques" icon={<ActivityIcon />} />;

  const {
    absencesAujourdHui,
    enAttente,
    elevesEnAlerte,
    totalElevesActifs,
    elevesParNiveau,
    totalElevesInactifs
  } = formattedStats as any;

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Tableau de bord</h1>
      </div>

      {/* Section 1 : Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${absencesAujourdHui > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
              <CalendarIcon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Absences d'aujourd'hui</p>
              <p className={`text-2xl font-bold ${absencesAujourdHui > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-slate-100'}`}>{absencesAujourdHui ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${enAttente > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}><BellIcon size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">En attente</p>
              <p className={`text-2xl font-bold ${enAttente > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-slate-100'}`}>{enAttente}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <UsersIcon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Élèves actifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalElevesActifs ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <GraduationCapIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Élèves par niveau</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {elevesParNiveau && elevesParNiveau.length > 0 ? (
                  elevesParNiveau.map((item: any) => (
                    <div key={item.niveau} className="flex items-center gap-1 bg-gray-50 dark:bg-slate-700/50 px-2 py-1 rounded shrink-0">
                      <span className="text-xs font-semibold text-gray-500 dark:text-slate-300">{item.niveau}:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">Aucun élève</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 2 : Alertes (Classes et Elèves) */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 mt-8 mb-4">
        <AlertTriangleIcon size={20} className="text-red-500" />
        Alertes
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
             <h3 className="font-semibold text-gray-800 dark:text-slate-200">Classes en alerte ({">"} 5 élèves en alerte)</h3>
          </div>
          <div className="w-full overflow-x-auto"><table className="w-full text-sm text-left"><thead className="sticky top-0 z-10 shadow-sm bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Classe</th>
                  <th className="px-6 py-4 text-center">Élèves en alerte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {(formattedStats as any).classesEnAlerte && (formattedStats as any).classesEnAlerte.length > 0 ? (
                  (formattedStats as any).classesEnAlerte.map((classe: any) => (
                    <tr key={classe.classeId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-200">
                        {classe.libelle}
                      </td>
                      <td className="px-6 py-4 text-center text-red-600 dark:text-red-400 font-bold">
                        {classe.elevesEnAlerteCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                      Aucune classe en alerte cette semaine.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
             <h3 className="font-semibold text-gray-800 dark:text-slate-200">Élèves en alerte ({">"} 2 absences non justifiées cette semaine)</h3>
          </div>
          <div className="w-full overflow-x-auto"><table className="w-full text-sm text-left"><thead className="sticky top-0 z-10 shadow-sm bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Élève</th>
                  <th className="px-6 py-4 text-center">Absences NJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {elevesEnAlerte && elevesEnAlerte.length > 0 ? (
                  elevesEnAlerte.map((eleve: any) => (
                    <tr key={eleve.eleveId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-200">
                        <span className="block">{eleve.nom} {eleve.prenom}</span>
                        {eleve.codeMassar && (
                          <span className="block text-xs font-normal text-gray-500 dark:text-slate-400">{eleve.codeMassar}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-red-600 dark:text-red-400 font-bold">
                        {eleve.count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                      Aucun élève en alerte.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Informations supplémentaires */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 mt-8 mb-4">
        <InfoIcon size={20} className="text-blue-500" />
        Informations supplémentaires
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
              <UsersIcon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Élèves inactifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalElevesInactifs ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;
