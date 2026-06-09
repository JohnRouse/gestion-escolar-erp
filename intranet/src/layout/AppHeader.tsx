import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  Globe2,
  HelpCircle,
  LogOut,
  Menu,
  School,
  Search,
  Settings,
  User,
  X,
  Zap,
} from 'lucide-react';

function generarAvatar(nombre: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    nombre,
  )}&backgroundColor=4c6ef5,748ffc,91a7ff,bac8ff,dbe4ff&textColor=ffffff&radius=50`;
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200/80 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-500/20';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const {
    tenant,
    colegios,
    puedeVerConsolidado,
    activeScope,
    activeColegio,
    scopeLabel,
    setColegioActivo,
    setTodosLosColegios,
  } = useSchool();

  const { toggle } = useSidebar();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hideOnScroll, setHideOnScroll] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollY = useRef(0);

  const avatarSrc = user?.avatar_url || generarAvatar(user?.nombre || 'Usuario');
  const userName = user?.nombre || 'Usuario';
  const firstName = userName.split(' ')[0];
  const userRole = user?.rol || 'Admin';

  const canShowSchoolSelector = colegios.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
    setSchoolDropdownOpen(false);
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
        setSchoolDropdownOpen(false);
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

      if (!dropdownOpen && !schoolDropdownOpen && !mobileSearchOpen) {
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
  }, [dropdownOpen, schoolDropdownOpen, mobileSearchOpen]);

  return (
    <header
      className={`sticky top-3 z-30 px-4 transition-all duration-300 ease-out md:px-6 lg:px-8 ${
        hideOnScroll
          ? '-translate-y-24 opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div
        className={`relative mx-auto flex h-16 max-w-[1600px] items-center justify-between rounded-lg border px-3 backdrop-blur-xl transition-all duration-300 sm:px-4 ${
          isScrolled
            ? 'border-gray-200/80 bg-white/95 shadow-lg shadow-gray-950/10'
            : 'border-gray-200/70 bg-white/90 shadow-md shadow-gray-950/5'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menú"
            className={`${iconButtonClass} xl:hidden`}
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {canShowSchoolSelector && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSchoolDropdownOpen((value) => !value);
                  setDropdownOpen(false);
                }}
                className="group hidden h-11 max-w-xs items-center gap-2.5 rounded-lg border border-gray-200/80 bg-gradient-to-br from-white to-gray-50 px-3 text-left shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-white sm:flex"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-100 to-accent-50 text-accent-600 ring-1 ring-accent-200">
                  {activeScope.tipo === 'todos' ? <Globe2 size={16} /> : <School size={16} />}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {tenant?.nombre || 'Organización'}
                  </span>
                  <span className="block truncate text-sm font-bold text-gray-800">
                    {scopeLabel}
                  </span>
                </span>

                <ChevronDown
                  size={16}
                  className={`ml-auto shrink-0 text-gray-400 transition-transform duration-300 ${
                    schoolDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSchoolDropdownOpen((value) => !value);
                  setDropdownOpen(false);
                }}
                aria-label="Cambiar colegio"
                className={`${iconButtonClass} sm:hidden`}
              >
                {activeScope.tipo === 'todos' ? <Globe2 size={18} /> : <School size={18} />}
              </button>

              {schoolDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSchoolDropdownOpen(false)}
                  />

                  <div className="absolute left-0 z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-xl shadow-gray-950/15 animate-in fade-in-0 slide-in-from-top-2">
                    <div className="bg-gradient-to-r from-accent-50 via-white to-white px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-accent-100 to-accent-50 text-accent-600 shadow-sm ring-1 ring-accent-200">
                          <Building2 size={20} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {tenant?.nombre || 'Organización'}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            Selecciona el contexto de trabajo
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2">
                      {puedeVerConsolidado && colegios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTodosLosColegios();
                            setSchoolDropdownOpen(false);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white font-semibold">
                              <Globe2 size={18} />
                            </span>

                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-900">
                                Todos los colegios
                              </span>
                              <span className="block truncate text-xs text-gray-500">
                                Vista consolidada del grupo
                              </span>
                            </span>
                          </span>

                          {activeScope.tipo === 'todos' && (
                            <Check size={18} className="shrink-0 text-accent-600" />
                          )}
                        </button>
                      )}

                      {puedeVerConsolidado && colegios.length > 1 && <div className="my-2 border-t border-gray-100" />}

                      {colegios.map((colegio) => {
                        const selected =
                          activeScope.tipo === 'colegio' &&
                          activeScope.id_colegio === colegio.id_colegio;

                        return (
                          <button
                            key={colegio.id_colegio}
                            type="button"
                            onClick={() => {
                              setColegioActivo(colegio.id_colegio);
                              setSchoolDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-semibold shadow-md"
                                style={{
                                  backgroundColor: colegio.color_principal || '#4f46e5',
                                }}
                              >
                                <School size={18} />
                              </span>

                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-gray-900">
                                  {colegio.nombre}
                                </span>
                                <span className="block truncate text-xs text-gray-500">
                                  {(colegio.niveles || [])
                                    .map((nivel) => nivel.nombre_nivel)
                                    .join(' · ') || 'Sin niveles configurados'}
                                </span>
                              </span>
                            </span>

                            {selected && (
                              <Check size={18} className="shrink-0 text-accent-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <form
            className="hidden h-11 w-[min(26rem,42vw)] items-center gap-2.5 rounded-lg border border-gray-200/80 bg-gray-50 px-3 text-sm transition-all duration-200 focus-within:border-accent-400 focus-within:bg-white md:flex"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch(
                (event.currentTarget.elements.namedItem('search') as HTMLInputElement)
                  .value,
              );
            }}
          >
            <Search size={18} className="shrink-0 text-gray-400" strokeWidth={2} />
            <input
              ref={searchInputRef}
              name="search"
              type="text"
              placeholder="Buscar alumno o DNI..."
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500"
            />
            <kbd className="hidden rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-500 shadow-sm lg:inline-flex">
              ⌘K
            </kbd>
          </form>
        </div>

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
            <Bell size={18} strokeWidth={2} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 shadow-md" />
          </button>

          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((value) => !value);
                setSchoolDropdownOpen(false);
              }}
              aria-expanded={dropdownOpen}
              className="group flex h-11 items-center gap-2.5 rounded-lg border border-transparent bg-transparent py-1 pl-1 pr-2 transition-all duration-200 hover:border-gray-200/80 hover:bg-gray-50"
            >
              <img
                src={avatarSrc}
                alt={userName}
                className="h-9 w-9 rounded-lg object-cover ring-2 ring-gray-200"
              />
              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="max-w-28 truncate text-sm font-semibold text-gray-800">
                  {firstName}
                </p>
                <p className="max-w-28 truncate text-xs font-medium text-gray-500">
                  {userRole}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`hidden text-gray-400 transition-transform duration-300 sm:block ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

                <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-xl shadow-gray-950/15 animate-in fade-in-0 slide-in-from-top-2">
                  <div className="bg-gradient-to-r from-accent-50 via-white to-white px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarSrc}
                        alt={userName}
                        className="h-12 w-12 rounded-lg object-cover ring-4 ring-white shadow-md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {userName}
                        </p>
                        <p className="truncate text-xs text-gray-600">
                          {user?.email || user?.correo || 'admin@smv.edu.pe'}
                        </p>
                      </div>
                    </div>

                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-accent-100 bg-white px-3 py-1.5 text-xs font-semibold text-accent-700 shadow-sm">
                      <Zap size={12} />
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                        <HelpCircle size={16} />
                      </span>
                      Soporte
                    </button>
                  </div>

                  <div className="border-t border-gray-100 p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500">
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
            className="absolute inset-x-0 top-[4.75rem] z-40 mx-auto flex h-11 items-center gap-2.5 rounded-lg border border-gray-200/80 bg-white px-3 py-2 shadow-lg shadow-gray-950/5 animate-in fade-in-0 slide-in-from-top-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch(
                (
                  event.currentTarget.elements.namedItem(
                    'mobileSearch',
                  ) as HTMLInputElement
                ).value,
              );
            }}
          >
            <Search size={18} className="text-gray-400" />
            <input
              name="mobileSearch"
              autoFocus
              type="text"
              placeholder="Buscar alumno o DNI..."
              className="h-9 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Cerrar búsqueda"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </form>
        )}
      </div>
    </header>
  );
}