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
    <header className="bg-slate-800 text-white border-b border-slate-700">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="btn-icon text-slate-300 hover:text-white hover:bg-slate-700 xl:hidden"
            title="Menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center text-sm font-bold">
              🏫
            </div>
            <div>
              <p className="text-sm font-semibold">Colegio XYZ</p>
              <p className="text-xs text-slate-400">Intranet</p>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{user?.nombre}</p>
            <p className="text-xs text-slate-400">{user?.rol}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn-icon text-slate-300 hover:text-white hover:bg-slate-700"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}