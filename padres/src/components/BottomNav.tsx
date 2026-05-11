"use client";

import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Inicio", icon: "home", path: "/dashboard" },
  { label: "Notas", icon: "description", path: "/dashboard/calificaciones" },
  { label: "Asistencia", icon: "event_available", path: "/dashboard/asistencia" },
  { label: "Pagos", icon: "credit_card", path: "/dashboard/pagos" },
  { label: "Avisos", icon: "notifications", path: "/dashboard/circulares" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5 px-2 pt-2 pb-2 max-w-[420px] mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="press relative py-2 flex flex-col items-center gap-0.5"
            >
              <span
                className={`absolute inset-x-2 bottom-1.5 h-8 rounded-full transition-all duration-300 ${
                  isActive ? "bg-accent-soft scale-100 opacity-100" : "scale-85 opacity-0"
                }`}
              />
              <span
                className={`material-symbols-rounded text-2xl relative z-10 ${
                  isActive ? "text-accent" : "text-text-muted"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-bold relative z-10 ${
                  isActive ? "text-primary" : "text-text-muted"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}