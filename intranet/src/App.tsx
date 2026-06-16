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
import { ToastProvider } from './contexts/ToastContext';
import MatriculasHistorialPage from './pages/matricula/MatriculasHistorialPage';
import RenovacionMatriculaPage from './pages/matricula/RenovacionMatriculaPage';
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
import ModuloPendientePage, { moduloIcons } from './pages/ModuloPendientePage';


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
<Route path="/asistencia" element={<AsistenciaPage />} />
<Route
  path="/calendario"
  element={
    <ModuloPendientePage
      modulo="Calendario institucional"
      descripcion="Agenda eventos, actividades, feriados, reuniones y fechas importantes por institución o grupo educativo."
      icon={moduloIcons.calendario}
      acciones={[
        'Registrar eventos por institución',
        'Filtrar actividades por rol y sede',
        'Mostrar eventos en dashboard y portal de padres',
      ]}
    />
  }
/>
<Route
  path="/horario"
  element={
    <ModuloPendientePage
      modulo="Horario académico"
      descripcion="Organiza horarios por sección, curso, docente, aula y periodo académico."
      icon={moduloIcons.horario}
      acciones={[
        'Crear bloques horarios por sección',
        'Asignar docente, curso y aula',
        'Evitar cruces de horario',
      ]}
    />
  }
/>
<Route path="/notas" element={<NotasPage />} />
<Route
  path="/notas/comentarios"
  element={
    <ModuloPendientePage
      modulo="Comentarios de notas"
      descripcion="Registra observaciones bimestrales por alumno para acompañar las calificaciones y libretas."
      icon={moduloIcons.comentarios}
      acciones={[
        'Buscar alumno por sección',
        'Registrar comentario por bimestre',
        'Mostrar observaciones en libreta y portal de padres',
      ]}
    />
  }
/>
<Route path="/circulares" element={<CircularesPage />} />
<Route path="/configuracion" element={<ConfiguracionPage />} />
<Route path="/docentes" element={<DocentesPage />} />
<Route
  path="/staff"
  element={
    <ModuloPendientePage
      modulo="Staff institucional"
      descripcion="Administra personal administrativo, auxiliares, coordinación, soporte y otros colaboradores."
      icon={moduloIcons.staff}
      acciones={[
        'Registrar personal no docente',
        'Asignar rol institucional',
        'Definir acceso por institución o sede',
      ]}
    />
  }
/>
<Route
  path="/citas"
  element={
    <ModuloPendientePage
      modulo="Citas y entrevistas"
      descripcion="Gestiona reuniones con padres, docentes, tutores o coordinación según disponibilidad."
      icon={moduloIcons.citas}
      acciones={[
        'Programar citas por rol',
        'Confirmar asistencia',
        'Registrar acuerdos y observaciones',
      ]}
    />
  }
/>
<Route
  path="/enfermeria"
  element={
    <ModuloPendientePage
      modulo="Enfermería"
      descripcion="Registra atenciones, alertas médicas, medicación autorizada y observaciones de salud escolar."
      icon={moduloIcons.enfermeria}
      acciones={[
        'Crear ficha médica del alumno',
        'Registrar atenciones diarias',
        'Notificar incidentes al apoderado',
      ]}
    />
  }
/>
<Route
  path="/notificaciones"
  element={
    <ModuloPendientePage
      modulo="Notificaciones"
      descripcion="Centraliza avisos internos, alertas del sistema y comunicaciones enviadas a usuarios."
      icon={moduloIcons.notificaciones}
      acciones={[
        'Listar alertas por usuario',
        'Marcar notificaciones como leídas',
        'Conectar avisos de pagos, notas y matrícula',
      ]}
    />
  }
/>
<Route path="/perfil" element={<PerfilPage />} />
<Route path="/reportes" element={<ReportesPage />} />
<Route path="/tesoreria/pagos-extraordinarios" element={<PagosExtraordinariosPage />} />
<Route path="/tesoreria/validar-pagos" element={<ValidarPagosPage />} />
<Route path="/tesoreria/pagos-recibidos" element={<PagosRecibidosPage />} />
<Route path="/tesoreria/estado-cuenta" element={<EstadoCuentaInternoPage />} />
<Route path="/matricula/historial" element={<MatriculasHistorialPage />} />
<Route path="/tesoreria/cobranzas" element={<CobranzasPage />} />
<Route path="/tesoreria/agenda-cobranzas" element={<AgendaCobranzasPage />} />
<Route path="/matricula/renovacion" element={<RenovacionMatriculaPage />} />
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