import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/carbon-theme.css'
import './styles/carbon/carbon-refactor.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/carbon/99-legibilidad-y-tablas.css';
import './styles/carbon/100-comunidad-login-final.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
