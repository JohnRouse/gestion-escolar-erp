"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Calendar, Wallet, Bell, Clock } from "lucide-react";

const navItems = [
  { label: "Inicio", path: "/dashboard", icon: Home },
  { label: "Notas", path: "/dashboard/calificaciones", icon: FileText },
  { label: "Asistencia", path: "/dashboard/asistencia", icon: Calendar },
  { label: "Pagos", path: "/dashboard/pagos", icon: Wallet },
  { label: "Avisos", path: "/dashboard/circulares", icon: Bell },
  { label: "Horario", path: "/dashboard/horario", icon: Clock },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex justify-around items-center px-6 h-24 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-[env(safe-area-inset-bottom)]"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-1.5 transition-all duration-300 min-w-0 flex-1"
          >
            <span
              className={`flex items-center justify-center w-16 h-10 rounded-full transition-all duration-300 ${
                isActive ? "bg-brand-yellow/20 text-slate-900" : "bg-transparent text-slate-400"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </span>
            <span
              className={`text-[11px] font-bold truncate transition-colors ${
                isActive ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
