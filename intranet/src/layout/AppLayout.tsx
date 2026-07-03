import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import Backdrop from './Backdrop';

export default function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="carbon-shell flex h-screen overflow-hidden bg-[var(--cds-bg)]">
      <AppSidebar />
      <Backdrop />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />

        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 md:px-6 lg:px-8">
          <div
            key={location.pathname}
            className="erp-route-shell w-full max-w-none erp-route-fade"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
