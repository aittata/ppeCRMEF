// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';
import { ErrorBoundary } from '@/shared/layout/ErrorBoundary';
import { ProtectedRoute, RoleRoute } from '@/shared/layout/ProtectedRoute';
import { AppLayout } from '@/shared/layout/AppLayout';
import { ToastContainer } from '@/shared/ui/ToastContainer';
import { Spinner } from '@/shared/ui/Spinner';
import { useAuthStore } from '@/shared/store/auth.store';
import { useTheme } from '@/shared/hooks/useTheme';
import { NotFound } from './pages/NotFound';

// ─── Lazy feature imports — décommenter au fur et à mesure ───────────────────
const Login = lazy(() => import('@/features/auth/pages/Login'))
const Utilisateurs = lazy(() => import('@/features/users/pages/Utilisateurs'))
const AdminClasses = lazy(() => import('@/features/classes/pages/AdminClasses'))
const AuditLogs = lazy(() => import('@/features/audit/pages/AuditLogs'))
const CadreEleves = lazy(() => import('@/features/eleves/pages/CadreEleves'))
const CadreEdt = lazy(() => import('@/features/seances/pages/CadreEdt'))
const ClasseEdt = lazy(() => import('@/features/seances/pages/ClasseEdt'))
const EnseignantEdt = lazy(() => import('@/features/seances/pages/EnseignantEdt'))
const EnseignantEdtClasses = lazy(() => import('@/features/seances/pages/EnseignantEdtClasses'))
const MesClasses = lazy(() => import('@/features/seances/pages/MesClasses'))
const MesEleves = lazy(() => import('@/features/seances/pages/MesEleves'))  
const Dashboard = lazy(() => import('@/features/absences/pages/Dashboard'))
const CadreAbsences = lazy(() => import('@/features/absences/pages/CadreAbsences'))
const MesAbsences = lazy(() => import('@/features/absences/pages/MesAbsences'))
const ParentEdt = lazy(() => import('@/features/parent/pages/ParentEdt'))
const ParentAbsences = lazy(() => import('@/features/parent/pages/ParentAbsences'))

const Placeholder = ({ name }: { name: string }) => (
  <div className="flex h-full min-h-[60vh] items-center justify-center">
    <div className="text-center">
      <p className="text-gray-500 dark:text-slate-400 text-sm">
        Feature <span className="text-gray-800 dark:text-slate-200 font-medium">"{name}"</span>
      </p>
      <p className="text-slate-600 text-xs mt-1">Générer le SP correspondant pour l'activer</p>
    </div>
  </div>
);

const SuspenseLoader = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
    <Spinner size="lg" />
  </div>
);

// Redirection intelligente selon le rôle
const RedirectHome = () => {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'CADRE_ADMINISTRATIF' || (user.role as any) === 'CADRE_ADMIN') return <Navigate to="/cadre/dashboard" replace />;
  if (user.role === 'PARENT') return <Navigate to="/parent/edt" replace />;
  return <Navigate to="/enseignant/classes" replace />;
};

export default function App() {
  useTheme(); // Initialize theme on app mount

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastContainer />
          <Suspense fallback={<SuspenseLoader />}>
            <Routes>
              {/* Racine */}
              <Route path="/" element={<RedirectHome />} />

              {/* Public — SP1 remplacera le Placeholder Login */}
              <Route path="/login" element={<Login />} />

              {/* ── Enseignant ─────────────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute roles={['ENSEIGNANT']} />}>
                  <Route element={<AppLayout />}>
                    <Route path="/enseignant/classes"  element={<MesClasses />} />
                    <Route path="/enseignant/edt-classes" element={<EnseignantEdtClasses />} />
                    <Route path="/enseignant/edt"      element={<EnseignantEdt />} />
                    <Route path="/enseignant/eleves"   element={<MesEleves />} />
                    <Route path="/enseignant/absences" element={<MesAbsences />} />
                  </Route>
                </Route>
              </Route>

              {/* ── Cadre Administratif ────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute roles={['CADRE_ADMINISTRATIF']} />}>
                  <Route element={<AppLayout />}>
                    <Route path="/cadre/dashboard" element={<Dashboard />} />
                    <Route path="/cadre/eleves"    element={<CadreEleves />} />
                    <Route path="/cadre/absences"  element={<CadreAbsences />} />
                    <Route path="/cadre/edt/enseignants" element={<CadreEdt />} />
                    <Route path="/cadre/edt/classes" element={<ClasseEdt />} />
                    <Route path="/cadre/edt"       element={<Navigate to="/cadre/edt/enseignants" replace />} />
                    <Route path="/cadre/utilisateurs" element={<Utilisateurs />} />
                    <Route path="/cadre/classes"      element={<AdminClasses />} />
                    <Route path="/cadre/audit"        element={<AuditLogs />} />
                  </Route>
                </Route>
              </Route>

              {/* ── Admin ──────────────────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute roles={['ADMIN']} />}>
                  <Route element={<AppLayout />}>
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/eleves"    element={<CadreEleves />} />
                    <Route path="/admin/absences"  element={<CadreAbsences />} />
                    <Route path="/admin/edt/enseignants" element={<CadreEdt />} />
                    <Route path="/admin/edt/classes" element={<ClasseEdt />} />
                    <Route path="/admin/edt"       element={<Navigate to="/admin/edt/enseignants" replace />} />
                    <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
                    <Route path="/admin/classes"      element={<AdminClasses />} />
                    <Route path="/admin/audit"        element={<AuditLogs />} />
                  </Route>
                </Route>
              </Route>

              {/* ── Parent ─────────────────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute roles={['PARENT']} />}>
                  <Route element={<AppLayout />}>
                    <Route path="/parent/edt" element={<ParentEdt />} />
                    <Route path="/parent/absences" element={<ParentAbsences />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
