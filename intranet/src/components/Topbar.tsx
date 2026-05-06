import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-navy text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg">🏫</span>
        <span className="font-semibold">Colegio XYZ</span>
        <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">Intranet</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm opacity-80">{user?.nombre} ({user?.rol})</span>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}