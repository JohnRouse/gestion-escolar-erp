import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MatriculaPage from './pages/MatriculaPage';
import TesoreriaPage from './pages/TesoreriaPage';
import AsistenciaPage from './pages/AsistenciaPage';
import NotasPage from './pages/NotasPage';
import CircularesPage from './pages/CircularesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import ProtectedRoute from './components/ProtectedRoute';
import IntranetLayout from './components/IntranetLayout';
import DocentesPage from './pages/DocentesPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <IntranetLayout />
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