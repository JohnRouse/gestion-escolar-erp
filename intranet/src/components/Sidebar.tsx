import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: '⌂', path: '/dashboard', roles: ['Admin', 'Secretaria', 'Director', 'Profesor'] },
  { label: 'Matrícula', icon: '👤', path: '/matricula', roles: ['Admin', 'Secretaria'] },
  { label: 'Tesorería', icon: '💰', path: '/tesoreria', roles: ['Admin', 'Secretaria'] },
  { label: 'Circulares', icon: '✉', path: '/circulares', roles: ['Admin', 'Secretaria', 'Director'] },
  { label: 'Asistencia', icon: '✓', path: '/asistencia', roles: ['Profesor', 'Admin'] },
  { label: 'Notas', icon: '✎', path: '/notas', roles: ['Profesor', 'Admin'] },
  { label: 'Configuración', icon: '⚙', path: '/configuracion', roles: ['Admin'] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user?.rol || '')
  );

  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex-shrink-0 min-h-screen">
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Principal</p>
      </div>
      <nav className="py-2">
        {filteredItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              location.pathname === item.path
                ? 'bg-purple-lt text-indigo border-l-2 border-indigo font-medium'
                : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
            }`}
          >
            <span className="w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}