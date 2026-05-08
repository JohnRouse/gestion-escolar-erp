import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search } from 'lucide-react';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-[#1e2436] border-b border-[#2a3249] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-[#141824] rounded-lg xl:hidden text-[#8a93b2]"
          title="Menú"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-3 bg-[#141824] border border-[#2a3249] rounded-lg px-3 py-1.5 text-[#5a6480] text-sm flex-1 max-w-[300px]">
          <Search size={15} />
          <span>Buscar</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-[#c5cbe0]">{user?.nombre}</p>
          <p className="text-xs text-[#5a6480]">{user?.rol}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="p-2 hover:bg-[#141824] rounded-lg text-[#8a93b2] hover:text-[#e05050] transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#eab308] flex items-center justify-center text-sm font-bold text-[#1a1f2e]">
          {user?.nombre?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
}