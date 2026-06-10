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
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=CCF32F,91e600,65a30d&textColor=000000&radius=50`;
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200/60 bg-white text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-neutral-50 hover:text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#CCF32F]/20';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const {
    tenant, colegios, puedeVerConsolidado, activeScope, activeColegio, scopeLabel, setColegioActivo, setTodosLosColegios,
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

  const handleLogout = () => { logout(); navigate('/login'); setDropdownOpen(false); setSchoolDropdownOpen(false); };

  const handleSearch = (value: string) => {
    const query = value.trim();
    if (!query) return;
    navigate(`/matricula?dni=${encodeURIComponent(query)}`);
    setMobileSearchOpen(false);
    searchInputRef.current?.blur();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDropdownOpen(false); setSchoolDropdownOpen(false); setMobileSearchOpen(false); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInputRef.current?.focus(); }
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
      if (!dropdownOpen && !schoolDropdownOpen && !mobileSearchOpen) { setHideOnScroll(scrollingDown && passedHeaderArea); }
      if (currentY < 24) { setHideOnScroll(false); }
      lastScrollY.current = Math.max(currentY, 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dropdownOpen, schoolDropdownOpen, mobileSearchOpen]);

  return (
    <header className={`sticky top-3 z-30 px-4 transition-all duration-300 ease-out md:px-6 lg:px-8 ${hideOnScroll ? '-translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
      <div className={`relative mx-auto flex h-16 max-w-[1600px] items-center justify-between rounded-2xl border px-3 backdrop-blur-xl transition-all duration-300 sm:px-4 ${
        isScrolled ? 'border-neutral-200/60 bg-white/95 shadow-[0_4px_12px_rgba(0,0,0,0.06)]' : 'border-neutral-200/60 bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }`}>
        
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={toggle} aria-label="Abrir menú" className={`${iconButtonClass} xl:hidden`}>
            <Menu size={20} strokeWidth={2} />
          </button>

          {canShowSchoolSelector && (
            <div className="relative">
              <button type="button" onClick={() => { setSchoolDropdownOpen((v) => !v); setDropdownOpen(false); }} className="group hidden h-11 max-w-xs items-center gap-2.5 rounded-2xl border border-neutral-200/60 bg-neutral-50 px-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:border-neutral-300 hover:bg-white sm:flex">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#CCF32F]/10 text-[#CCF32F]">
                  {activeScope.tipo === 'todos' ? <Globe2 size={16} /> : <School size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{tenant?.nombre || 'Organización'}</span>
                  <span className="block truncate text-sm font-medium text-neutral-800">{scopeLabel}</span>
                </span>
                <ChevronDown size={16} className={`ml-auto shrink-0 text-neutral-400 transition-transform duration-200 ${schoolDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <button type="button" onClick={() => { setSchoolDropdownOpen((v) => !v); setDropdownOpen(false); }} aria-label="Cambiar colegio" className={`${iconButtonClass} sm:hidden`}>
                {activeScope.tipo === 'todos' ? <Globe2 size={18} /> : <School size={18} />}
              </button>

              {schoolDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSchoolDropdownOpen(false)} />
                  <div className="absolute left-0 z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-xl">
                    <div className="bg-neutral-50 px-4 py-4 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#CCF32F]/10 text-[#CCF32F] shadow-sm">
                          <Building2 size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900">{tenant?.nombre || 'Organización'}</p>
                          <p className="truncate text-xs text-neutral-500">Selecciona el contexto de trabajo</p>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {puedeVerConsolidado && colegios.length > 1 && (
                        <button type="button" onClick={() => { setTodosLosColegios(); setSchoolDropdownOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-neutral-50">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white font-semibold"><Globe2 size={18} /></span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-neutral-900">Todos los colegios</span>
                              <span className="block truncate text-xs text-neutral-500">Vista consolidada del grupo</span>
                            </span>
                          </span>
                          {activeScope.tipo === 'todos' && <Check size={18} className="shrink-0 text-[#CCF32F]" />}
                        </button>
                      )}
                      {puedeVerConsolidado && colegios.length > 1 && <div className="my-2 border-t border-neutral-100" />}
                      {colegios.map((colegio) => {
                        const selected = activeScope.tipo === 'colegio' && activeScope.id_colegio === colegio.id_colegio;
                        return (
                          <button key={colegio.id_colegio} type="button" onClick={() => { setColegioActivo(colegio.id_colegio); setSchoolDropdownOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-neutral-50">
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-semibold shadow-sm" style={{ backgroundColor: colegio.color_principal || '#4f46e5' }}><School size={18} /></span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-neutral-900">{colegio.nombre}</span>
                                <span className="block truncate text-xs text-neutral-500">{(colegio.niveles || []).map((n) => n.nombre_nivel).join(' · ') || 'Sin niveles configurados'}</span>
                              </span>
                            </span>
                            {selected && <Check size={18} className="shrink-0 text-[#CCF32F]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Input sin ícono de búsqueda */}
          <form className="hidden h-11 w-[min(26rem,42vw)] items-center rounded-2xl border border-neutral-200/60 bg-neutral-50 px-4 text-sm transition-all duration-150 focus-within:border-[#CCF32F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#CCF32F]/20 md:flex" onSubmit={(e) => { e.preventDefault(); handleSearch((e.currentTarget.elements.namedItem('search') as HTMLInputElement).value); }}>
            <input ref={searchInputRef} name="search" type="text" placeholder="Buscar alumno o DNI..." className="h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400" />
            <kbd className="hidden rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-400 shadow-sm lg:inline-flex">⌘K</kbd>
          </form>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMobileSearchOpen((v) => !v)} aria-label="Buscar alumno" className={`${iconButtonClass} md:hidden`}>
            {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
          <button type="button" aria-label="Ver notificaciones" className={`${iconButtonClass} relative`}>
            <Bell size={18} strokeWidth={2} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#CCF32F] ring-2 ring-white" />
          </button>

          <div className="relative ml-1">
            <button type="button" onClick={() => { setDropdownOpen((v) => !v); setSchoolDropdownOpen(false); }} aria-expanded={dropdownOpen} className="group flex h-11 items-center gap-2.5 rounded-2xl border border-transparent bg-transparent py-1 pl-1 pr-2 transition-all duration-150 hover:border-neutral-200/60 hover:bg-neutral-50">
              <img src={avatarSrc} alt={userName} className="h-9 w-9 rounded-xl object-cover ring-1 ring-neutral-200/60" />
              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="max-w-28 truncate text-sm font-medium text-neutral-800">{firstName}</p>
                <p className="max-w-28 truncate text-xs text-neutral-500">{userRole}</p>
              </div>
              <ChevronDown size={16} className={`hidden text-neutral-400 transition-transform duration-200 sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-xl">
                  <div className="bg-neutral-50 px-4 py-4 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <img src={avatarSrc} alt={userName} className="h-12 w-12 rounded-xl object-cover ring-1 ring-neutral-200/60" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{userName}</p>
                        <p className="truncate text-xs text-neutral-500">{user?.email || user?.correo || 'admin@smv.edu.pe'}</p>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#CCF32F]/10 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 ring-1 ring-[#CCF32F]/20">
                      <Zap size={12} /> {userRole}
                    </span>
                  </div>
                  <div className="p-2">
                    <button type="button" onClick={() => { setDropdownOpen(false); navigate('/perfil'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><User size={16} /></span> Editar perfil
                    </button>
                    <button type="button" onClick={() => { setDropdownOpen(false); navigate('/configuracion'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Settings size={16} /></span> Configuración
                    </button>
                    <button type="button" onClick={() => { setDropdownOpen(false); alert('Soporte: contacta al administrador.'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><HelpCircle size={16} /></span> Soporte
                    </button>
                  </div>
                  <div className="border-t border-neutral-100 p-2">
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"><LogOut size={16} /></span> Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {mobileSearchOpen && (
          <form className="absolute inset-x-0 top-[4.75rem] z-40 mx-auto flex h-11 items-center gap-2.5 rounded-2xl border border-neutral-200/60 bg-white px-4 py-2 shadow-xl" onSubmit={(e) => { e.preventDefault(); handleSearch((e.currentTarget.elements.namedItem('mobileSearch') as HTMLInputElement).value); }}>
            <input name="mobileSearch" autoFocus type="text" placeholder="Buscar alumno o DNI..." className="h-9 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400" />
            <button type="button" onClick={() => setMobileSearchOpen(false)} aria-label="Cerrar búsqueda" className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600">
              <X size={16} />
            </button>
          </form>
        )}
      </div>
    </header>
  );
}