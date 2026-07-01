import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessModule, type ModuleAccessKey } from '../config/accessRules';

export default function ProtectedModuleRoute({
  module,
  children,
}: {
  module: ModuleAccessKey;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!canAccessModule(user, module)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
