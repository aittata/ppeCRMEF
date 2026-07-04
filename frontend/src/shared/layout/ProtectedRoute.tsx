// frontend/src/shared/layout/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Role } from '../types';

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

interface RoleRouteProps {
  roles: Role[];
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  
  // Patch old cached roles
  let role = user.role as string;
  if (role === 'CADRE_ADMIN') role = 'CADRE_ADMINISTRATIF';

  if (!roles.includes(role as Role)) {
    // Navigate to login or an unauthorized page to break infinite loops instead of "/"
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
