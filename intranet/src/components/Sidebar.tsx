import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard', roles: ['Admin', 'Secretaria', 'Director', 'Profesor'] },
  { label: 'Matrícula', icon: '👤', path: '/matricula', roles: ['Admin', 'Secretaria'] },
  { label: 'Tesorería', icon: '💰', path: '/tesoreria', roles: ['Admin', 'Secretaria'] },
  { label: 'Circulares', icon: '✉', path: '/circulares', roles: ['Admin', 'Secretaria', 'Director'] },
  { label: 'Docentes', icon: '👩‍🏫', path: '/docentes', roles: ['Admin', 'Director'] },
  { label: 'Asistencia', icon: '✓', path: '/asistencia', roles: ['Profesor', 'Admin'] },
  { label: 'Notas', icon: '✎', path: '/notas', roles: ['Profesor', 'Admin'] },
  { label: 'Configuración', icon: '⚙', path: '/configuracion', roles: ['Admin'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user?.rol || '')
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 xl:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 w-72 h-full bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out xl:translate-x-0 xl:static xl:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-sm font-bold text-white">
              SMV
            </div>
            <span className="font-semibold text-gray-800">Santa María Victoria</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg xl:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="p-2">
          <p className="text-xs font-semibold text-gray-400 uppercase px-3 py-2">Principal</p>
          <nav className="space-y-1">
            {filteredItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}