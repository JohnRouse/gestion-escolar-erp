import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Search, Bell, User, Settings, HelpCircle, Edit } from 'lucide-react';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  const handleEditProfile = () => {
  setDropdownOpen(false);
  navigate('/perfil');
};

  const handleAccountSettings = () => {
    setDropdownOpen(false);
    navigate('/configuracion');
  };

  const handleSupport = () => {
    setDropdownOpen(false);
    // Aquí podrías abrir un chat o redirigir a una página de soporte
    alert('Soporte: contacta al administrador del sistema.');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Izquierda: botón menú + buscador */}
        <div className="flex items-center gap-4">
          <button onClick={toggle} className="xl:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar alumno..."
              className="bg-transparent outline-none w-64"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = (e.target as HTMLInputElement).value;
                  if (input) navigate(`/matricula?dni=${input}`);
                }
              }}
            />
          </div>
        </div>

        {/* Derecha: notificaciones + menú usuario */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Dropdown de usuario */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <img
                src={user?.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user?.nombre || 'user')}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800">{user?.nombre}</p>
                <p className="text-xs text-gray-500">{user?.rol}</p>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                {/* Cabecera del dropdown */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{user?.nombre}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'admin@smv.edu.pe'}</p>
                </div>

                {/* Opciones */}
                <button
                  onClick={handleEditProfile}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Edit size={16} className="text-gray-400" />
                  Perfil
                </button>
                <button
                  onClick={handleAccountSettings}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Settings size={16} className="text-gray-400" />
                  Configuración
                </button>
                
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <LogOut size={16} />
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Overlay para cerrar dropdown al hacer clic fuera */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </header>
  );
}