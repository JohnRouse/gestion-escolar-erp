import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react';

function generarAvatar(nombre: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    nombre
  )}&backgroundColor=4c6ef5,748ffc,91a7ff,bac8ff,dbe4ff&textColor=ffffff&radius=50`;
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/70 bg-white text-gray-500 shadow-sm shadow-gray-200/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:bg-accent-50 hover:text-accent-600 focus:outline-none focus:ring-4 focus:ring-accent-500/10';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollY = useRef(0);

  const avatarSrc = user?.avatar_url || generarAvatar(user?.nombre || 'Usuario');
  const userName = user?.nombre || 'Usuario';
  const firstName = userName.split(' ')[0];
  const userRole = user?.rol || 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  const handleSearch = (value: string) => {
    const query = value.trim();

    if (!query) return;

    navigate(`/matricula?dni=${encodeURIComponent(query)}`);
    setMobileSearchOpen(false);
    searchInputRef.current?.blur();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileSearchOpen(false);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  useEffect(() => {
    const getScrollY = () => window.scrollY || document.documentElement.scrollTop || 0;

    const handleScroll = () => {
      const currentY = getScrollY();
      const scrollingDown = currentY > lastScrollY.current;
      const passedHeaderArea = currentY > 96;

      setIsScrolled(currentY > 12);

      if (!dropdownOpen && !mobileSearchOpen) {
        setHideOnScroll(scrollingDown && passedHeaderArea);
      }

      if (currentY < 24) {
        setHideOnScroll(false);
      }

      lastScrollY.current = Math.max(currentY, 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dropdownOpen, mobileSearchOpen]);


  return (
    <header
      className={`sticky top-3 z-30 px-3 transition-all duration-300 ease-out sm:px-5 ${
        hideOnScroll ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      <div
        className={`relative mx-auto flex h-16 max-w-[1600px] items-center justify-between rounded-[1.35rem] border px-3 backdrop-blur-xl transition-all duration-300 sm:px-4 ${
          isScrolled
            ? 'border-gray-200/80 bg-white/90 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.65)]'
            : 'border-gray-200/70 bg-white/85 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.55)]'
        }`}
      >
        {/* Izquierda */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menú"
            className={`${iconButtonClass} xl:hidden`}
          >
            <Menu size={19} strokeWidth={2.2} />
          </button>

          <form
            className="hidden h-11 w-[min(26rem,42vw)] items-center gap-2 rounded-2xl border border-gray-200/70 bg-gray-50/80 px-3 text-sm transition-all duration-200 focus-within:border-accent-300 focus-within:bg-white focus-within:shadow-[0_12px_35px_-25px_rgba(76,110,245,0.9)] focus-within:ring-4 focus-within:ring-accent-500/10 md:flex"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch((event.currentTarget.elements.namedItem('search') as HTMLInputElement).value);
            }}
          >
            <Search size={17} className="shrink-0 text-gray-400" strokeWidth={2.2} />
            <input
              ref={searchInputRef}
              name="search"
              type="text"
              placeholder="Buscar alumno o DNI..."
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-400 shadow-sm lg:inline-flex">
              ⌘K
            </kbd>
          </form>
        </div>

        {/* Derecha */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((value) => !value)}
            aria-label="Buscar alumno"
            className={`${iconButtonClass} md:hidden`}
          >
            {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          <button
            type="button"
            aria-label="Ver notificaciones"
            className={`${iconButtonClass} relative`}
          >
            <Bell size={18} strokeWidth={2.2} />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-white" />
          </button>

          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setDropdownOpen((value) => !value)}
              aria-expanded={dropdownOpen}
              className="group flex h-11 items-center gap-2 rounded-2xl border border-transparent bg-transparent py-1 pl-1 pr-2 transition-all duration-200 hover:border-gray-200/80 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-accent-500/10 sm:pr-3"
            >
              <img
                src={avatarSrc}
                alt={userName}
                className="h-9 w-9 rounded-xl object-cover ring-1 ring-gray-200"
              />
              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="max-w-28 truncate text-sm font-semibold text-gray-800">{firstName}</p>
                <p className="max-w-28 truncate text-[11px] font-medium text-gray-400">{userRole}</p>
              </div>
              <ChevronDown
                size={16}
                className={`hidden text-gray-400 transition-transform duration-200 sm:block ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

                <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_22px_70px_-35px_rgba(15,23,42,0.45)] animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="bg-gradient-to-br from-accent-50 via-white to-white px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarSrc}
                        alt={userName}
                        className="h-12 w-12 rounded-2xl object-cover ring-4 ring-white shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{userName}</p>
                        <p className="truncate text-xs text-gray-500">{user?.email || 'admin@smv.edu.pe'}</p>
                      </div>
                    </div>

                    <span className="mt-3 inline-flex rounded-full border border-accent-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-accent-600 shadow-sm">
                      {userRole}
                    </span>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/perfil');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                        <User size={16} />
                      </span>
                      Editar perfil
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/configuracion');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                        <Settings size={16} />
                      </span>
                      Configuración
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        alert('Soporte: contacta al administrador.');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                        <HelpCircle size={16} />
                      </span>
                      Soporte
                    </button>
                  </div>

                  <div className="border-t border-gray-100 p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <LogOut size={16} />
                      </span>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {mobileSearchOpen && (
          <form
            className="absolute inset-x-0 top-[4.75rem] z-40 mx-auto flex h-13 items-center gap-2 rounded-2xl border border-gray-200/80 bg-white px-3 py-2 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.55)] md:hidden"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch((event.currentTarget.elements.namedItem('mobileSearch') as HTMLInputElement).value);
            }}
          >
            <Search size={17} className="text-gray-400" />
            <input
              name="mobileSearch"
              autoFocus
              type="text"
              placeholder="Buscar alumno o DNI..."
              className="h-9 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Cerrar búsqueda"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
