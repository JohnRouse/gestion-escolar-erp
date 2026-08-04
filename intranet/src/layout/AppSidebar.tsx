import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useSchool } from '../contexts/SchoolContext';
import InstitutionMark from '../components/InstitutionMark';
import SidebarCollapsedFlyout from '../components/sidebar/SidebarCollapsedFlyout';
import SidebarNavigationItem from '../components/sidebar/SidebarNavigationItem';
import { canAccessTutoria } from '../config/accessRules';
import {
  sidebarMenuGroups,
  type NavItem,
} from '../config/sidebarNavigation';
import { PanelLeft, Sparkles } from 'lucide-react';

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

  const flyoutRef =
    useRef<HTMLElement | null>(null);

  const flyoutTriggerRef =
    useRef<HTMLButtonElement | null>(null);

  const categorias = useMemo(() => {
    const filterByRole = (items: NavItem[]) =>
      items
        .filter((item) => !item.roles || item.roles.includes(user?.rol || ''))
        .filter((item) => {
          if (item.path !== '/tutoria') return true;
          return canAccessTutoria(user);
        });

    return sidebarMenuGroups
      .map((group) => ({
        ...group,
        items: filterByRole(group.items),
      }))
      .filter((group) => group.items.length > 0);
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

  const handleCollapsedPanelClick = (
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (!isCollapsed) return;

    const target = event.target as HTMLElement;
    const interactive = target.closest(
      'button, a, input, label, select, textarea, [role="menuitem"]',
    );

    if (interactive) return;

    toggleCollapse();
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

  const closeCollapsedFlyout = (
    returnFocus = false,
  ) => {
    clearFlyoutCloseTimer();
    setHoveredItem(null);

    if (returnFocus) {
      window.setTimeout(() => {
        flyoutTriggerRef.current?.focus();
      }, 0);
    }
  };

  const focusFirstFlyoutItem = () => {
    window.setTimeout(() => {
      flyoutRef.current
        ?.querySelector<HTMLButtonElement>(
          '[role="menuitem"]',
        )
        ?.focus();
    }, 0);
  };

  const openCollapsedFlyout = (
    item: NavItem,
    target: HTMLButtonElement,
    focusFirst = false,
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

    flyoutTriggerRef.current = target;
    setHoveredItem(item);

    if (focusFirst) {
      focusFirstFlyoutItem();
    }
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

  const handleFlyoutKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
  ) => {
    if (
      event.key === 'Escape' ||
      event.key === 'ArrowLeft'
    ) {
      event.preventDefault();
      closeCollapsedFlyout(true);
      return;
    }

    const menuItems = Array.from(
      flyoutRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ) || [],
    );

    if (menuItems.length === 0) {
      return;
    }

    const currentIndex = menuItems.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    let nextIndex: number;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex =
        currentIndex < 0
          ? 0
          : (currentIndex + 1) % menuItems.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex =
        currentIndex <= 0
          ? menuItems.length - 1
          : currentIndex - 1;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = menuItems.length - 1;
    } else {
      return;
    }

    menuItems[nextIndex]?.focus();
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
        <div
          data-sidebar-expand-surface={isCollapsed ? 'true' : undefined}
          onClick={handleCollapsedPanelClick}
          className={cx(
            'flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/95 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-xl',
            isCollapsed &&
              'cursor-col-resize [&_button]:cursor-pointer',
          )}
        >
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
                aria-label="Contraer menú lateral"
              >
                <PanelLeft size={18} />
              </button>
            )}
          </div>

          <nav
            aria-label="Navegación principal"
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

                <div className="space-y-1">
                  {categoria.items.map((item) => (
                    <SidebarNavigationItem
                      key={item.title}
                      item={item}
                      isCollapsed={isCollapsed}
                      isExpanded={expanded === item.title}
                      isActive={
                        isRouteActive(item.path) ||
                        getChildPaths(item).some((path) =>
                          isRouteActive(path),
                        )
                      }
                      isFlyoutOpen={
                        hoveredItem?.title === item.title
                      }
                      flyoutRef={flyoutRef}
                      onNavigate={handleNavigate}
                      onToggleExpanded={() =>
                        setExpanded(
                          expanded === item.title
                            ? null
                            : item.title,
                        )
                      }
                      onOpenCollapsedFlyout={
                        openCollapsedFlyout
                      }
                      onScheduleFlyoutClose={
                        scheduleFlyoutClose
                      }
                      onCloseCollapsedFlyout={
                        closeCollapsedFlyout
                      }
                      isChildActive={isChildActive}
                    />
                  ))}
                </div>
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
        hoveredItem?.children?.length && (
          <SidebarCollapsedFlyout
            item={hoveredItem}
            position={flyoutPosition}
            optionCount={getChildPaths(hoveredItem).length}
            flyoutRef={flyoutRef}
            triggerRef={flyoutTriggerRef}
            onKeepOpen={clearFlyoutCloseTimer}
            onScheduleClose={scheduleFlyoutClose}
            onNavigate={handleNavigate}
            onKeyDown={handleFlyoutKeyDown}
            isChildActive={isChildActive}
          />
        )}
    </>
  );
}
