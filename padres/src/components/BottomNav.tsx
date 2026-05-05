"use client";

import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Inicio", icon: "⌂", path: "/dashboard" },
  { label: "Notas", icon: "✎", path: "/dashboard/calificaciones" },
  { label: "Asistencia", icon: "✓", path: "/dashboard/asistencia" },
  { label: "Pagos", icon: "$", path: "/dashboard/pagos" },
  { label: "Circulares", icon: "✉", path: "/dashboard/circulares" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center gap-1 text-[10px] ${
              isActive ? "text-indigo" : "text-gray-400"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                isActive ? "bg-purple-lt" : "bg-gray-100"
              }`}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}