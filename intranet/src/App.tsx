import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MatriculaPage from './pages/MatriculaPage';
import TesoreriaPage from './pages/TesoreriaPage';
import AsistenciaPage from './pages/AsistenciaPage';
import NotasPage from './pages/NotasPage';
import CircularesPage from './pages/CircularesPage';
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage';
import DocentesPage from './pages/DocentesPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import PerfilPage from './pages/PerfilPage';
import PagosExtraordinariosPage from './pages/tesoreria/PagosExtraordinariosPage';
import ReportesPage from './pages/ReportesPage';
import { SchoolProvider } from './contexts/SchoolContext';
import MatriculasHistorialPage from './pages/matricula/MatriculasHistorialPage';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
  element={
    <ProtectedRoute>
      <SchoolProvider>
        <SidebarProvider>
          <AppLayout />
        </SidebarProvider>
      </SchoolProvider>
    </ProtectedRoute>
  }
>
        <Route path="/dashboard" element={<DashboardPage />} />
<Route path="/matricula" element={<MatriculaPage />} />
<Route path="/tesoreria" element={<TesoreriaPage />} />
<Route path="/asistencia" element={<AsistenciaPage />} />
<Route path="/notas" element={<NotasPage />} />
<Route path="/circulares" element={<CircularesPage />} />
<Route path="/configuracion" element={<ConfiguracionPage />} />
<Route path="/docentes" element={<DocentesPage />} />
<Route path="/perfil" element={<PerfilPage />} />
<Route path="/reportes" element={<ReportesPage />} />
<Route path="/tesoreria/pagos-extraordinarios" element={<PagosExtraordinariosPage />} />
<Route path="/matricula/historial" element={<MatriculasHistorialPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;