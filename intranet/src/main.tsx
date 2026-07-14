import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/carbon-theme.css'
import './styles/carbon/carbon-refactor.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/carbon/99-legibilidad-y-tablas.css';
import './styles/carbon/100-comunidad-login-final.css';
import './styles/carbon/101-configuracion-ux.css';
import './styles/carbon/102-operacion-matricula-tesoreria.css';
import './styles/carbon/103-selecciones-sidebar-y-cabeceras.css';
import './styles/carbon/104-matricula-modales-selecciones.css';
import './styles/carbon/105-pensiones-carbon-ui.css';
import './styles/carbon/106-sidebar-hover-ultimos-registros.css';
import './styles/carbon/107-asistencia-mobile-carbon.css';
import './styles/carbon/108-calendario-horario-ux.css';
import './styles/carbon/109-header-selector-busqueda-global.css';
import './styles/carbon/110-sidebar-branding-institucional.css';
import './styles/carbon/111-matricula-flujo-compacto.css';
import './styles/carbon/112-renovacion-historial-tabs.css';
import './styles/carbon/113-historial-filtros-revision.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
