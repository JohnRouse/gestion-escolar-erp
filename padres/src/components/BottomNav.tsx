"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, CalendarCheck, CreditCard, Megaphone } from "lucide-react";

const navItems = [
  { label: "Inicio", icon: Home, path: "/dashboard" },
  { label: "Notas", icon: BookOpen, path: "/dashboard/calificaciones" },
  { label: "Asist.", icon: CalendarCheck, path: "/dashboard/asistencia" },
  { label: "Pagos", icon: CreditCard, path: "/dashboard/pagos" },
  { label: "Circulares", icon: Megaphone, path: "/dashboard/circulares" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-surface/95 backdrop-blur-lg border-t border-border/60 px-2 py-2 flex justify-around items-end z-50"
     style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
  {navItems.map((item) => {
    const isActive = pathname === item.path;
    const Icon = item.icon;
    return (
      <button
        key={item.path}
        onClick={() => router.push(item.path)}
        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[64px] ${
          isActive ? "text-primary" : "text-text-muted"
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-all duration-200 ${
          isActive ? "bg-primary-light" : ""
        }`}>
          <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className={`text-[11px] font-semibold ${isActive ? "opacity-100" : "opacity-60"}`}>
          {item.label}
        </span>
      </button>
    );
  })}
</nav>
  );
}