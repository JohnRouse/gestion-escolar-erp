import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import {
  ChevronDown,
  PanelLeft,
  LayoutDashboard,
  UserPlus,
  Wallet,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Settings,
  UserCircle,
  CalendarDays,
  MessageSquareHeart,
  HeartPulse,
  ChartColumn,
  Bell,
  GraduationCap,
  Zap,
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: ElementType;
  path?: string;
  roles?: string[];
  children?: { title: string; path: string }[];
}

const menuPrincipal: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['Admin', 'Secretaria', 'Director', 'Profesor'] },
];

const menuAcademico: NavItem[] = [
  { title: 'Matrícula', icon: UserPlus, path: '/matricula', roles: ['Admin', 'Secretaria', 'Director'], children: [
    { title: 'Registrar matrícula', path: '/matricula' },
    { title: 'Renovación / Re-matrícula', path: '/matricula/renovacion' },
    { title: 'Historial de matrículas', path: '/matricula/historial' },
  ]},
  { title: 'Notas', icon: FileText, path: '/notas', roles: ['Profesor', 'Admin'], children: [
    { title: 'Registro', path: '/notas' },
    { title: 'Comentarios', path: '/notas/comentarios' },
  ]},
  { title: 'Asistencia', icon: CheckSquare, path: '/asistencia', roles: ['Profesor', 'Admin'] },
  { title: 'Calendario', icon: CalendarDays, path: '/calendario', roles: ['Admin', 'Secretaria'] },
  { title: 'Horario', icon: GraduationCap, path: '/horario', roles: ['Profesor'] },
];

const menuComunidad: NavItem[] = [
  { title: 'Comunidad escolar', icon: Users, path: '/comunidad/alumnos', roles: ['Admin', 'Secretaria', 'Director'], children: [
    { title: 'Alumnos', path: '/comunidad/alumnos' },
    { title: 'Apoderados', path: '/comunidad/apoderados' },
  ]},
];

const menuPersonal: NavItem[] = [
  { title: 'Docentes', icon: Users, path: '/docentes', roles: ['Admin', 'Director'] },
  { title: 'Staff', icon: UserCircle, path: '/staff', roles: ['Admin', 'Director'] },
  { title: 'Citas', icon: MessageSquareHeart, path: '/citas', roles: ['Admin', 'Secretaria'] },
];

const menuBienestar: NavItem[] = [
  { title: 'Enfermería', icon: HeartPulse, path: '/enfermeria', roles: ['Admin'] },
];

const menuComunicacion: NavItem[] = [
  { title: 'Circulares', icon: Mail, path: '/circulares', roles: ['Admin', 'Secretaria', 'Director'] },
  { title: 'Notificaciones', icon: Bell, path: '/notificaciones', roles: ['Admin'] },
];

const menuFinanzas: NavItem[] = [
  { title: 'Tesorería', icon: Wallet, path: '/tesoreria', roles: ['Admin', 'Secretaria', 'Director'], children: [
      { title: 'Centro de pagos', path: '/tesoreria/cobranzas' },
      { title: 'Agenda de cobranzas', path: '/tesoreria/agenda-cobranzas' },
  { title: 'Estado de cuenta', path: '/tesoreria/estado-cuenta' },
  { title: 'Validar pagos', path: '/tesoreria/validar-pagos' },
  { title: 'Pagos recibidos', path: '/tesoreria/pagos-recibidos' },
  { title: 'Pagos extraordinarios', path: '/tesoreria/pagos-extraordinarios' },
  { title: 'Datos para cobrar', path: '/tesoreria/datos-cobro' },
  ]},
];

const menuReportes: NavItem[] = [
  { title: 'Reportes', icon: ChartColumn, path: '/reportes', roles: ['Admin', 'Director'] },
];

const menuConfiguracion: NavItem[] = [
  { title: 'Configuración', icon: Settings, path: '/configuracion', roles: ['Admin'] },
];

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export default function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebar();
  const [expanded, setExpanded] = useState<string | null>(null);

  const categorias = useMemo(() => {
    const filterByRole = (items: NavItem[]) => items.filter((item) => !item.roles || item.roles.includes(user?.rol || ''));
    return [
      { titulo: 'Principal', items: filterByRole(menuPrincipal) },
      { titulo: 'Académico', items: filterByRole(menuAcademico) },
      { titulo: 'Comunidad escolar', items: filterByRole(menuComunidad) },
      { titulo: 'Personal', items: filterByRole(menuPersonal) },
      { titulo: 'Bienestar', items: filterByRole(menuBienestar) },
      { titulo: 'Comunicación', items: filterByRole(menuComunicacion) },
      { titulo: 'Finanzas', items: filterByRole(menuFinanzas) },
      { titulo: 'Reportes', items: filterByRole(menuReportes) },
      { titulo: 'Configuración', items: filterByRole(menuConfiguracion) },
    ].filter((cat) => cat.items.length > 0);
  }, [user?.rol]);

  const isRouteActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isChildActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const activeParent = categorias.flatMap((c) => c.items).find((i) => i.children?.length && isRouteActive(i.path));
    if (activeParent) setExpanded(activeParent.title);
  }, [categorias, location.pathname]);

  const handleNavigate = (path?: string) => {
    if (!path) return;
    navigate(path);
    close();
  };

  const Tooltip = ({ title }: { title: string }) => (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 shadow-lg">
      {title}
    </span>
  );

  const renderItem = (item: NavItem) => {
    const hasChildren = Boolean(item.children?.length);
    const isActive = isRouteActive(item.path);
    const Icon = item.icon;

    if (hasChildren) {
      const isExpanded = expanded === item.title;
      return (
        <div key={item.title} className="relative">
          <button
            type="button"
            onClick={() => setExpanded(isExpanded ? null : item.title)}
            className={cx(
              'group relative flex h-10 w-full items-center rounded-xl text-sm font-medium transition-all duration-150',
              isCollapsed ? 'justify-center px-0' : 'justify-between px-3',
              isActive
                ? 'bg-[#CCF32F] text-black shadow-sm'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
            )}
          >
            <span className={cx('flex min-w-0 items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
              <Icon size={18} strokeWidth={2} className={cx('shrink-0 transition-colors', isActive ? 'text-black' : 'text-neutral-400 group-hover:text-neutral-700')} />
              {!isCollapsed && <span className="truncate">{item.title}</span>}
            </span>
            {!isCollapsed && (
              <ChevronDown size={16} className={cx('shrink-0 transition-transform duration-200', isExpanded && 'rotate-180', isActive ? 'text-black/60' : 'text-neutral-400')} />
            )}
            {isCollapsed && <Tooltip title={item.title} />}
          </button>

          {isExpanded && !isCollapsed && (
            <div className="relative ml-3 mt-1.5 space-y-0.5 border-l border-neutral-200 pl-3">
              {item.children!.map((child) => {
                const activeChild = isChildActive(child.path);
                return (
                  <button
                    key={child.title}
                    type="button"
                    onClick={() => handleNavigate(child.path)}
                    className={cx(
                      'relative flex min-h-8 w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs transition-all duration-150',
                      activeChild
                        ? 'bg-[#CCF32F]/10 font-semibold text-black'
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                    )}
                  >
                    <span className="truncate">{child.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.title}
        type="button"
        onClick={() => handleNavigate(item.path)}
        className={cx(
          'group relative flex h-10 w-full items-center rounded-xl text-sm font-medium transition-all duration-150',
          isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-[#CCF32F] text-black shadow-sm'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        )}
      >
        <Icon size={18} strokeWidth={2} className={cx('shrink-0 transition-colors', isActive ? 'text-black' : 'text-neutral-400 group-hover:text-neutral-700')} />
        {!isCollapsed && <span className="truncate">{item.title}</span>}
        {isCollapsed && <Tooltip title={item.title} />}
      </button>
    );
  };

  return (
    <>
      {isOpen && (
        <button type="button" aria-label="Cerrar menú" onClick={close} className="fixed inset-0 z-40 bg-neutral-950/30 backdrop-blur-sm xl:hidden" />
      )}

      <aside className={cx(
        'fixed inset-y-0 left-0 z-50 h-screen bg-transparent p-3 transition-all duration-300 ease-out xl:sticky xl:top-0 xl:z-0 xl:h-screen xl:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        isCollapsed ? 'w-24' : 'w-72'
      )}>
        <div className="flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Cabecera sin ícono */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-100 px-4">
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard')}
              className={cx('group flex min-w-0 items-center rounded-xl transition-colors hover:bg-neutral-50', isCollapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-2 py-2')}
            >
              {!isCollapsed ? (
                <span className="min-w-0 text-left">
                  <span className="block truncate text-base font-semibold tracking-tight text-neutral-900">SMV</span>
                  <span className="block truncate text-[11px] font-medium text-neutral-400">Gestión escolar</span>
                </span>
              ) : (
                <span className="text-base font-bold text-neutral-900">S</span>
              )}
            </button>

            {!isCollapsed && (
              <button type="button" onClick={toggleCollapse} className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600" title="Contraer menú">
                <PanelLeft size={18} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="flex justify-center border-b border-neutral-100 py-2">
              <button type="button" onClick={toggleCollapse} className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600" title="Expandir menú">
                <PanelLeft size={18} className="rotate-180" />
              </button>
            </div>
          )}

          {/* Navegación */}
          <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-hide">
            {categorias.map((categoria) => (
              <section key={categoria.titulo} className="space-y-1.5">
                {!isCollapsed ? (
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{categoria.titulo}</p>
                ) : (
                  <div className="mx-auto my-2 h-px w-6 rounded-full bg-neutral-200" />
                )}
                <div className="space-y-0.5">{categoria.items.map(renderItem)}</div>
              </section>
            ))}
          </nav>

          {/* Pie */}
          <div className="mt-auto shrink-0 border-t border-neutral-100 p-3">
            {!isCollapsed ? (
              <div className="rounded-xl bg-neutral-50 px-3 py-3 ring-1 ring-neutral-200/60">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Rol activo</p>
                <p className="mt-1.5 truncate text-sm font-medium text-neutral-800">{user?.rol || 'Usuario'}</p>
              </div>
            ) : (
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-xs font-semibold text-neutral-600">
                {(user?.rol || 'U').slice(0, 1)}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}