import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import Backdrop from './Backdrop';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AppSidebar />
      <Backdrop />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div key={location.pathname} className="animate-slide-in-right">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}