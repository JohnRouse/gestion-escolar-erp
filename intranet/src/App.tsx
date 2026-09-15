import StaffPage from './pages/staff/StaffPage';
import CitasPage from './pages/citas/CitasPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MatriculaPage from './pages/MatriculaPage';
import TesoreriaPage from './pages/TesoreriaPage';
import AsistenciaPage from './pages/AsistenciaPage';
import AsistenciaMobilePage from './pages/AsistenciaMobilePage';
import CalendarioPage from './pages/CalendarioPage';
import NotasPage from './pages/NotasPage';
import TutoriaPage from './pages/TutoriaPage';
import CircularesPage from './pages/CircularesPage';
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage';
import DocentesPage from './pages/DocentesPage';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedModuleRoute from './components/ProtectedModuleRoute';
import AppLayout from './layout/AppLayout';
import PerfilPage from './pages/PerfilPage';
import PagosExtraordinariosPage from './pages/tesoreria/PagosExtraordinariosPage';
import ReportesPage from './pages/ReportesPage';
import AsistenciaReportesPage from './pages/reportes/AsistenciaReportesPage';
import { SchoolProvider } from './contexts/SchoolContext';
import { ToastProvider } from './contexts/ToastContext';
import MatriculasHistorialPage from './pages/matricula/MatriculasHistorialPage';
import RenovacionMatriculaPage from './pages/matricula/RenovacionMatriculaPage';
import PromocionMasivaPage from './pages/matricula/PromocionMasivaPage';
import AlumnosPage from './pages/comunidad/AlumnosPage';
import ApoderadosPage from './pages/comunidad/ApoderadosPage';
import TesoreriaConfiguracionPage from './pages/tesoreria/TesoreriaConfiguracionPage';
import ValidarPagosPage from './pages/tesoreria/ValidarPagosPage';
import CobranzasPage from './pages/tesoreria/CobranzasPage';
import AgendaCobranzasPage from './pages/tesoreria/AgendaCobranzasPage';
import PagosRecibidosPage from './pages/tesoreria/PagosRecibidosPage';
import EstadoCuentaInternoPage from './pages/tesoreria/EstadoCuentaInternoPage';
import PagoPublicoPage from './pages/publico/PagoPublicoPage';
import DatosCobroPage from './pages/tesoreria/DatosCobroPage';
import ConsultaPagosPublicaPage from './pages/publico/ConsultaPagosPublicaPage';
import NotificacionesPage from './pages/notificaciones/NotificacionesPage';
import EnfermeriaPage from './pages/enfermeria/EnfermeriaPage';

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
      <Route path="/pago/:referencia" element={<PagoPublicoPage />} />
      <Route path="/consulta-pagos" element={<ConsultaPagosPublicaPage />} />
      <Route
        path="/asistencia/mobile"
        element={
          <ProtectedRoute>
            <SchoolProvider>
              <ProtectedModuleRoute module="asistencia">
                <AsistenciaMobilePage />
              </ProtectedModuleRoute>
            </SchoolProvider>
          </ProtectedRoute>
        }
      />
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
        <Route path="/tesoreria/configuracion" element={<TesoreriaConfiguracionPage />} />
        <Route path="/tesoreria/datos-cobro" element={<DatosCobroPage />} />
        <Route path="/asistencia" element={<ProtectedModuleRoute module="asistencia"><AsistenciaPage /></ProtectedModuleRoute>} />
        <Route path="/calendario" element={<ProtectedModuleRoute module="calendario"><CalendarioPage /></ProtectedModuleRoute>} />
        <Route path="/horario" element={<ProtectedModuleRoute module="horario"><Navigate to="/calendario" replace /></ProtectedModuleRoute>} />
        <Route path="/notas" element={<ProtectedModuleRoute module="notas"><NotasPage /></ProtectedModuleRoute>} />
        <Route path="/notas/comentarios" element={<ProtectedModuleRoute module="tutoria"><Navigate to="/tutoria" replace /></ProtectedModuleRoute>} />
        <Route path="/tutoria" element={<ProtectedModuleRoute module="tutoria"><TutoriaPage /></ProtectedModuleRoute>} />
        <Route path="/circulares" element={<CircularesPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/docentes" element={<DocentesPage />} />
        <Route path="/staff" element={<ProtectedModuleRoute module="staff"><StaffPage /></ProtectedModuleRoute>} />
        <Route path="/citas" element={<ProtectedModuleRoute module="citas"><CitasPage /></ProtectedModuleRoute>} />
        <Route
          path="/enfermeria"
          element={
            <ProtectedModuleRoute module="enfermeria">
              <EnfermeriaPage />
            </ProtectedModuleRoute>
          }
        />
        <Route
          path="/notificaciones"
          element={
            <ProtectedModuleRoute module="notificaciones">
              <NotificacionesPage />
            </ProtectedModuleRoute>
          }
        />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/reportes" element={<ProtectedModuleRoute module="reportes"><ReportesPage /></ProtectedModuleRoute>} />
        <Route path="/reportes/asistencia" element={<ProtectedModuleRoute module="reportes"><AsistenciaReportesPage /></ProtectedModuleRoute>} />
        <Route path="/tesoreria/pagos-extraordinarios" element={<PagosExtraordinariosPage />} />
        <Route path="/tesoreria/validar-pagos" element={<ValidarPagosPage />} />
        <Route path="/tesoreria/pagos-recibidos" element={<PagosRecibidosPage />} />
        <Route path="/tesoreria/estado-cuenta" element={<EstadoCuentaInternoPage />} />
        <Route path="/matricula/historial" element={<MatriculasHistorialPage />} />
        <Route path="/tesoreria/cobranzas" element={<CobranzasPage />} />
        <Route path="/tesoreria/agenda-cobranzas" element={<AgendaCobranzasPage />} />
        <Route path="/matricula/renovacion" element={<RenovacionMatriculaPage />} />
        <Route path="/matricula/promocion-masiva" element={<PromocionMasivaPage />} />
        <Route path="/comunidad/alumnos" element={<AlumnosPage />} />
        <Route path="/comunidad/apoderados" element={<ApoderadosPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
