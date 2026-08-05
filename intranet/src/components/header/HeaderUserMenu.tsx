import {
  ChevronDown,
  HelpCircle,
  LogOut,
  Settings,
  User,
  Zap,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { assetUrl } from '../../utils/assets';

type HeaderUserMenuProps = {
  onOpen?: () => void;
};

type HeaderUser = {
  nombre?: string | null;
  rol?: string | null;
  email?: string | null;
  correo?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
  foto_perfil_url?: string | null;
};

function obtenerPartesNombre(nombre?: string | null): string[] {
  return (nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function obtenerApellidoPaterno(nombre?: string | null): string {
  const partes = obtenerPartesNombre(nombre);

  if (partes.length >= 4) return partes[partes.length - 2];
  if (partes.length >= 2) return partes[1];

  return partes[0] || 'Usuario';
}

function obtenerInicialesUsuario(nombre?: string | null): string {
  const partes = obtenerPartesNombre(nombre);
  const primeraInicial = partes[0]?.slice(0, 1) || 'U';
  const apellidoPaterno = obtenerApellidoPaterno(nombre);
  const apellidoInicial = apellidoPaterno?.slice(0, 1) || '';

  return `${primeraInicial}${apellidoInicial}`.toUpperCase();
}

function obtenerNombreCortoUsuario(nombre?: string | null): string {
  const partes = obtenerPartesNombre(nombre);
  const primerNombre = partes[0] || 'Usuario';
  const apellidoPaterno = obtenerApellidoPaterno(nombre);

  if (!apellidoPaterno || apellidoPaterno === primerNombre) return primerNombre;

  return `${primerNombre} ${apellidoPaterno}`;
}

const menuItemClass =
  'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function HeaderUserMenu({ onOpen }: HeaderUserMenuProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  const headerUser = user as HeaderUser | null;
  const userName = headerUser?.nombre || 'Usuario';
  const userShortName = obtenerNombreCortoUsuario(userName);
  const userInitials = obtenerInicialesUsuario(userName);
  const userRole = headerUser?.rol || 'Admin';
  const userEmail =
    headerUser?.email || headerUser?.correo || 'admin@smv.edu.pe';
  const avatarUrl =
    headerUser?.avatar_url ||
    headerUser?.foto_url ||
    headerUser?.foto_perfil_url ||
    null;
  const avatarSrc = assetUrl(avatarUrl);

  const closeMenu = (returnFocus = false) => {
    setOpen(false);

    if (returnFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const openMenu = () => {
    onOpen?.();
    setOpen(true);
  };

  const toggleMenu = () => {
    if (open) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== 'ArrowDown') return;

    event.preventDefault();
    openMenu();
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!open) return;

    window.requestAnimationFrame(() => firstItemRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="relative ml-1">
      <button
        ref={triggerRef}
        id="header-user-menu-trigger"
        type="button"
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        aria-label={`Abrir menú de ${userShortName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'header-user-menu' : undefined}
        className="group flex h-11 items-center gap-2.5 rounded-2xl border border-transparent bg-transparent py-1 pl-1 pr-2 transition duration-200 hover:-translate-y-0.5 hover:border-slate-200/70 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=""
            className="h-9 w-9 rounded-xl bg-white object-cover ring-1 ring-slate-200/70"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-950 ring-1 ring-slate-200/70">
            {userInitials}
          </span>
        )}

        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-28 truncate text-sm font-semibold text-slate-900">
            {userShortName}
          </span>
          <span className="block max-w-28 truncate text-xs font-medium text-slate-500">
            {userRole}
          </span>
        </span>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`hidden text-slate-400 transition-transform duration-200 sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => closeMenu()}
          />

          <div
            id="header-user-menu"
            role="menu"
            aria-labelledby="header-user-menu-trigger"
            className="header-dropdown-enter absolute right-0 z-[1000] mt-3 w-80 overflow-hidden rounded border border-slate-300 bg-white shadow-xl"
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
              <div className="flex items-center gap-3">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className="h-12 w-12 rounded-xl bg-white object-cover ring-1 ring-slate-200/70"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950 ring-1 ring-slate-200/70">
                    {userInitials}
                  </span>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {userName}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-600">
                    {userEmail}
                  </p>
                </div>
              </div>

              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                <Zap size={12} aria-hidden="true" /> {userRole}
              </span>
            </div>

            <div className="p-2">
              <button
                ref={firstItemRef}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  navigate('/perfil');
                }}
                className={menuItemClass}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <User size={16} aria-hidden="true" />
                </span>
                Editar perfil
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  navigate('/configuracion');
                }}
                className={menuItemClass}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Settings size={16} aria-hidden="true" />
                </span>
                Configuración
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  showToast({
                    type: 'info',
                    title: 'Soporte',
                    message: 'Contacta al administrador de tu institución.',
                  });
                }}
                className={menuItemClass}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <HelpCircle size={16} aria-hidden="true" />
                </span>
                Soporte
              </button>
            </div>

            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <LogOut size={16} aria-hidden="true" />
                </span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
