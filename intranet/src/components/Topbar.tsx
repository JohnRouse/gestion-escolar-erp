import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg xl:hidden text-gray-600"
          title="Menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center text-sm font-bold text-gray-900">
            SMV
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Santa María Victoria</p>
            <p className="text-xs text-gray-500">Intranet</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-gray-800">{user?.nombre}</p>
          <p className="text-xs text-gray-500">{user?.rol}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}