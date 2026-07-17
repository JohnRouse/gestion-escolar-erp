import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useSchool } from '../contexts/SchoolContext';
import InstitutionMark from '../components/InstitutionMark';
import { canAccessTutoria } from '../config/accessRules';
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
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';

interface NavLeaf {
  title: string;
  path: string;
}

interface NavChild {
  title: string;
  path?: string;
  children?: NavLeaf[];
}

interface NavItem {
  title: string;
  icon: ElementType;
  path?: string;
  roles?: string[];
  children?: NavChild[];
}

const menuPrincipal: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['Admin', 'Secretaria', 'Director', 'Profesor'] },
];

const menuAcademico: NavItem[] = [
  {
    title: 'Matrícula',
    icon: UserPlus,
    path: '/matricula',
    roles: ['Admin', 'Secretaria', 'Director'],
    children: [
      { title: 'Registrar matrícula', path: '/matricula' },
      { title: 'Renovación individual', path: '/matricula/renovacion' },
      { title: 'Promoción masiva', path: '/matricula/promocion-masiva' },
      { title: 'Historial de matrículas', path: '/matricula/historial' },
    ],
  },
  {
    title: 'Notas',
    icon: FileText,
    path: '/notas',
    roles: ['Profesor', 'Admin', 'Director'],
    children: [
      { title: 'Registro', path: '/notas' },
    ],
  },
  { title: 'Asistencia', icon: CheckSquare, path: '/asistencia', roles: ['Profesor', 'Admin', 'Director'] },
  { title: 'Calendario', icon: CalendarDays, path: '/calendario', roles: ['Admin', 'Secretaria', 'Director'] },
  { title: 'Horario', icon: GraduationCap, path: '/horario', roles: ['Profesor'] },
];

const menuTutoria: NavItem[] = [
  {
    title: 'Tutoría',
    icon: BookOpenCheck,
    path: '/tutoria',
    roles: ['Profesor', 'Admin', 'Director'],
  },
];

const menuComunidad: NavItem[] = [
  {
    title: 'Comunidad escolar',
    icon: Users,
    path: '/comunidad/alumnos',
    roles: ['Admin', 'Secretaria', 'Director'],
    children: [
      { title: 'Alumnos', path: '/comunidad/alumnos' },
      { title: 'Apoderados', path: '/comunidad/apoderados' },
    ],
  },
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
  {
    title: 'Tesorería',
    icon: Wallet,
    path: '/tesoreria',
    roles: ['Admin', 'Secretaria', 'Director'],
    children: [
      {
        title: 'Operaciones',
        children: [
          {
            title: 'Centro de pagos',
            path: '/tesoreria/cobranzas',
          },
          {
            title: 'Agenda de cobranzas',
            path: '/tesoreria/agenda-cobranzas',
          },
          {
            title: 'Estado de cuenta',
            path: '/tesoreria/estado-cuenta',
          },
          {
            title: 'Validar pagos',
            path: '/tesoreria/validar-pagos',
          },
          {
            title: 'Pagos recibidos',
            path: '/tesoreria/pagos-recibidos',
          },
        ],
      },
      {
        title: 'Configuración',
        children: [
          {
            title: 'Configurar pensiones',
            path: '/tesoreria/configuracion',
          },
          {
            title: 'Pagos extraordinarios',
            path: '/tesoreria/pagos-extraordinarios',
          },
          {
            title: 'Datos para cobrar',
            path: '/tesoreria/datos-cobro',
          },
        ],
      },
    ],
  },
];

const menuReportes: NavItem[] = [
  {
    title: 'Reportes',
    icon: ChartColumn,
    path: '/reportes',
    roles: ['Admin', 'Director'],
    children: [
      { title: 'Panel general', path: '/reportes' },
      { title: 'Asistencia global', path: '/reportes/asistencia' },
    ],
  },
];

const menuConfiguracion: NavItem[] = [
  { title: 'Configuración', icon: Settings, path: '/configuracion', roles: ['Admin', 'Director'] },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export default function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebar();

  const {
    tenant,
    activeScope,
    activeColegio,
  } = useSchool();

  const showingSchool =
    activeScope.tipo === 'colegio';

  const brandTitle =
    showingSchool
      ? activeColegio?.nombre ||
        tenant?.nombre ||
        'Gestión Escolar'
      : tenant?.nombre ||
        'Gestión Escolar';

  const brandSubtitle =
    showingSchool
      ? tenant?.nombre ||
        'Institución educativa'
      : 'Gestión Escolar';

  const [expanded, setExpanded] =
    useState<string | null>(null);

  const [hoveredItem, setHoveredItem] =
    useState<NavItem | null>(null);

  const [flyoutPosition, setFlyoutPosition] =
    useState({
      top: 0,
      left: 0,
    });

  const flyoutCloseTimer =
    useRef<number | null>(null);

  const categorias = useMemo(() => {
    const filterByRole = (items: NavItem[]) =>
      items
        .filter((item) => !item.roles || item.roles.includes(user?.rol || ''))
        .filter((item) => {
          if (item.path !== '/tutoria') return true;
          return canAccessTutoria(user);
        });

    return [
      { titulo: 'Principal', items: filterByRole(menuPrincipal) },
      { titulo: 'Académico', items: filterByRole(menuAcademico) },
      { titulo: 'Tutoría', items: filterByRole(menuTutoria) },
      { titulo: 'Comunidad escolar', items: filterByRole(menuComunidad) },
      { titulo: 'Personal', items: filterByRole(menuPersonal) },
      { titulo: 'Bienestar', items: filterByRole(menuBienestar) },
      { titulo: 'Comunicación', items: filterByRole(menuComunicacion) },
      { titulo: 'Finanzas', items: filterByRole(menuFinanzas) },
      { titulo: 'Reportes', items: filterByRole(menuReportes) },
      { titulo: 'Configuración', items: filterByRole(menuConfiguracion) },
    ].filter((cat) => cat.items.length > 0);
  }, [user]);

  const isRouteActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isChildActive = (path: string) =>
    location.pathname === path;

  const getChildPaths = (item: NavItem) =>
    (item.children || []).flatMap((child) =>
      child.children?.map(
        (nestedChild) => nestedChild.path,
      ) ??
      (child.path ? [child.path] : []),
    );

  useEffect(() => {
    const activeParent = categorias
      .flatMap((categoria) => categoria.items)
      .find((item) => item.children?.length && isRouteActive(item.path));

    if (activeParent && !isCollapsed) {
      setExpanded(activeParent.title);
    }
  }, [categorias, location.pathname, isCollapsed]);

  const handleNavigate = (path?: string) => {
    if (!path) return;

    setHoveredItem(null);
    navigate(path);
    close();
  };

  const clearFlyoutCloseTimer = () => {
    if (flyoutCloseTimer.current === null) {
      return;
    }

    window.clearTimeout(
      flyoutCloseTimer.current,
    );

    flyoutCloseTimer.current = null;
  };

  const scheduleFlyoutClose = () => {
    clearFlyoutCloseTimer();

    flyoutCloseTimer.current =
      window.setTimeout(() => {
        setHoveredItem(null);
        flyoutCloseTimer.current = null;
      }, 180);
  };

  const openCollapsedFlyout = (
    item: NavItem,
    target: HTMLElement,
  ) => {
    if (
      !isCollapsed ||
      !item.children?.length
    ) {
      return;
    }

    clearFlyoutCloseTimer();

    const rect =
      target.getBoundingClientRect();

    const optionCount =
      getChildPaths(item).length;

    const groupCount =
      item.children.filter(
        (child) =>
          Boolean(child.children?.length),
      ).length;

    const estimatedHeight = Math.min(
      520,
      86 +
        optionCount * 43 +
        groupCount * 30,
    );

    const top = Math.max(
      12,
      Math.min(
        rect.top - 8,
        window.innerHeight -
          estimatedHeight -
          12,
      ),
    );

    setFlyoutPosition({
      top,
      left: rect.right + 12,
    });

    setHoveredItem(item);
  };

  useEffect(() => {
    setHoveredItem(null);
  }, [
    isCollapsed,
    location.pathname,
  ]);

  useEffect(() => {
    return () => {
      if (
        flyoutCloseTimer.current !== null
      ) {
        window.clearTimeout(
          flyoutCloseTimer.current,
        );
      }
    };
  }, []);

  const Tooltip = ({ title }: { title: string }) => (
    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[80] -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl shadow-slate-950/15 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
      {title}
    </span>
  );

  const renderItem = (item: NavItem) => {
    const hasChildren = Boolean(item.children?.length);
    const isActive =
      isRouteActive(item.path) ||
      getChildPaths(item).some((path) =>
        isRouteActive(path),
      );
    const Icon = item.icon;

    if (hasChildren) {
      const isExpanded = expanded === item.title;

      return (
        <div key={item.title} className="relative">
          <button
            type="button"
            onMouseEnter={(event) =>
              openCollapsedFlyout(
                item,
                event.currentTarget,
              )
            }
            onMouseLeave={() =>
              scheduleFlyoutClose()
            }
            onFocus={(event) =>
              openCollapsedFlyout(
                item,
                event.currentTarget,
              )
            }
            onClick={() => {
              if (isCollapsed) {
                setHoveredItem(null);
                toggleCollapse();
                setExpanded(item.title);
                return;
              }

              setExpanded(
                isExpanded ? null : item.title,
              );
            }}
            title={isCollapsed ? item.title : undefined}
            className={cx(
              'sidebar-nav-item group relative flex h-11 w-full items-center rounded-2xl text-sm font-semibold transition-all duration-200 ease-out',
              isCollapsed ? 'justify-center px-0' : 'justify-between px-3',
              isActive
                ? 'bg-slate-950 text-white shadow-sm shadow-slate-950/10'
                : 'text-slate-500 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950'
            )}
          >
            <span className={cx('flex min-w-0 items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
              <span
                className={cx(
                  'sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                  isActive ? 'bg-transparent text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-900'
                )}
              >
                <Icon size={18} strokeWidth={2} />
              </span>
              {!isCollapsed && <span className="truncate">{item.title}</span>}
            </span>

            {!isCollapsed && (
              <ChevronDown
                size={16}
                className={cx(
                  'shrink-0 transition-transform duration-200',
                  isExpanded && 'rotate-180',
                  isActive ? 'text-white/70' : 'text-slate-400'
                )}
              />
            )}

          </button>

          {isExpanded && !isCollapsed && (
            <div className="relative ml-5 mt-2 space-y-2 border-l border-slate-200 pl-3">
              {item.children!.map((child) => {
                const groupedChildren =
                  child.children || [];

                if (groupedChildren.length > 0) {
                  const groupActive =
                    groupedChildren.some(
                      (nestedChild) =>
                        isChildActive(
                          nestedChild.path,
                        ),
                    );

                  return (
                    <div
                      key={child.title}
                      className="space-y-1"
                    >
                      <p
                        className={cx(
                          'sidebar-group-label px-3 pt-2 text-[10px] font-black uppercase',
                          groupActive
                            ? 'text-blue-700'
                            : 'text-slate-400',
                        )}
                      >
                        {child.title}
                      </p>

                      <div className="space-y-1">
                        {groupedChildren.map(
                          (nestedChild) => {
                            const activeChild =
                              isChildActive(
                                nestedChild.path,
                              );

                            return (
                              <button
                                key={
                                  nestedChild.title
                                }
                                type="button"
                                onClick={() =>
                                  handleNavigate(
                                    nestedChild.path,
                                  )
                                }
                                className={cx(
                                  'sidebar-subitem flex min-h-9 w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-200',
                                  activeChild
                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                                )}
                              >
                                <span className="truncate">
                                  {
                                    nestedChild.title
                                  }
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  );
                }

                if (!child.path) return null;

                const activeChild =
                  isChildActive(child.path);

                return (
                  <button
                    key={child.title}
                    type="button"
                    onClick={() =>
                      handleNavigate(child.path)
                    }
                    className={cx(
                      'sidebar-subitem relative flex min-h-8 w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-200',
                      activeChild
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    {activeChild && (
                      <span className="absolute -left-[17px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600 ring-4 ring-white" />
                    )}

                    <span className="truncate">
                      {child.title}
                    </span>
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
        title={isCollapsed ? item.title : undefined}
        className={cx(
          'sidebar-nav-item group relative flex h-11 w-full items-center rounded-2xl text-sm font-semibold transition-all duration-200 ease-out',
          isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-slate-950 text-white shadow-sm shadow-slate-950/10'
            : 'text-slate-500 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950'
        )}
      >
        <span
          className={cx(
            'sidebar-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
            isActive ? 'bg-transparent text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-900'
          )}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        {!isCollapsed && <span className="truncate">{item.title}</span>}
        {isCollapsed && <Tooltip title={item.title} />}
      </button>
    );
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity xl:hidden"
        />
      )}

      <aside
        className={cx(
          'app-sidebar fixed inset-y-0 left-0 z-50 h-screen bg-transparent p-3 transition-all duration-300 ease-out xl:sticky xl:top-0 xl:z-0 xl:h-screen xl:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-[5.5rem]' : 'w-72'
        )}
      >
        <div className="flex h-[calc(100vh-24px)] flex-col rounded-[1.75rem] border border-slate-200/70 bg-white/95 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-xl overflow-hidden">
          <div className="sidebar-brand">
            <button
              type="button"
              onClick={() =>
                handleNavigate('/dashboard')
              }
              className="sidebar-brand__identity"
            >
              <InstitutionMark
                kind={
                  showingSchool
                    ? 'school'
                    : 'group'
                }
                colegio={
                  showingSchool
                    ? activeColegio
                    : undefined
                }
                logoUrl={
                  showingSchool
                    ? undefined
                    : tenant?.logo_url
                }
                label={brandTitle}
                compact
              />

              {!isCollapsed && (
                <span className="sidebar-brand__copy">
                  <strong>
                    {brandTitle}
                  </strong>

                  <small>
                    {brandSubtitle}
                  </small>
                </span>
              )}
            </button>

            {!isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                className="sidebar-brand__collapse"
                title="Contraer menú"
              >
                <PanelLeft size={18} />
              </button>
            )}
          </div>

          {isCollapsed && (

            <div className="flex justify-center border-b border-slate-100 py-2">
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                title="Expandir menú"
              >
                <PanelLeft size={18} className="rotate-180" />
              </button>
            </div>
          )}

          <nav
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-5 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categorias.map((categoria) => (
              <section key={categoria.titulo} className="space-y-1.5">
                {!isCollapsed ? (
                  <p className="sidebar-section-label px-3 text-[11px] font-black uppercase text-slate-400">
                    {categoria.titulo}
                  </p>
                ) : (
                  <div className="mx-auto my-2 h-px w-7 rounded-full bg-slate-200" />
                )}

                <div className="space-y-1">{categoria.items.map(renderItem)}</div>
              </section>
            ))}
          </nav>

          <div className="mt-auto shrink-0 border-t border-slate-100 p-3">
            {!isCollapsed ? (
              <div className="sidebar-role-card rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200/70">
                <p className="sidebar-role-label text-[11px] font-black uppercase text-slate-400">Rol activo</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200">
                    <Sparkles size={15} />
                  </span>
                  <p className="truncate text-sm font-bold text-slate-800">{user?.rol || 'Usuario'}</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                {(user?.rol || 'U').slice(0, 1)}
              </div>
            )}
          </div>
        </div>
      </aside>

      {isCollapsed &&
        hoveredItem?.children?.length &&
        typeof document !== 'undefined' &&
        createPortal(
          <aside
            className="sidebar-hover-flyout"
            style={{
              top: flyoutPosition.top,
              left: flyoutPosition.left,
            }}
            onMouseEnter={
              clearFlyoutCloseTimer
            }
            onMouseLeave={() =>
              scheduleFlyoutClose()
            }
            aria-label={`Opciones de ${hoveredItem.title}`}
          >
            <div className="sidebar-hover-flyout__header">
              <div>
                <p className="sidebar-hover-flyout__eyebrow">
                  Menú
                </p>

                <h3>
                  {hoveredItem.title}
                </h3>
              </div>

              <span>
                {
                  getChildPaths(
                    hoveredItem,
                  ).length
                }{' '}
                opciones
              </span>
            </div>

            <div className="sidebar-hover-flyout__content">
              {hoveredItem.children.map(
                (child) => {
                  const nestedChildren =
                    child.children || [];

                  if (
                    nestedChildren.length > 0
                  ) {
                    return (
                      <section
                        key={child.title}
                        className="sidebar-hover-flyout__group"
                      >
                        <p className="sidebar-hover-flyout__group-title">
                          {child.title}
                        </p>

                        <div>
                          {nestedChildren.map(
                            (
                              nestedChild,
                            ) => {
                              const active =
                                isChildActive(
                                  nestedChild.path,
                                );

                              return (
                                <button
                                  key={
                                    nestedChild.title
                                  }
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    handleNavigate(
                                      nestedChild.path,
                                    )
                                  }
                                  className={cx(
                                    'sidebar-hover-flyout__item',
                                    active &&
                                      'sidebar-hover-flyout__item--active',
                                  )}
                                >
                                  <span>
                                    {
                                      nestedChild.title
                                    }
                                  </span>

                                  <span
                                    aria-hidden="true"
                                    className="sidebar-hover-flyout__arrow"
                                  >
                                    →
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </section>
                    );
                  }

                  if (!child.path) {
                    return null;
                  }

                  const active =
                    isChildActive(
                      child.path,
                    );

                  return (
                    <button
                      key={child.title}
                      type="button"
                      role="menuitem"
                      onClick={() =>
                        handleNavigate(
                          child.path,
                        )
                      }
                      className={cx(
                        'sidebar-hover-flyout__item',
                        active &&
                          'sidebar-hover-flyout__item--active',
                      )}
                    >
                      <span>
                        {child.title}
                      </span>

                      <span
                        aria-hidden="true"
                        className="sidebar-hover-flyout__arrow"
                      >
                        →
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </aside>,
          document.body,
        )}
    </>
  );
}