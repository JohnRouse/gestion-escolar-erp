import { useEffect, useMemo, useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import HeaderGlobalSearch from '../components/header/HeaderGlobalSearch';
import HeaderInstitutionSelector from '../components/header/HeaderInstitutionSelector';
import HeaderUserMenu from '../components/header/HeaderUserMenu';
import { notificacionesApi } from '../pages/notificaciones/notificacionesApi';

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/15';

export default function AppHeader() {
  const { toggle } = useSidebar();
  const { token } = useAuth();
  const { activeScope, tenant, queryParams } = useSchool();
  const navigate = useNavigate();
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const tenantId = activeScope.id_tenant ?? tenant?.id_tenant ?? 0;
  const notifications = useMemo(
    () =>
      notificacionesApi(token, { ...queryParams, tenant_id: tenantId }),
    [token, queryParams, tenantId],
  );

  useEffect(() => {
    if (!token || !tenantId) {
      return;
    }
    let active = true;
    let controller = new AbortController();
    const loadCount = () => {
      controller.abort();
      controller = new AbortController();
      void notifications
        .count(controller.signal)
        .then((count) => {
          if (active) setNotificationCount(count);
        })
        .catch(() => undefined);
    };
    loadCount();
    const interval = window.setInterval(loadCount, 30_000);
    window.addEventListener('notifications:changed', loadCount);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('notifications:changed', loadCount);
    };
  }, [notifications, tenantId, token]);

  return (
    <header className="erp-app-header sticky top-3 z-30 px-4 md:px-6 lg:px-8">
      <style>{`
        @keyframes headerDropdownIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes headerSearchIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header-dropdown-enter {
          animation: headerDropdownIn 0.18s ease-out forwards;
          transform-origin: top;
        }

        .header-search-enter {
          animation: headerSearchIn 0.18s ease-out forwards;
        }
      `}</style>

      <div className="relative mx-auto flex h-16 max-w-[1600px] items-center justify-between rounded-[1.75rem] border border-slate-200/70 bg-white/92 px-3 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-xl transition-all duration-300 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menú"
            className={`${iconButtonClass} xl:hidden`}
          >
            <Menu size={20} strokeWidth={2} aria-hidden="true" />
          </button>

          <HeaderInstitutionSelector
            open={schoolDropdownOpen}
            onOpenChange={setSchoolDropdownOpen}
            iconButtonClass={iconButtonClass}
          />

          <HeaderGlobalSearch
            onOpen={() => setSchoolDropdownOpen(false)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Ver notificaciones"
            className={`${iconButtonClass} relative`}
            onClick={() => {
              setSchoolDropdownOpen(false);
              navigate('/notificaciones');
            }}
          >
            <Bell size={18} strokeWidth={2} aria-hidden="true" />
            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold leading-none text-white ring-2 ring-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ) : null}
          </button>

          <HeaderUserMenu
            onOpen={() => setSchoolDropdownOpen(false)}
          />
        </div>
      </div>
    </header>
  );
}
