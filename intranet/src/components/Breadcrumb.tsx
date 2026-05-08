import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumb() {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);
  
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    matricula: 'Matrícula',
    tesoreria: 'Tesorería',
    circulares: 'Circulares',
    docentes: 'Docentes',
    asistencia: 'Asistencia',
    notas: 'Notas',
    configuracion: 'Configuración',
  };

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6 animate-fade-in">
      {paths.map((path, idx) => {
        const isLast = idx === paths.length - 1;
        const label = labels[path] || path;
        const fullPath = '/' + paths.slice(0, idx + 1).join('/');
        return (
          <span key={idx} className="flex items-center gap-2">
            {idx > 0 && <span className="text-slate-600">/</span>}
            {isLast ? (
              <span className="text-yellow-500 font-medium">{label}</span>
            ) : (
              <Link to={fullPath} className="hover:text-white transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}