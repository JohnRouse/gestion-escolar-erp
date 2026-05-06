import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function IntranetLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Topbar onMenuClick={() => setMenuOpen(true)} />
      <div className="flex flex-1">
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="flex-1 p-4 md:p-8 max-w-screen-2xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}