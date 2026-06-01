import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import Backdrop from './Backdrop';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar />
      <Backdrop />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 md:px-6 lg:px-8">
          <div
            key={location.pathname}
            className="mx-auto w-full max-w-[1600px] animate-slide-in-right"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
